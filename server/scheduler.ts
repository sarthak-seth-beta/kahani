import cron from "node-cron";
import { storage } from "./storage";
import {
  sendTextMessageWithRetry,
  sendTemplateMessageWithRetry,
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

    const question = await storage.getQuestionByIndex(
      trial.selectedAlbum,
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
    let album = await storage.getAlbumByTitle(trial.selectedAlbum);
    if (!album) {
      album = await storage.getAlbumById(trial.selectedAlbum);
    }
    const isConversationalAlbum = album?.isConversationalAlbum === true;

    // For conversational albums, limit reminders to 2 max (3 total attempts)
    const currentCount = trial.questionReminderCount || 0;
    if (isConversationalAlbum) {
      if (currentCount >= 2) {
        console.log(
          "Trial has reached max reminders for conversational album, skipping:",
          trial.id,
        );
        continue;
      }
    }

    try {
      // Resend the full question as a reminder
      await sendQuestion(trial, trial.storytellerPhone, undefined, true);

      // Increment reminder count and update timestamps
      await storage.updateFreeTrialDb(trial.id, {
        questionReminderCount: currentCount + 1,
        reminderSentAt: new Date(),
      });

      console.log("Resent question as reminder to trial:", {
        trialId: trial.id,
        reminderCount: currentCount + 1,
        isConversationalAlbum,
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
