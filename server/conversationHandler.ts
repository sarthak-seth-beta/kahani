import { storage } from "./storage";
import {
  sendTextMessageWithRetry,
  sendStorytellerOnboarding,
  sendReadinessCheck,
  sendVoiceNoteAcknowledgment,
  sendIntermediateAcknowledgment,
  downloadVoiceNoteMedia,
  downloadMediaFile,
  sendPhotoRequestToBuyer,
  getLocalizedMessage,
  sendFreeTrialConfirmation,
  sendShareableLink,
  normalizePhoneNumber,
  sendTemplateMessageWithRetry,
  sendInteractiveMessageWithCTA,
} from "./whatsapp";
import { uploadVoiceNoteToR2, uploadImageToR2 } from "./r2";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

interface WhatsAppMessage {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
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
const BUYER_PREFIX_PATTERN = /by_([a-f0-9-]{36})/i;
const STORYTELLER_PREFIX_PATTERN = /st_([a-f0-9-]{36})/i;

/**
 * Extracts order ID (trial ID) from message text
 * Returns the orderId and source (buyer/storyteller/null)
 */
function extractOrderId(messageText: string): {
  orderId: string | null;
  source: "buyer" | "storyteller" | null;
} {
  // Check for buyer prefix first
  const buyerMatch = messageText.match(BUYER_PREFIX_PATTERN);
  if (buyerMatch) {
    return { orderId: buyerMatch[1], source: "buyer" };
  }

  // Check for storyteller prefix
  const storytellerMatch = messageText.match(STORYTELLER_PREFIX_PATTERN);
  if (storytellerMatch) {
    return { orderId: storytellerMatch[1], source: "storyteller" };
  }

  // Fall back to regular order ID pattern (no prefix)
  const match = messageText.match(ORDER_ID_PATTERN);
  return { orderId: match ? match[1] : null, source: null };
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
  const { orderId } = extractOrderId(messageText);
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

  // Priority 2: Look for active trials (in_progress or awaiting_readiness), oldest first
  const activeTrials =
    await storage.getAllActiveTrialsByStorytellerPhone(fromNumber);
  if (activeTrials.length > 0) {
    const oldestTrial = activeTrials[0];
    console.log("Resolved active trial by phone number:", {
      trialId: oldestTrial.id,
      conversationState: oldestTrial.conversationState,
      createdAt: oldestTrial.createdAt,
      fromNumber,
      totalActiveTrials: activeTrials.length,
    });
    return oldestTrial;
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
  messageType?: string,
): Promise<void> {
  console.log(
    "No free trial found for phone:",
    fromNumber,
    "Message:",
    messageText,
    "MessageType:",
    messageType,
  );

  // Check if this is a support query (text message with no order ID)
  const orderIdResult = extractOrderId(messageText);
  const isSupportQuery = messageType === "text" && !orderIdResult.orderId;

  if (isSupportQuery) {
    console.log("Detected support query, sending support response:", {
      fromNumber,
      messageText,
    });

    // Send template message
    await sendTemplateMessageWithRetry(
      fromNumber,
      "fallbackbuyer_vaani_en",
      [], // No parameters
    );

    return;
  }

  // Default behavior for non-support queries
  // Default to English for unknown users
  const message = getLocalizedMessage("noTrialFound", null);
  await sendTextMessageWithRetry(fromNumber, message);
}

/**
 * Resends buyer onboarding templates (buyerconfirmation_vaani_en and forward_vaani_en)
 * This is used when a buyer reaches out because they didn't receive the initial confirmation
 */
async function resendBuyerOnboardingTemplates(
  trial: any,
  recipientNumber: string,
): Promise<void> {
  try {
    console.log("Resending buyer onboarding templates:", {
      trialId: trial.id,
      buyerName: trial.buyerName,
      storytellerName: trial.storytellerName,
      recipientNumber,
    });

    // Send buyer confirmation template
    const confirmationSent = await sendFreeTrialConfirmation(
      recipientNumber,
      trial.buyerName,
      trial.storytellerName,
      trial.selectedAlbum,
    );

    if (!confirmationSent) {
      console.warn(
        "Failed to resend buyer confirmation template for trial:",
        trial.id,
      );
    }

    // Wait 2 seconds before sending shareable link (similar to existing flow)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Send shareable link template
    const shareableLinkSent = await sendShareableLink(
      recipientNumber,
      trial.storytellerName,
      trial.buyerName,
      trial.id,
      trial.storytellerLanguagePreference,
    );

    if (!shareableLinkSent) {
      console.warn(
        "Failed to resend shareable link template for trial:",
        trial.id,
      );
    }

    console.log("Buyer onboarding templates resent:", {
      trialId: trial.id,
      confirmationSent,
      shareableLinkSent,
    });
  } catch (error) {
    console.error(
      "Error resending buyer onboarding templates:",
      error,
      "Trial ID:",
      trial.id,
    );
  }
}

/**
 * Handles multiple active trials scenario
 * Sends a message about active Kahani and then sends the next unanswered question
 */
async function handleMultipleActiveTrials(
  trial: any,
  fromNumber: string,
): Promise<void> {
  console.log("Handling multiple active trials:", {
    trialId: trial.id,
    storytellerName: trial.storytellerName,
    buyerName: trial.buyerName,
    fromNumber,
  });

  // Send first message about active Kahani
  const activeKahaniMessage = getLocalizedMessage(
    "activeKahaniMessage",
    trial.storytellerLanguagePreference,
    {
      storytellerName: trial.storytellerName,
      buyerName: trial.buyerName,
    },
  );

  await sendTextMessageWithRetry(fromNumber, activeKahaniMessage);

  // Wait 2 seconds before sending the next message
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Find the next unanswered question
  const nextQuestionIndex = await getNextUnansweredQuestion(trial);

  if (nextQuestionIndex !== null) {
    console.log("Sending next unanswered question:", {
      trialId: trial.id,
      questionIndex: nextQuestionIndex,
    });
    // Send the question
    await sendQuestion(trial, fromNumber, nextQuestionIndex);
  } else {
    // All questions are answered - this shouldn't happen if trial is in_progress
    // but handle it gracefully
    console.log("All questions answered for trial:", trial.id);
    const totalQuestions = await storage.getTotalQuestionsForAlbum(
      trial.selectedAlbum,
      trial.storytellerLanguagePreference,
    );
    if (trial.currentQuestionIndex >= totalQuestions - 1) {
      // All questions completed, update state
      await storage.updateFreeTrialDb(trial.id, {
        conversationState: "completed",
      });
    }
  }
}

/**
 * Handles text messages during in_progress state
 */
async function handleInProgressTextMessage(
  trial: any,
  fromNumber: string,
  messageText: string,
): Promise<void> {
  const { orderId } = extractOrderId(messageText);

  if (orderId && orderId === trial.id) {
    // User explicitly referenced this trial
    const message = getLocalizedMessage(
      "foundStoryCollection",
      trial.storytellerLanguagePreference,
    );
    await sendTextMessageWithRetry(fromNumber, message);
  } else {
    // Generic reminder
    const message = getLocalizedMessage(
      "sendVoiceNoteReminder",
      trial.storytellerLanguagePreference,
    );
    await sendTextMessageWithRetry(fromNumber, message);
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
  const { orderId } = extractOrderId(messageText);
  const isExplicitReference = orderId === trial.id;

  // Only send completion message if:
  // 1. User explicitly referenced this trial (order ID matches), OR
  // 2. No order ID was provided (legacy behavior - phone lookup)
  if (isExplicitReference || !orderId) {
    const message = getLocalizedMessage(
      "completedAllQuestions",
      trial.storytellerLanguagePreference,
      { name: trial.storytellerName },
    );
    await sendTextMessageWithRetry(fromNumber, message);
  }
}

/**
 * Handles case when buyer accidentally sends the storyteller prefilled message
 * Sends a polite message explaining they should forward the link to the storyteller
 */
async function handleBuyerSendingStorytellerMessage(
  trial: any,
  fromNumber: string,
  orderId: string,
): Promise<void> {
  console.log("Detected buyer sending storyteller prefilled message:", {
    trialId: trial.id,
    buyerName: trial.buyerName,
    storytellerName: trial.storytellerName,
    fromNumber,
    orderId,
  });

  // Generate the shareable link (same format as sendShareableLink)
  const businessPhone = process.env.WHATSAPP_BUSINESS_NUMBER_E164;
  if (!businessPhone) {
    console.error("WHATSAPP_BUSINESS_NUMBER_E164 not configured");
    return;
  }

  const prefilledMessage = `Hi, ${trial.buyerName} has placed an order st_${orderId} for me.`;
  const whatsappLink = `https://wa.me/${businessPhone}?text=${encodeURIComponent(prefilledMessage)}`;

  // Send polite message with emojis
  const message = `Hi ${trial.buyerName}! 👋\n\nLooks like you clicked on the link that was meant for ${trial.storytellerName}. 😊\n\nNo worries! Please *copy this link and send it to ${trial.storytellerName}*:\n\n${whatsappLink}\n\nThey just need to click the link and send the pre-filled message - that's it! ✨\n\nHope to hear from them soon! ❤️`;

  await sendTextMessageWithRetry(fromNumber, message);
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

  // Check if buyer is sending the storyteller prefilled message (st_ prefix)
  // This happens when buyer clicks the link meant for storyteller
  const combinedText = messageText || interactiveText;
  const orderIdResult = extractOrderId(combinedText);
  if (orderIdResult.source === "storyteller" && orderIdResult.orderId) {
    // Normalize phone number for comparison
    const normalizedFromNumber = normalizePhoneNumber(fromNumber);

    // Check if this phone number matches a buyer's customerPhone
    // ToDo: figure out logic for multiple buyers on the same phone number
    const buyerTrial =
      await storage.getFreeTrialByBuyerPhone(normalizedFromNumber);

    if (buyerTrial) {
      // Verify the orderId matches the trial
      const trial = await storage.getFreeTrialDb(orderIdResult.orderId);
      if (trial && trial.id === buyerTrial.id) {
        // Buyer is sending the storyteller prefilled message
        await handleBuyerSendingStorytellerMessage(
          trial,
          normalizedFromNumber,
          orderIdResult.orderId,
        );
        return;
      }
    }
  }

  // Check if message is from buyer and is an image - handle separately
  if (messageType === "image") {
    const normalizedFromNumber = normalizePhoneNumber(fromNumber);
    const buyerTrial =
      await storage.getFreeTrialByBuyerPhone(normalizedFromNumber);
    if (buyerTrial && buyerTrial.customerPhone === normalizedFromNumber) {
      await handleBuyerImageMessage(buyerTrial, normalizedFromNumber, message);
      return;
    }
  }

  // Check for buyer message with by_ prefix - handle separately
  // Note: orderIdResult was already extracted above for the st_ check
  if (orderIdResult.source === "buyer" && orderIdResult.orderId) {
    const trial = await storage.getFreeTrialDb(orderIdResult.orderId);
    if (trial) {
      // If by_ prefix is explicitly used, trust it and resend buyer templates
      // even if phone number doesn't match (buyer might be using different number)
      const phoneMatches = trial.customerPhone === fromNumber;
      if (!phoneMatches) {
        console.warn(
          "Buyer message with by_ prefix but phone number mismatch:",
          {
            trialId: trial.id,
            fromNumber,
            expectedCustomerPhone: trial.customerPhone,
            orderId: orderIdResult.orderId,
          },
        );
      }
      // Resend buyer onboarding templates regardless of phone match
      // The by_ prefix is explicit enough to trust the sender is the buyer
      console.log("Detected buyer message requesting confirmation resend:", {
        trialId: trial.id,
        fromNumber,
        orderId: orderIdResult.orderId,
        phoneMatches,
      });
      await resendBuyerOnboardingTemplates(trial, fromNumber);
      return;
    }
  }

  // Resolve which trial to use (normal flow)
  const trial = await resolveTrial(messageText || interactiveText, fromNumber);

  if (!trial) {
    await handleNoTrialFound(
      fromNumber,
      messageText || interactiveText,
      messageType,
    );
    return;
  }
  console.log("Processing message for trial:", {
    trialId: trial.id,
    storytellerName: trial.storytellerName,
    conversationState: trial.conversationState,
    messageType,
    hasOrderId: !!orderIdResult.orderId,
    orderIdSource: orderIdResult.source,
    interactiveText,
    fromNumber,
    isBuyer: trial.customerPhone === fromNumber,
  });

  // Check for multiple active trials scenario
  // Only check if no order ID was provided (order ID takes priority)
  const orderId = orderIdResult.orderId;
  if (!orderId) {
    const allActiveTrials =
      await storage.getAllActiveTrialsByStorytellerPhone(fromNumber);
    if (
      allActiveTrials.length > 1 &&
      trial.conversationState === "in_progress" &&
      trial.id === allActiveTrials[0].id
    ) {
      console.log("Multiple active trials detected, handling special case:", {
        totalTrials: allActiveTrials.length,
        oldestTrialId: trial.id,
        oldestTrialState: trial.conversationState,
      });
      await handleMultipleActiveTrials(trial, fromNumber);
      return;
    }
  }

  // Route to appropriate handler based on conversation state
  switch (trial.conversationState) {
    case "awaiting_initial_contact":
      await handleInitialContact(trial, fromNumber);
      break;

    case "awaiting_readiness":
      if (
        messageType === "text" ||
        messageType === "interactive" ||
        messageType === "button"
      ) {
        const responseText =
          messageType === "button" || messageType === "interactive"
            ? interactiveText
            : messageText;
        console.log("Calling handleReadinessResponse:", {
          trialId: trial.id,
          fromNumber,
          responseText,
          messageType,
        });
        await handleReadinessResponse(trial, fromNumber, responseText);
        console.log("handleReadinessResponse completed for trial:", trial.id);
      } else {
        console.log(
          "Message type not handled in awaiting_readiness:",
          messageType,
        );
      }
      break;

    case "in_progress":
      if (messageType === "audio") {
        await handleVoiceNote(trial, fromNumber, message);
      } else if (messageType === "text") {
        await handleInProgressTextMessage(trial, fromNumber, messageText);
      } else if (messageType === "button" || messageType === "interactive") {
        // Handle button clicks during in_progress - treat as text message
        // This can happen if user clicks a button after state has changed
        console.log(
          "Received button/interactive message in in_progress state, treating as text:",
          {
            trialId: trial.id,
            messageType,
            interactiveText,
            currentQuestionIndex: trial.currentQuestionIndex,
          },
        );
        const responseText =
          messageType === "button" || messageType === "interactive"
            ? interactiveText
            : messageText;
        await handleInProgressTextMessage(trial, fromNumber, responseText);
      } else {
        console.log(
          "Unhandled message type in in_progress state:",
          messageType,
          {
            trialId: trial.id,
            fromNumber,
          },
        );
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
    trial.storytellerLanguagePreference,
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await askReadiness(trial, fromNumber);

  await storage.updateFreeTrialDb(trial.id, {
    conversationState: "awaiting_readiness",
    welcomeSentAt: new Date(),
    readinessAskedAt: new Date(),
  });
}

export async function askReadiness(
  trial: any,
  fromNumber: string,
): Promise<void> {
  await sendReadinessCheck(
    fromNumber,
    trial.storytellerName,
    trial.storytellerLanguagePreference,
  );

  // Set retryReadinessAt if not already set (for initial readiness checks)
  // This ensures ignored readiness checks get retried after 8 hours
  const retryReadinessAt = trial.retryReadinessAt
    ? undefined
    : new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours from now

  await storage.updateFreeTrialDb(trial.id, {
    readinessAskedAt: new Date(),
    ...(retryReadinessAt && { retryReadinessAt }),
    ...(trial.retryCount === null || trial.retryCount === undefined
      ? { retryCount: 0 }
      : {}),
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

  console.log(
    "Normalized response:",
    normalizedResponse,
    "original:",
    response,
  );

  // Handle button responses from template (exact matches)
  // Include both English and Hindi button texts
  const yesButtonPatterns = [
    "yes, let's begin",
    "yes let's begin",
    "yes, lets begin",
    "yes lets begin",
    "yes let's begin",
    "yes, let us begin",
    "हाँ, शुरू करते हैं", // Hindi button text
    "हाँ शुरू करते हैं", // Hindi without comma
  ];
  const maybeButtonPatterns = [
    "maybe later",
    "थोड़ी देर में", // Hindi button text
  ];

  // Normalize patterns too
  const normalizedYesPatterns = yesButtonPatterns.map((p) =>
    p.toLowerCase().replace(/[''`]/g, "'").replace(/[–—]/g, "-"),
  );
  const normalizedMaybePatterns = maybeButtonPatterns.map((p) =>
    p.toLowerCase().replace(/[''`]/g, "'").replace(/[–—]/g, "-"),
  );

  // Check for button responses first (exact match)
  const isYesButton = normalizedYesPatterns.some(
    (pattern) => normalizedResponse === pattern,
  );
  const isMaybeButton = normalizedMaybePatterns.some(
    (pattern) => normalizedResponse === pattern,
  );

  console.log("Button pattern matching:", {
    isYesButton,
    isMaybeButton,
    normalizedResponse,
    matchedPattern: isYesButton
      ? yesButtonPatterns.find((p) => normalizedResponse === p.toLowerCase())
      : null,
  });

  // Fallback to text patterns (for non-production or manual text responses)
  // Include Hindi keywords
  const yesPatterns = [
    "yes",
    "yeah",
    "yep",
    "sure",
    "ready",
    "ok",
    "okay",
    "begin",
    "शुरू",
    "हाँ",
    "हां",
    "ठीक",
    "तैयार",
    "हाँ, शुरू करते हैं", // Hindi keywords
  ];
  const maybePatterns = [
    "not sure",
    "maybe later",
    "later",
    "wait",
    "देर",
    "बाद में",
    "थोड़ी", // Hindi keywords
  ];

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
    const retryAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

    await storage.updateFreeTrialDb(trial.id, {
      lastReadinessResponse: "maybe",
      retryReadinessAt: retryAt,
      retryCount: 0, // Reset retry count for new readiness check
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

async function getNextUnansweredQuestion(trial: any): Promise<number | null> {
  console.log("getNextUnansweredQuestion called:", {
    trialId: trial.id,
    currentQuestionIndex: trial.currentQuestionIndex,
  });

  // Get all voice notes for this trial
  const voiceNotes = await storage.getVoiceNotesByTrialId(trial.id);
  const answeredQuestionIndices = new Set(
    voiceNotes.map((note) => note.questionIndex),
  );

  console.log(
    "Answered question indices:",
    Array.from(answeredQuestionIndices),
  );

  // Get total questions count
  const totalQuestions = await storage.getTotalQuestionsForAlbum(
    trial.selectedAlbum,
    trial.storytellerLanguagePreference,
  );

  console.log("Total questions:", totalQuestions);

  // Starting from currentQuestionIndex, find the first unanswered question
  const startIndex = trial.currentQuestionIndex ?? 0;
  for (let i = startIndex; i < totalQuestions; i++) {
    if (!answeredQuestionIndices.has(i)) {
      console.log("Found unanswered question at index:", i);
      return i;
    }
  }

  // All questions from currentQuestionIndex onwards are answered
  console.log("All questions from index", startIndex, "are answered");
  return null;
}

async function sendFirstQuestion(
  trial: any,
  fromNumber: string,
): Promise<void> {
  const questionIndex = 0;
  await sendQuestion(trial, fromNumber, questionIndex);
}

export async function sendQuestion(
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

  console.log(
    "Fetching question with targetQuestionIndex:",
    targetQuestionIndex,
  );
  const question = await storage.getQuestionByIndex(
    trial.selectedAlbum,
    targetQuestionIndex,
    trial.storytellerLanguagePreference,
  );

  if (!question) {
    console.error(
      "No question found for album:",
      trial.selectedAlbum,
      "index:",
      targetQuestionIndex,
    );
    return;
  }

  console.log("Question retrieved:", {
    questionIndex: targetQuestionIndex,
    questionLength: question.length,
    questionPreview: question.substring(0, 50) + "...",
  });

  const questionMessage = getLocalizedMessage(
    "questionMessage",
    trial.storytellerLanguagePreference,
    {
      name: trial.storytellerName,
      question: question,
    },
  );

  console.log("Sending question message to:", fromNumber);
  const messageSent = await sendTextMessageWithRetry(
    fromNumber,
    questionMessage,
  );
  console.log("Question message send result:", messageSent);

  // Send photo request to buyer if image not uploaded yet and after 2 questions have been answered
  // (targetQuestionIndex >= 2 means we're sending the 3rd question, so 2 have been answered)
  if (
    trial.customerPhone &&
    !trial.customCoverImageUrl &&
    targetQuestionIndex >= 2
  ) {
    console.log("Sending photo request to buyer:", {
      buyerPhone: trial.customerPhone,
      buyerName: trial.buyerName,
      storytellerName: trial.storytellerName,
      questionIndex: targetQuestionIndex,
      trialId: trial.id,
    });
    await sendPhotoRequestToBuyer(
      trial.customerPhone,
      trial.buyerName,
      trial.storytellerName,
      trial.id,
    ).catch((error) => {
      console.error("Failed to send photo request to buyer:", error);
    });
  }

  await storage.updateFreeTrialDb(trial.id, {
    currentQuestionIndex: targetQuestionIndex,
    lastQuestionSentAt: new Date(),
    nextQuestionScheduledFor: null,
    questionReminderCount: 0, // Reset reminder count for new question
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
    trial.storytellerLanguagePreference,
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

  // Get album info to check if it's conversational
  let album = await storage.getAlbumByTitle(trial.selectedAlbum);
  if (!album) {
    album = await storage.getAlbumById(trial.selectedAlbum);
  }

  const isConversationalAlbum = album?.isConversationalAlbum === true;

  let totalQuestions = 0;
  if (album) {
    if (
      trial.storytellerLanguagePreference === "hn" &&
      album.questionsHn &&
      album.questionsHn.length > 0
    ) {
      totalQuestions = album.questionsHn.length;
    } else if (album.questions) {
      totalQuestions = album.questions.length;
    }
  }

  const nextQuestionIndex = trial.currentQuestionIndex + 1;

  if (nextQuestionIndex >= totalQuestions) {
    // All questions completed
    await storage.updateFreeTrialDb(trial.id, {
      conversationState: "completed",
      nextQuestionScheduledFor: null,
      reminderSentAt: null,
      questionReminderCount: 0, // Reset reminder count
    });

    const { sendStorytellerCompletionMessages, sendBuyerCompletionMessage } =
      await import("./whatsapp");

    // Send to storyteller
    await sendStorytellerCompletionMessages(
      fromNumber,
      trial.storytellerName,
      trial.id,
      trial.storytellerLanguagePreference,
    );

    // Send to buyer if phone number exists
    if (trial.customerPhone) {
      await sendBuyerCompletionMessage(
        trial.customerPhone,
        trial.buyerName,
        trial.storytellerName,
        trial.id,
        trial.storytellerLanguagePreference,
      );
    }
  } else if (isConversationalAlbum) {
    // Conversational album: handle batch flow
    const batchPosition = trial.currentQuestionIndex % 3; // 0 = 1st in batch, 1 = 2nd in batch, 2 = 3rd in batch

    if (batchPosition === 0 || batchPosition === 1) {
      // 1st or 2nd question in batch: send intermediate ack and next question immediately
      const questionNumber = batchPosition === 0 ? 1 : 2;
      await sendIntermediateAcknowledgment(
        fromNumber,
        trial.storytellerName,
        questionNumber as 1 | 2,
        trial.storytellerLanguagePreference,
      );

      // Check if there are more questions before sending next one
      if (nextQuestionIndex < totalQuestions) {
        // Update currentQuestionIndex first, then send next question immediately
        const updatedTrial = await storage.updateFreeTrialDb(trial.id, {
          currentQuestionIndex: nextQuestionIndex,
          reminderSentAt: null,
          questionReminderCount: 0, // Reset reminder count
          nextQuestionScheduledFor: null, // Don't schedule, send immediately
        });

        // Send next question immediately with updated trial
        await sendQuestion(updatedTrial, fromNumber, nextQuestionIndex);
      } else {
        // No more questions - this shouldn't happen as we check above, but handle gracefully
        console.warn(
          "Attempted to send next question in batch but no more questions remaining:",
          {
            trialId: trial.id,
            currentQuestionIndex: trial.currentQuestionIndex,
            nextQuestionIndex,
            totalQuestions,
          },
        );
      }
    } else {
      // 3rd question in batch: send full ack and schedule next batch after 23 hours
      await sendVoiceNoteAcknowledgment(
        fromNumber,
        trial.storytellerName,
        trial.storytellerLanguagePreference,
      );

      const isProduction = true;
      if (isProduction) {
        const now = new Date();
        const nextQuestionScheduledFor = new Date(
          now.getTime() + 23 * 60 * 60 * 1000,
        ); // 23 hours from now

        await storage.updateFreeTrialDb(trial.id, {
          currentQuestionIndex: nextQuestionIndex,
          conversationState: "in_progress", // Keep as in_progress so scheduler picks it up
          nextQuestionScheduledFor,
          reminderSentAt: null,
          questionReminderCount: 0, // Reset reminder count since question was answered
        });

        console.log(
          "Scheduled next batch for conversational album after 23 hours:",
          nextQuestionScheduledFor,
          "for trial:",
          trial.id,
        );
      } else {
        // In non-production: schedule next question immediately (2 seconds)
        const now = new Date();
        const nextQuestionScheduledFor = new Date(now.getTime() + 2000);

        await storage.updateFreeTrialDb(trial.id, {
          currentQuestionIndex: nextQuestionIndex,
          nextQuestionScheduledFor,
          reminderSentAt: null,
          questionReminderCount: 0, // Reset reminder count since question was answered
        });
      }
    }
  } else {
    // Non-conversational album: existing flow
    await sendVoiceNoteAcknowledgment(
      fromNumber,
      trial.storytellerName,
      trial.storytellerLanguagePreference,
    );

    // const isProduction = process.env.NODE_ENV === "production";
    const isProduction = true;

    if (isProduction) {
      // In production: schedule readiness check for 23 hours from now
      const now = new Date();
      const nextQuestionScheduledFor = new Date(
        now.getTime() + 23 * 60 * 60 * 1000,
      ); // 23 hours from now

      await storage.updateFreeTrialDb(trial.id, {
        currentQuestionIndex: nextQuestionIndex,
        conversationState: "in_progress", // Keep as in_progress so scheduler picks it up
        nextQuestionScheduledFor,
        reminderSentAt: null,
        questionReminderCount: 0, // Reset reminder count since question was answered
      });

      console.log(
        "Scheduled readiness check for 23 hours from now:",
        nextQuestionScheduledFor,
        "for trial:",
        trial.id,
      );
    } else {
      // In non-production: schedule next question immediately (2 seconds)
      const now = new Date();
      const nextQuestionScheduledFor = new Date(now.getTime() + 2000);

      await storage.updateFreeTrialDb(trial.id, {
        currentQuestionIndex: nextQuestionIndex,
        nextQuestionScheduledFor,
        reminderSentAt: null,
        questionReminderCount: 0, // Reset reminder count since question was answered
      });
    }
  }
}

/**
 * Converts an audio buffer to MP3 format with 96kbps compression
 * @param buffer - The input audio buffer
 * @param inputMimeType - The MIME type of the input audio
 * @returns Promise<Buffer> - The converted MP3 buffer, or original buffer if conversion fails
 */
export async function convertToMp3(
  buffer: Buffer,
  inputMimeType: string,
): Promise<Buffer> {
  const originalSize = buffer.length;

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const inputStream = Readable.from(buffer);

    // Determine input format from MIME type
    let inputFormat = "ogg"; // default
    if (inputMimeType.includes("ogg")) {
      inputFormat = "ogg";
    } else if (inputMimeType.includes("m4a")) {
      inputFormat = "m4a";
    } else if (inputMimeType.includes("mp3")) {
      inputFormat = "mp3";
    } else if (inputMimeType.includes("aac")) {
      inputFormat = "aac";
    }

    const command = ffmpeg(inputStream)
      .inputFormat(inputFormat)
      .audioCodec("libmp3lame")
      .audioBitrate(16)
      .format("mp3")
      .on("error", (err) => {
        console.error("Error converting audio to MP3:", err);
        console.log("Falling back to original format");
        resolve(buffer); // Fallback to original buffer
      })
      .on("end", () => {
        if (chunks.length === 0) {
          console.error(
            "No data received from conversion, falling back to original",
          );
          resolve(buffer);
          return;
        }

        const convertedBuffer = Buffer.concat(chunks);
        const compressedSize = convertedBuffer.length;
        const compressionRatio = (
          ((originalSize - compressedSize) / originalSize) *
          100
        ).toFixed(2);

        console.log("Audio conversion completed:", {
          originalSize,
          compressedSize,
          compressionRatio: `${compressionRatio}%`,
          inputFormat,
        });

        resolve(convertedBuffer);
      });

    const outputStream = command.pipe();

    outputStream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    outputStream.on("error", (err) => {
      console.error("Error in conversion stream:", err);
      resolve(buffer); // Fallback to original buffer
    });

    outputStream.on("end", () => {
      // Stream ended, but we'll handle in command's 'end' event
    });
  });
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

    // Step 4: Convert to MP3 format with compression
    console.log("Converting voice note to MP3 format:", {
      voiceNoteId,
      originalMimeType: finalMimeType,
      originalSize: fileBuffer.length,
    });

    const mp3Buffer = await convertToMp3(fileBuffer, finalMimeType);
    const finalMp3MimeType = "audio/mp3";

    // Step 5: Upload to Cloudflare R2 Storage
    const r2Url = await uploadVoiceNoteToR2(
      mp3Buffer,
      voiceNoteId,
      finalMp3MimeType,
    );

    if (!r2Url) {
      console.error(
        "Failed to upload voice note to Cloudflare R2 Storage:",
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

    // Step 6: Update database with R2 URL and metadata
    // All files are now converted to MP3 format
    const fileExtension = "mp3";

    await storage.updateVoiceNote(voiceNoteId, {
      mediaUrl: r2Url, // Store R2 URL instead of temporary WhatsApp URL
      localFilePath: `${voiceNoteId}.${fileExtension}`, // Store file path
      mimeType: finalMp3MimeType, // Store MP3 MIME type
      mediaSha256: mediaInfo.sha256,
      sizeBytes: mp3Buffer.length, // Store compressed file size
      downloadStatus: "completed",
    });

    console.log(
      "Voice note downloaded, converted to MP3, and uploaded to R2:",
      {
        voiceNoteId,
        mediaId,
        r2Url,
        originalSize: mediaInfo.fileSize,
        compressedSize: mp3Buffer.length,
      },
    );
  } catch (error) {
    console.error("Error downloading and storing voice note:", error);
    await storage.updateVoiceNote(voiceNoteId, {
      downloadStatus: "failed",
    });
  }
}

async function handleBuyerImageMessage(
  trial: any,
  fromNumber: string,
  message: WhatsAppMessage,
): Promise<void> {
  if (!message.image || !message.image.id) {
    console.error("Invalid image message - missing image data");
    return;
  }

  const imageId = message.image.id;
  const mimeType = message.image.mime_type || "image/jpeg";

  console.log("Processing buyer image message:", {
    trialId: trial.id,
    buyerPhone: fromNumber,
    imageId,
    mimeType,
  });

  try {
    // Step 1: Get media info (URL) from WhatsApp
    console.log("Step 1: Getting media info from WhatsApp for image:", imageId);
    const mediaInfo = await downloadVoiceNoteMedia(imageId); // Reuse same function for images

    if (!mediaInfo) {
      console.error("Failed to get media info for image:", imageId);
      await sendTextMessageWithRetry(
        fromNumber,
        "Sorry, I couldn't download your image. Could you please try sending it again? 📸",
      );
      return;
    }

    console.log("Retrieved media info for image:", {
      mediaId: imageId,
      mimeType: mediaInfo.mimeType,
      fileSize: mediaInfo.fileSize,
      url: mediaInfo.url,
      sha256: mediaInfo.sha256,
    });

    // Step 2: Download the actual file from WhatsApp
    console.log("Step 2: Downloading image file from WhatsApp...");
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("WhatsApp access token not available for downloading file");
      await sendTextMessageWithRetry(
        fromNumber,
        "Sorry, there was an issue processing your image. Please try again later. 📸",
      );
      return;
    }

    console.log(
      "Access token available, downloading file from URL:",
      mediaInfo.url,
    );
    const fileBuffer = await downloadMediaFile(mediaInfo.url, accessToken);

    if (!fileBuffer) {
      console.error("Failed to download image file:", imageId);
      await sendTextMessageWithRetry(
        fromNumber,
        "Sorry, I couldn't download your image. Could you please try sending it again? 📸",
      );
      return;
    }

    console.log(
      "Image file downloaded successfully, size:",
      fileBuffer.length,
      "bytes",
    );

    // Step 3: Compress image before upload
    console.log("Step 3: Compressing image...");
    const { compressImage } = await import("./supabase");
    const finalMimeType = mediaInfo.mimeType || mimeType || "image/jpeg";
    const { buffer: compressedBuffer, mimeType: compressedMimeType } =
      await compressImage(fileBuffer, finalMimeType);

    // Step 4: Upload compressed image to Cloudflare R2 Storage
    console.log(
      "Step 4: Uploading compressed image to Cloudflare R2 Storage...",
    );
    const r2Url = await uploadImageToR2(
      compressedBuffer,
      trial.id,
      compressedMimeType,
    );

    if (!r2Url) {
      console.error(
        "Failed to upload image to Cloudflare R2 Storage:",
        trial.id,
      );
      await sendTextMessageWithRetry(
        fromNumber,
        "Sorry, there was an issue saving your image. Please try again later. 📸",
      );
      return;
    }

    console.log("Image uploaded to R2 successfully, URL:", r2Url);

    // Step 5: Update database with R2 URL
    console.log("Step 5: Updating database with image URL...");
    await storage.updateFreeTrialDb(trial.id, {
      customCoverImageUrl: r2Url,
    });

    console.log("Image uploaded and saved:", {
      trialId: trial.id,
      imageId,
      r2Url,
    });

    // Step 6: Send cute acknowledgment message with emojis
    console.log("Step 6: Sending acknowledgment message to buyer...");
    const acknowledgmentMessage = `Perfect! Thank you so much for the beautiful photo! 📸✨\n\nI've saved it and it will be used as the cover for ${trial.storytellerName}'s album. It's going to look amazing! 🎨💫\n\nYour album is coming together beautifully! ❤️`;

    await sendTextMessageWithRetry(fromNumber, acknowledgmentMessage);
    console.log(
      "Acknowledgment message sent successfully to buyer:",
      fromNumber,
    );
  } catch (error) {
    console.error("Error processing buyer image message:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      trialId: trial.id,
      imageId,
      fromNumber,
    });
    await sendTextMessageWithRetry(
      fromNumber,
      "Sorry, there was an issue processing your image. Please try again later. 📸",
    );
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

    const nextRetryAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

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
