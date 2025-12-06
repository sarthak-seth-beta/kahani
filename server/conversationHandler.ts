import { storage } from "./storage";
import {
  sendTextMessageWithRetry,
  sendStorytellerOnboarding,
  sendReadinessCheck,
  sendVoiceNoteAcknowledgment,
  downloadVoiceNoteMedia,
  downloadMediaFile,
} from "./whatsapp";
import { uploadVoiceNoteToStorage } from "./supabase";

interface WhatsAppMessage {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  button?: {
    payload?: string;
    text?: string;
  };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

const ORDER_ID_PATTERN = /([a-f0-9-]{36})/i;

/**
 * Extracts order ID (trial ID) from message text
 */
function extractOrderId(messageText: string): string | null {
  const match = messageText.match(ORDER_ID_PATTERN);
  return match ? match[1] : null;
}

/**
 * Finds trial by order ID and associates phone number if needed
 */
async function findTrialByOrderId(
  orderId: string,
  fromNumber: string,
): Promise<any | null> {
  const trial = await storage.getFreeTrialDb(orderId);

  if (!trial) {
    return null;
  }

  // Associate phone number if not already set
  if (!trial.storytellerPhone) {
    const updatedTrial = await storage.updateFreeTrialDb(trial.id, {
      storytellerPhone: fromNumber,
    });
    console.log("Associated storyteller phone with trial:", {
      trialId: updatedTrial.id,
      storytellerPhone: fromNumber,
    });
    return updatedTrial;
  }

  return trial;
}

/**
 * Resolves which trial to use based on message content and phone number
 * Priority: Order ID in message > Active trial lookup > Any trial lookup
 */
async function resolveTrial(
  messageText: string,
  fromNumber: string,
): Promise<any | null> {
  // Priority 1: Check for order ID in message
  const orderId = extractOrderId(messageText);
  if (orderId) {
    const trial = await findTrialByOrderId(orderId, fromNumber);
    if (trial) {
      console.log("Resolved trial by order ID:", {
        trialId: trial.id,
        orderId,
        fromNumber,
      });
      return trial;
    }
  }

  // Priority 2: Look for active trial (in_progress or awaiting_readiness), oldest first
  const activeTrial =
    await storage.getActiveTrialByStorytellerPhone(fromNumber);
  if (activeTrial) {
    console.log("Resolved active trial by phone number:", {
      trialId: activeTrial.id,
      conversationState: activeTrial.conversationState,
      createdAt: activeTrial.createdAt,
      fromNumber,
    });
    return activeTrial;
  }

  // Priority 3: Fall back to any trial (for edge cases)
  const anyTrial = await storage.getFreeTrialByStorytellerPhone(fromNumber);
  if (anyTrial) {
    console.log("Resolved any trial by phone number (fallback):", {
      trialId: anyTrial.id,
      conversationState: anyTrial.conversationState,
      fromNumber,
    });
  }
  return anyTrial;
}

/**
 * Handles case when no trial is found
 */
async function handleNoTrialFound(
  fromNumber: string,
  messageText: string,
): Promise<void> {
  console.log(
    "No free trial found for phone:",
    fromNumber,
    "Message:",
    messageText,
  );

  await sendTextMessageWithRetry(
    fromNumber,
    "Hi! I'm Vaani from Kahani. It looks like you haven't started a story collection yet. To get started, please ask the person who wants to preserve your stories to create a free trial and share the link with you. Once you click that link, we can begin your storytelling journey!",
  );
}

/**
 * Handles text messages during in_progress state
 */
async function handleInProgressTextMessage(
  trial: any,
  fromNumber: string,
  messageText: string,
): Promise<void> {
  const orderId = extractOrderId(messageText);

  if (orderId && orderId === trial.id) {
    // User explicitly referenced this trial
    await sendTextMessageWithRetry(
      fromNumber,
      `Great! I found your story collection. You're currently working on answering questions. Please send a voice note to answer the current question.`,
    );
  } else {
    // Generic reminder
    await sendTextMessageWithRetry(
      fromNumber,
      "Please send a voice note to answer the question. I'll be waiting to hear your story!",
    );
  }
}

/**
 * Handles completed trial state
 */
async function handleCompletedTrial(
  trial: any,
  fromNumber: string,
  messageText: string,
): Promise<void> {
  const orderId = extractOrderId(messageText);
  const isExplicitReference = orderId === trial.id;

  // Only send completion message if:
  // 1. User explicitly referenced this trial (order ID matches), OR
  // 2. No order ID was provided (legacy behavior - phone lookup)
  if (isExplicitReference || !orderId) {
    await sendTextMessageWithRetry(
      fromNumber,
      `Thank you ${trial.storytellerName}! You've completed all the questions${isExplicitReference ? " for this story collection" : ""}. Your stories will be compiled into a beautiful book for your family.`,
    );
  }
}

export async function handleIncomingMessage(
  fromNumber: string,
  message: WhatsAppMessage,
  messageType: string,
): Promise<void> {
  const messageText = message.text?.body || "";
  
  // Handle interactive messages (button clicks)
  let interactiveText = "";
  if (messageType === "interactive" && message.interactive) {
    if (message.interactive.button_reply) {
      interactiveText = message.interactive.button_reply.title;
    } else if (message.interactive.list_reply) {
      interactiveText = message.interactive.list_reply.title;
    }
  } else if (messageType === "button" && message.button) {
    // Handle button type messages (from WhatsApp templates)
    interactiveText = message.button.text || message.button.payload || "";
  }

  // Resolve which trial to use
  const trial = await resolveTrial(messageText || interactiveText, fromNumber);

  if (!trial) {
    await handleNoTrialFound(fromNumber, messageText || interactiveText);
    return;
  }

  console.log("Processing message for trial:", {
    trialId: trial.id,
    storytellerName: trial.storytellerName,
    conversationState: trial.conversationState,
    messageType,
    hasOrderId: !!extractOrderId(messageText || interactiveText),
    interactiveText,
  });

  // Route to appropriate handler based on conversation state
  switch (trial.conversationState) {
    case "awaiting_initial_contact":
      await handleInitialContact(trial, fromNumber);
      break;

    case "awaiting_readiness":
      if (messageType === "text" || messageType === "interactive" || messageType === "button") {
        const responseText = messageType === "button" || messageType === "interactive" ? interactiveText : messageText;
        console.log("Calling handleReadinessResponse:", {
          trialId: trial.id,
          fromNumber,
          responseText,
          messageType,
        });
        await handleReadinessResponse(trial, fromNumber, responseText);
        console.log("handleReadinessResponse completed for trial:", trial.id);
      } else {
        console.log("Message type not handled in awaiting_readiness:", messageType);
      }
      break;

    case "in_progress":
      if (messageType === "audio") {
        await handleVoiceNote(trial, fromNumber, message);
      } else if (messageType === "text") {
        await handleInProgressTextMessage(trial, fromNumber, messageText);
      }
      break;

    case "completed":
      await handleCompletedTrial(trial, fromNumber, messageText);
      break;

    default:
      console.log("Unknown conversation state:", trial.conversationState);
  }
}

async function handleInitialContact(
  trial: any,
  fromNumber: string,
): Promise<void> {
  await sendStorytellerOnboarding(
    fromNumber,
    trial.storytellerName,
    trial.buyerName,
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await askReadiness(trial, fromNumber);

  await storage.updateFreeTrialDb(trial.id, {
    conversationState: "awaiting_readiness",
    welcomeSentAt: new Date(),
    readinessAskedAt: new Date(),
  });
}

export async function askReadiness(trial: any, fromNumber: string): Promise<void> {
  await sendReadinessCheck(fromNumber, trial.storytellerName);
  
  await storage.updateFreeTrialDb(trial.id, {
    readinessAskedAt: new Date(),
  });
}

async function handleReadinessResponse(
  trial: any,
  fromNumber: string,
  response: string,
): Promise<void> {
  console.log("handleReadinessResponse called:", {
    trialId: trial.id,
    fromNumber,
    response,
    responseLength: response.length,
  });

  // Normalize response: lowercase, trim, and normalize apostrophes/quotes
  let normalizedResponse = response.toLowerCase().trim();
  // Normalize different apostrophe types (straight, curly, etc.)
  normalizedResponse = normalizedResponse.replace(/[''`]/g, "'");
  // Normalize different dash types
  normalizedResponse = normalizedResponse.replace(/[–—]/g, "-");
  
  console.log("Normalized response:", normalizedResponse, "original:", response);

  // Handle button responses from template (exact matches)
  const yesButtonPatterns = [
    "yes, let's begin",
    "yes let's begin",
    "yes, lets begin",
    "yes lets begin",
    "yes let's begin",
    "yes, let us begin",
  ];
  const maybeButtonPatterns = ["maybe later"];

  // Normalize patterns too
  const normalizedYesPatterns = yesButtonPatterns.map(p => 
    p.toLowerCase().replace(/[''`]/g, "'").replace(/[–—]/g, "-")
  );
  const normalizedMaybePatterns = maybeButtonPatterns.map(p => 
    p.toLowerCase().replace(/[''`]/g, "'").replace(/[–—]/g, "-")
  );

  // Check for button responses first (exact match)
  const isYesButton = normalizedYesPatterns.some((pattern) =>
    normalizedResponse === pattern,
  );
  const isMaybeButton = normalizedMaybePatterns.some((pattern) =>
    normalizedResponse === pattern,
  );

  console.log("Button pattern matching:", {
    isYesButton,
    isMaybeButton,
    normalizedResponse,
    matchedPattern: isYesButton ? yesButtonPatterns.find(p => normalizedResponse === p.toLowerCase()) : null,
  });

  // Fallback to text patterns (for non-production or manual text responses)
  const yesPatterns = ["yes", "yeah", "yep", "sure", "ready", "ok", "okay", "begin"];
  const maybePatterns = ["not sure", "later", "wait"];

  const isYesText = yesPatterns.some((pattern) =>
    normalizedResponse.includes(pattern),
  );
  const isMaybeText = maybePatterns.some((pattern) =>
    normalizedResponse.includes(pattern),
  );

  console.log("Text pattern matching:", {
    isYesText,
    isMaybeText,
  });

  const isYes = isYesButton || isYesText;
  const isMaybe = isMaybeButton || isMaybeText;

  console.log("Final decision:", { isYes, isMaybe });

  if (isYes) {
    console.log("Processing YES response, updating trial state to in_progress");
    await storage.updateFreeTrialDb(trial.id, {
      conversationState: "in_progress",
      lastReadinessResponse: "yes",
      retryReadinessAt: null,
      retryCount: 0,
    });

    console.log("Trial state updated to in_progress, calling sendQuestion");
    // Send the question (could be first question or next question)
    try {
      await sendQuestion(trial, fromNumber);
      console.log("sendQuestion completed successfully");
    } catch (error) {
      console.error("Error in sendQuestion:", error);
      throw error;
    }
  } else if (isMaybe) {
    const retryAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    await storage.updateFreeTrialDb(trial.id, {
      lastReadinessResponse: "maybe",
      retryReadinessAt: retryAt,
      conversationState: "awaiting_readiness",
    });

    // const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;
    if (!isProduction) {
      await sendTextMessageWithRetry(
        fromNumber,
        "No problem! I'll check back with you in a few hours. Take your time.",
      );
    }
    // In production, no additional message is sent after "Maybe Later" button click
  } else {
    // const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;
    if (!isProduction) {
      await sendTextMessageWithRetry(
        fromNumber,
        "I didn't quite understand. Please reply with 'yes' if you're ready to start, or 'maybe' if you need more time.",
      );
    }
  }
}

async function sendFirstQuestion(
  trial: any,
  fromNumber: string,
): Promise<void> {
  const questionIndex = 0;
  await sendQuestion(trial, fromNumber, questionIndex);
}

async function sendQuestion(
  trial: any,
  fromNumber: string,
  questionIndex?: number,
): Promise<void> {
  console.log("sendQuestion called:", {
    trialId: trial.id,
    fromNumber,
    questionIndex,
    currentQuestionIndex: trial.currentQuestionIndex,
    selectedAlbum: trial.selectedAlbum,
  });

  // const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;
  
  // Use provided questionIndex or current question index
  const targetQuestionIndex = questionIndex ?? trial.currentQuestionIndex ?? 0;
  
  console.log("Fetching question with targetQuestionIndex:", targetQuestionIndex);
  const question = await storage.getQuestionByIndex(
    trial.selectedAlbum,
    targetQuestionIndex,
  );

  if (!question) {
    console.error("No question found for album:", trial.selectedAlbum, "index:", targetQuestionIndex);
    return;
  }

  console.log("Question retrieved:", {
    questionIndex: targetQuestionIndex,
    questionLength: question.length,
    questionPreview: question.substring(0, 50) + "...",
  });

  const questionMessage = `Here is the question we want you to talk about:

${question}

Take your time and reply with a voice note whenever you are ready.`;

  console.log("Sending question message to:", fromNumber);
  const messageSent = await sendTextMessageWithRetry(fromNumber, questionMessage);
  console.log("Question message send result:", messageSent);

  await storage.updateFreeTrialDb(trial.id, {
    currentQuestionIndex: targetQuestionIndex,
    lastQuestionSentAt: new Date(),
    nextQuestionScheduledFor: null,
  });
  console.log("Trial updated with question sent timestamp");
}

async function handleVoiceNote(
  trial: any,
  fromNumber: string,
  message: WhatsAppMessage,
): Promise<void> {
  if (!message.audio || !message.audio.id) {
    console.error("Invalid voice note message - missing audio data");
    return;
  }

  const audioId = message.audio.id;
  const mimeType = message.audio.mime_type;

  const currentQuestion = await storage.getQuestionByIndex(
    trial.selectedAlbum,
    trial.currentQuestionIndex,
  );

  if (!currentQuestion) {
    console.error(
      "No current question found for question index:",
      trial.currentQuestionIndex,
    );
    return;
  }

  const existingVoiceNotes = await storage.getVoiceNotesByTrialId(trial.id);
  const alreadyAnswered = existingVoiceNotes.some(
    (note) => note.questionIndex === trial.currentQuestionIndex,
  );

  if (alreadyAnswered) {
    console.log(
      "Voice note already exists for this question, skipping duplicate insert",
    );
  } else {
    try {
      const voiceNote = await storage.createVoiceNote({
        freeTrialId: trial.id,
        questionIndex: trial.currentQuestionIndex,
        questionText: currentQuestion,
        mediaId: audioId,
        mimeType: mimeType || "audio/ogg",
        downloadStatus: "pending",
      });

      console.log("Saved voice note for trial:", {
        trialId: trial.id,
        questionIndex: trial.currentQuestionIndex,
        mediaId: audioId,
      });

      downloadAndStoreVoiceNote(
        voiceNote.id,
        audioId,
        mimeType || "audio/ogg",
      ).catch(console.error);
    } catch (error) {
      console.error("Error saving voice note (may be duplicate):", error);
      return;
    }
  }

  await sendVoiceNoteAcknowledgment(fromNumber, trial.storytellerName);

  const totalQuestions = await storage.getTotalQuestionsForAlbum(
    trial.selectedAlbum,
  );
  const nextQuestionIndex = trial.currentQuestionIndex + 1;

  if (nextQuestionIndex >= totalQuestions) {
    await storage.updateFreeTrialDb(trial.id, {
      conversationState: "completed",
      nextQuestionScheduledFor: null,
      reminderSentAt: null,
    });

    const { sendStorytellerCompletionMessages, sendBuyerCompletionMessage } = await import("./whatsapp");

    // Send to storyteller
    await sendStorytellerCompletionMessages(
      fromNumber,
      trial.storytellerName,
      trial.id,
    );

    // Send to buyer if phone number exists
    if (trial.customerPhone) {
      await sendBuyerCompletionMessage(
        trial.customerPhone,
        trial.buyerName,
        trial.storytellerName,
        trial.id,
      );
    }
  } else {
    // const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;
    
    if (isProduction) {
      // In production: ask readiness before next question
      await storage.updateFreeTrialDb(trial.id, {
        currentQuestionIndex: nextQuestionIndex,
        conversationState: "awaiting_readiness",
        reminderSentAt: null,
      });
      
      await askReadiness(trial, fromNumber);
    } else {
      // In non-production: schedule next question immediately (2 seconds)
      const now = new Date();
      const nextQuestionScheduledFor = new Date(now.getTime() + 2000);

      await storage.updateFreeTrialDb(trial.id, {
        currentQuestionIndex: nextQuestionIndex,
        nextQuestionScheduledFor,
        reminderSentAt: null,
      });
    }
  }
}

async function downloadAndStoreVoiceNote(
  voiceNoteId: string,
  mediaId: string,
  mimeType: string,
): Promise<void> {
  try {
    // Step 1: Get media info (URL) from WhatsApp
    const mediaInfo = await downloadVoiceNoteMedia(mediaId);

    if (!mediaInfo) {
      console.error("Failed to get media info for voice note:", voiceNoteId);
      await storage.updateVoiceNote(voiceNoteId, {
        downloadStatus: "failed",
      });
      return;
    }

    // Step 2: Use mimeType from mediaInfo (more accurate) or fallback to parameter
    const finalMimeType = mediaInfo.mimeType || mimeType || "audio/ogg";

    // Step 3: Download the actual file from WhatsApp
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("WhatsApp access token not available for downloading file");
      await storage.updateVoiceNote(voiceNoteId, {
        downloadStatus: "failed",
      });
      return;
    }

    const fileBuffer = await downloadMediaFile(mediaInfo.url, accessToken);

    if (!fileBuffer) {
      console.error(
        "Failed to download media file for voice note:",
        voiceNoteId,
      );
      await storage.updateVoiceNote(voiceNoteId, {
        downloadStatus: "failed",
      });
      return;
    }

    // Step 4: Upload to Supabase Storage
    const supabaseUrl = await uploadVoiceNoteToStorage(
      fileBuffer,
      voiceNoteId,
      finalMimeType,
    );

    if (!supabaseUrl) {
      console.error(
        "Failed to upload voice note to Supabase Storage:",
        voiceNoteId,
      );
      // Still save the WhatsApp URL as fallback
      await storage.updateVoiceNote(voiceNoteId, {
        mediaUrl: mediaInfo.url,
        mediaSha256: mediaInfo.sha256,
        sizeBytes: mediaInfo.fileSize,
        downloadStatus: "failed", // Mark as failed since Supabase upload failed
      });
      return;
    }

    // Step 5: Update database with Supabase URL and metadata
    const fileExtension = finalMimeType.includes("ogg")
      ? "ogg"
      : finalMimeType.includes("mp3")
        ? "mp3"
        : finalMimeType.includes("m4a")
          ? "m4a"
          : "ogg";

    await storage.updateVoiceNote(voiceNoteId, {
      mediaUrl: supabaseUrl, // Store Supabase URL instead of temporary WhatsApp URL
      localFilePath: `${voiceNoteId}.${fileExtension}`, // Store file path
      mimeType: finalMimeType, // Update with accurate mimeType from WhatsApp
      mediaSha256: mediaInfo.sha256,
      sizeBytes: mediaInfo.fileSize,
      downloadStatus: "completed",
    });

    console.log("Voice note downloaded and uploaded to Supabase:", {
      voiceNoteId,
      mediaId,
      supabaseUrl,
      sizeBytes: mediaInfo.fileSize,
    });
  } catch (error) {
    console.error("Error downloading and storing voice note:", error);
    await storage.updateVoiceNote(voiceNoteId, {
      downloadStatus: "failed",
    });
  }
}

export async function processRetryReminders(): Promise<void> {
  const trialsNeedingRetry = await storage.getFreeTrialsNeedingRetry();

  for (const trial of trialsNeedingRetry) {
    if (!trial.storytellerPhone) {
      continue;
    }

    const currentRetryCount = trial.retryCount || 0;

    if (currentRetryCount >= 3) {
      console.log("Max retries already reached, skipping trial:", trial.id);
      continue;
    }

    const nextRetryCount = currentRetryCount + 1;

    await askReadiness(trial, trial.storytellerPhone);

    if (nextRetryCount >= 3) {
      await storage.updateFreeTrialDb(trial.id, {
        conversationState: "completed",
        retryReadinessAt: null,
        retryCount: nextRetryCount,
        readinessAskedAt: new Date(),
      });

      console.log("Sent 3rd retry - closing flow:", trial.id);

      // const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;
      if (!isProduction) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        await sendTextMessageWithRetry(
          trial.storytellerPhone,
          `Hi ${trial.storytellerName}, it seems this might not be the right time. We're here whenever you're ready. Feel free to reach out anytime!`,
        );
      }

      continue;
    }

    const nextRetryAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    await storage.updateFreeTrialDb(trial.id, {
      readinessAskedAt: new Date(),
      retryCount: nextRetryCount,
      retryReadinessAt: nextRetryAt,
      conversationState: "awaiting_readiness",
    });

    console.log("Retry reminder sent:", {
      trialId: trial.id,
      retryCount: nextRetryCount,
      nextRetryAt,
    });
  }
}
