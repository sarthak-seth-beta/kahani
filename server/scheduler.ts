import cron from "node-cron";
import { storage } from "./storage";
import {
  sendTextMessageWithRetry,
  sendTemplateMessageWithRetry,
  sendStorytellerCheckin,
  sendBuyerCheckin,
  sendBuyerFeedbackRequest,
  sendStorytellerFeedbackRequest,
} from "./whatsapp";
import {
  processRetryReminders,
  askReadiness,
  sendQuestion,
} from "./conversationHandler";

let isProcessing = false;

export async function sendScheduledQuestions(): Promise<void> {
  const trials = await storage.getScheduledQuestionsDue();

  console.log(`Found ${trials.length} trials with questions due`);

  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;

  for (const trial of trials) {
    if (!trial.storytellerPhone) {
      console.log("Skipping trial without storyteller phone:", trial.id);
      continue;
    }

    // Use albumId if available, fallback to selectedAlbum for backward compatibility
    const albumIdentifier = trial.albumId;
    if (!albumIdentifier) {
      console.error("No album identifier found for trial:", trial.id);
      continue;
    }
    const question = await storage.getQuestionByIndex(
      albumIdentifier,
      trial.currentQuestionIndex,
      trial.storytellerLanguagePreference,
    );

    if (!question) {
      console.error(
        "No question found for trial:",
        trial.id,
        "index:",
        trial.currentQuestionIndex,
      );
      continue;
    }

    try {
      if (isProduction) {
        // In production: ask readiness before sending question
        await storage.updateFreeTrialDb(trial.id, {
          conversationState: "awaiting_readiness",
          nextQuestionScheduledFor: null,
        });

        await askReadiness(trial, trial.storytellerPhone);

        console.log("Sent readiness check before question to trial:", trial.id);
      } else {
        // In non-production: send question directly
        const questionMessage = `Here is your next question:

${question}

Take your time and reply with a voice note whenever you are ready.`;

        await sendTextMessageWithRetry(trial.storytellerPhone, questionMessage);

        await storage.updateFreeTrialDb(trial.id, {
          lastQuestionSentAt: new Date(),
          nextQuestionScheduledFor: null,
          reminderSentAt: null,
        });

        console.log("Sent scheduled question to trial:", trial.id);
      }
    } catch (error) {
      console.error(
        "Error sending scheduled question/readiness to trial:",
        trial.id,
        error,
      );

      const retryTime = new Date(Date.now() + 60 * 60 * 1000);

      await storage.updateFreeTrialDb(trial.id, {
        nextQuestionScheduledFor: retryTime,
      });

      console.log("Rescheduled failed question send to:", retryTime);
    }
  }
}

export async function sendPendingReminders(): Promise<void> {
  const trials = await storage.getPendingReminders();

  console.log(`Found ${trials.length} trials needing reminders`);

  for (const trial of trials) {
    if (!trial.storytellerPhone) {
      console.log("Skipping trial without storyteller phone:", trial.id);
      continue;
    }

    const voiceNotes = await storage.getVoiceNotesByTrialId(trial.id);
    const hasAnsweredCurrentQuestion = voiceNotes.some(
      (note) => note.questionIndex === trial.currentQuestionIndex,
    );

    if (hasAnsweredCurrentQuestion) {
      console.log(
        "Trial already answered current question, skipping reminder:",
        trial.id,
      );
      continue;
    }

    // Check if it's a conversational album
    // Use albumId if available, fallback to selectedAlbum for backward compatibility
    const albumIdentifier = trial.albumId;
    if (!albumIdentifier) {
      console.error("No album identifier found for trial:", trial.id);
      continue;
    }
    let album = await storage.getAlbumById(albumIdentifier);
    if (!album) {
      album = await storage.getAlbumByTitle(albumIdentifier);
    }
    const isConversationalAlbum = album?.isConversationalAlbum === true;

    // For both album types, limit reminders to 2 max (3 total attempts: original + 2 reminders)
    const currentCount = trial.questionReminderCount || 0;
    if (currentCount >= 2) {
      console.log(
        "Trial has reached max reminders, skipping:",
        trial.id,
        "isConversationalAlbum:",
        isConversationalAlbum,
      );
      continue;
    }

    try {
      // Resend the full question as a reminder
      await sendQuestion(trial, trial.storytellerPhone, undefined, true);

      const reminderSentAt = new Date();
      const nextReminderCount = currentCount + 1;

      const updateData: any = {
        questionReminderCount: nextReminderCount,
        reminderSentAt,
      };

      // If this is the last reminder (2 reminders for both album types = 3 total attempts),
      // schedule check-in 48 hours after this reminder
      const isLastReminder = nextReminderCount >= 2; // 2 reminders max (3 total attempts: original + 2 reminders)

      if (isLastReminder) {
        const checkinScheduledFor = new Date(
          reminderSentAt.getTime() + 48 * 60 * 60 * 1000,
        ); // 48 hours after reminder
        updateData.storytellerCheckinScheduledFor = checkinScheduledFor;
        console.log(
          "Scheduled storyteller check-in after question reminders:",
          {
            trialId: trial.id,
            checkinScheduledFor,
            reminderSentAt,
            reminderCount: nextReminderCount,
            isConversationalAlbum,
          },
        );
      }

      await storage.updateFreeTrialDb(trial.id, updateData);

      console.log("Resent question as reminder to trial:", {
        trialId: trial.id,
        reminderCount: nextReminderCount,
        isConversationalAlbum,
        isLastReminder,
      });
    } catch (error) {
      console.error(
        "Error sending question reminder to trial:",
        trial.id,
        error,
      );
    }
  }
}

export async function sendBuyerRemindersForNoStorytellerContact(): Promise<void> {
  const trials = await storage.getTrialsNeedingBuyerReminder();

  for (const trial of trials) {
    if (!trial.customerPhone) {
      console.log("Skipping trial without customer phone:", trial.id);
      continue;
    }
    const currentTrial = await storage.getFreeTrialDb(trial.id);
    if (!currentTrial) {
      console.log("Trial no longer exists, skipping:", trial.id);
      continue;
    }

    if (
      currentTrial.storytellerPhone &&
      currentTrial.conversationState !== "awaiting_initial_contact"
    ) {
      continue;
    }

    if (currentTrial.buyerNoContactReminderSentAt) {
      continue;
    }

    try {
      const templateParams = [
        { type: "text", text: trial.buyerName },
        { type: "text", text: trial.storytellerName },
      ];

      const reminderSent = await sendTemplateMessageWithRetry(
        trial.customerPhone,
        "storyteller_no_contact_buyer_reminder_en",
        templateParams,
        { orderId: trial.id },
      );

      if (reminderSent) {
        await storage.updateFreeTrialDb(trial.id, {
          buyerNoContactReminderSentAt: new Date(),
        });
      } else {
        console.log(
          "Failed to send buyer reminder template for trial:",
          trial.id,
        );
      }
    } catch (error) {
      console.error(
        "Error sending buyer reminder for no storyteller contact:",
        trial.id,
        error,
      );
    }
  }
}

export async function sendBuyerCheckins(): Promise<void> {
  const trials = await storage.getTrialsNeedingBuyerCheckin();

  console.log(`Found ${trials.length} trials needing buyer check-in`);

  for (const trial of trials) {
    if (!trial.customerPhone) {
      console.log("Skipping trial without customer phone:", trial.id);
      continue;
    }

    // Double-check that buyer check-in hasn't been sent (race condition protection)
    const currentTrial = await storage.getFreeTrialDb(trial.id);
    if (!currentTrial) {
      console.log("Trial no longer exists, skipping:", trial.id);
      continue;
    }

    if (currentTrial.buyerCheckinSentAt) {
      console.log("Buyer check-in already sent for trial, skipping:", trial.id);
      continue;
    }

    // Only send buyer check-in if storyteller hasn't responded
    // Check if buyer check-in was cancelled (buyerCheckinScheduledFor is null)
    if (!currentTrial.buyerCheckinScheduledFor) {
      console.log(
        "Buyer check-in was cancelled (storyteller responded), skipping:",
        trial.id,
      );
      continue;
    }

    try {
      const buyerCheckinSent = await sendBuyerCheckin(
        trial.customerPhone,
        trial.buyerName,
        trial.storytellerName,
      );

      if (buyerCheckinSent) {
        await storage.updateFreeTrialDb(trial.id, {
          buyerCheckinSentAt: new Date(),
          buyerCheckinScheduledFor: null,
        });

        console.log("Sent buyer check-in to trial:", trial.id);
      } else {
        console.log(
          "Failed to send buyer check-in template for trial:",
          trial.id,
        );
      }
    } catch (error) {
      console.error("Error sending buyer check-in:", trial.id, error);
    }
  }
}

export async function sendStorytellerCheckins(): Promise<void> {
  const trials = await storage.getTrialsNeedingCheckin();

  console.log(`Found ${trials.length} trials needing storyteller check-in`);

  for (const trial of trials) {
    if (!trial.storytellerPhone) {
      console.log("Skipping trial without storyteller phone:", trial.id);
      continue;
    }

    // Double-check that check-in hasn't been sent (race condition protection)
    const currentTrial = await storage.getFreeTrialDb(trial.id);
    if (!currentTrial) {
      console.log("Trial no longer exists, skipping:", trial.id);
      continue;
    }

    if (currentTrial.storytellerCheckinSentAt) {
      console.log("Check-in already sent for trial, skipping:", trial.id);
      continue;
    }

    try {
      const checkinSent = await sendStorytellerCheckin(
        trial.storytellerPhone,
        trial.storytellerName,
        trial.storytellerLanguagePreference,
      );

      if (checkinSent) {
        const now = new Date();
        const buyerCheckinScheduledFor = new Date(
          now.getTime() + 24 * 60 * 60 * 1000,
        ); // 24 hours from now

        const updateData: any = {
          storytellerCheckinSentAt: now,
          storytellerCheckinScheduledFor: null,
        };

        // Schedule buyer check-in for 24 hours later if customer phone exists
        if (trial.customerPhone) {
          updateData.buyerCheckinScheduledFor = buyerCheckinScheduledFor;
        }

        await storage.updateFreeTrialDb(trial.id, updateData);

        console.log("Sent storyteller check-in to trial:", {
          trialId: trial.id,
          buyerCheckinScheduledFor: trial.customerPhone
            ? buyerCheckinScheduledFor
            : null,
        });
      } else {
        console.log(
          "Failed to send storyteller check-in template for trial:",
          trial.id,
        );
      }
    } catch (error) {
      console.error("Error sending storyteller check-in:", trial.id, error);
    }
  }
}

export async function sendScheduledFeedbackRequests(): Promise<void> {
  // Send buyer feedback requests
  const buyerTrials = await storage.getTrialsNeedingBuyerFeedback();
  console.log(`Found ${buyerTrials.length} trials needing buyer feedback`);

  for (const trial of buyerTrials) {
    if (!trial.customerPhone) {
      console.log("Skipping trial without customer phone:", trial.id);
      continue;
    }

    // Get buyer feedback row
    const buyerFeedback = await storage.getUserFeedbackByTrialAndType(
      trial.id,
      "buyer",
    );

    if (!buyerFeedback) {
      console.log("Buyer feedback row not found for trial:", trial.id);
      continue;
    }

    // Double-check that feedback hasn't been sent (race condition protection)
    if (buyerFeedback.sentAt) {
      console.log("Buyer feedback already sent for trial, skipping:", trial.id);
      continue;
    }

    try {
      const feedbackSent = await sendBuyerFeedbackRequest(
        trial.customerPhone,
        trial.buyerName,
        trial.storytellerName,
        trial.id,
      );

      if (feedbackSent) {
        await storage.updateUserFeedback(buyerFeedback.id, {
          sentAt: new Date(),
        });

        console.log("Sent buyer feedback request to trial:", trial.id);
      } else {
        console.log(
          "Failed to send buyer feedback request for trial:",
          trial.id,
        );
      }
    } catch (error) {
      console.error("Error sending buyer feedback request:", trial.id, error);
    }
  }

  // Send storyteller feedback requests
  const storytellerTrials = await storage.getTrialsNeedingStorytellerFeedback();
  console.log(
    `Found ${storytellerTrials.length} trials needing storyteller feedback`,
  );

  for (const trial of storytellerTrials) {
    if (!trial.storytellerPhone) {
      console.log("Skipping trial without storyteller phone:", trial.id);
      continue;
    }

    // Get storyteller feedback row
    const storytellerFeedback = await storage.getUserFeedbackByTrialAndType(
      trial.id,
      "storyteller",
    );

    if (!storytellerFeedback) {
      console.log("Storyteller feedback row not found for trial:", trial.id);
      continue;
    }

    // Double-check that feedback hasn't been sent (race condition protection)
    if (storytellerFeedback.sentAt) {
      console.log(
        "Storyteller feedback already sent for trial, skipping:",
        trial.id,
      );
      continue;
    }

    try {
      const feedbackSent = await sendStorytellerFeedbackRequest(
        trial.storytellerPhone,
        trial.storytellerName,
        trial.storytellerLanguagePreference,
        trial.id,
      );

      if (feedbackSent) {
        await storage.updateUserFeedback(storytellerFeedback.id, {
          sentAt: new Date(),
        });

        console.log("Sent storyteller feedback request to trial:", trial.id);
      } else {
        console.log(
          "Failed to send storyteller feedback request for trial:",
          trial.id,
        );
      }
    } catch (error) {
      console.error(
        "Error sending storyteller feedback request:",
        trial.id,
        error,
      );
    }
  }
}

export async function processScheduledTasks(): Promise<void> {
  if (isProcessing) {
    console.log("Scheduler already running, skipping this run");
    return;
  }

  isProcessing = true;

  try {
    console.log("Running scheduled tasks...");

    await sendScheduledQuestions();

    await sendPendingReminders();

    await processRetryReminders();

    await sendBuyerRemindersForNoStorytellerContact();

    await sendStorytellerCheckins();

    await sendBuyerCheckins();

    await sendScheduledFeedbackRequests();

    console.log("Scheduled tasks completed");
  } catch (error) {
    console.error("Error processing scheduled tasks:", error);
  } finally {
    isProcessing = false;
  }
}

export function startScheduler(): NodeJS.Timeout {
  console.log("Starting background scheduler (runs every 5 minutes)");
  console.log(
    "NOTE: For production, use external cron job or task scheduler instead of setInterval",
  );

  const intervalId = setInterval(
    () => {
      processScheduledTasks().catch(console.error);
    },
    5 * 60 * 1000,
  ); // Run every 5 minutes

  processScheduledTasks().catch(console.error);

  return intervalId;
}
