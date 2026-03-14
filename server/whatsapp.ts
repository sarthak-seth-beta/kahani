import axios from "axios";
import {
  logOutgoingMessage,
  updateMessageWithResponse,
} from "./whatsappLogger";
import { storage } from "./storage";

const WHATSAPP_API_VERSION = "v22.0";
const WHATSAPP_BASE_URL = "https://graph.facebook.com";

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

function getConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn(
      "WhatsApp credentials not configured. Skipping WhatsApp message.",
    );
    return null;
  }

  return { phoneNumberId, accessToken };
}

/**
 * Get the WhatsApp business phone number (from field)
 */
function getBusinessPhoneNumber(): string {
  return (
    process.env.WHATSAPP_BUSINESS_NUMBER_E164 ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    "unknown"
  );
}

export async function sendTemplateMessage(
  recipientNumber: string,
  templateName: string = "hello_world",
  languageCode: string = "en",
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  const { phoneNumberId, accessToken } = config;
  const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: recipientNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("WhatsApp template message sent:", {
      to: recipientNumber,
      messageId: response.data.messages?.[0]?.id,
      template: templateName,
    });

    return true;
  } catch (error: any) {
    console.error("Failed to send WhatsApp message:", {
      error: error.response?.data || error.message,
      to: recipientNumber,
      template: templateName,
    });
    return false;
  }
}

export async function sendTextMessage(
  recipientNumber: string,
  messageText: string,
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  const { phoneNumberId, accessToken } = config;
  const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: recipientNumber,
    type: "text",
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("WhatsApp text message sent:", {
      to: recipientNumber,
      messageId: response.data.messages?.[0]?.id,
    });

    return true;
  } catch (error: any) {
    console.error("Failed to send WhatsApp text message:", {
      error: error.response?.data || error.message,
      to: recipientNumber,
    });
    return false;
  }
}

export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  // If number already has country code (length >= 11), return as-is
  // E.164 format: country code (1-3 digits) + subscriber number (up to 12 digits)
  // Minimum valid international number is 11 digits (1-digit country + 10-digit number)
  if (cleaned.length >= 11) {
    return cleaned;
  }

  // For numbers without country code, we can't safely assume the country
  // Return as-is and let validation catch invalid numbers
  // Note: This might break existing code that relies on Indian number assumption
  return "91" + cleaned;
}

export function validateE164(phone: string): boolean {
  const e164Regex = /^\d{10,15}$/;
  return e164Regex.test(phone);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;

      console.log(`Retry attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
        status,
        errorMessage: error.message,
        errorType: error.constructor?.name,
        isAxiosError: error.isAxiosError,
        responseData: error.response?.data,
      });

      if (status === 429 || (status >= 500 && status < 600)) {
        if (attempt < maxRetries) {
          const delayMs = initialDelayMs * Math.pow(2, attempt);
          console.log(
            `Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`,
          );
          await sleep(delayMs);
          continue;
        }
      }

      // For non-retryable errors, log and throw immediately
      console.log("Non-retryable error, throwing:", {
        status,
        errorMessage: error.message,
        responseData: error.response?.data,
      });
      throw error;
    }
  }

  throw lastError;
}

/**
 * Extracts language code from template name and returns the base template name
 * Templates ending with _hn use Hindi (hi - WhatsApp's ISO 639-1 code), _en use English (en), default to English
 * Returns: { baseName: string, languageCode: string }
 */
function parseTemplateName(templateName: string): {
  baseName: string;
  languageCode: string;
} {
  if (templateName.endsWith("_hn")) {
    return {
      baseName: templateName,
      languageCode: "hi", // WhatsApp uses "hi" (ISO 639-1) for Hindi, not "hn"
    };
  }
  if (templateName.endsWith("_en")) {
    return {
      baseName: templateName,
      languageCode: "en",
    };
  }
  // Default to English if no suffix
  return {
    baseName: templateName,
    languageCode: "en",
  };
}

export async function sendTemplateMessageWithRetry(
  recipientNumber: string,
  templateName: string,
  templateParams: any[] = [],
  options?: {
    messageType?: string;
    orderId?: string;
  },
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  if (!validateE164(recipientNumber)) {
    console.error("Invalid E.164 phone number:", recipientNumber);
    return false;
  }

  const { phoneNumberId, accessToken } = config;
  const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  // Parse template name to extract base name and language code
  // Template names like "introtostoryteller_vaani_hn" become:
  // - baseName: "introtostoryteller_vaani"
  // - languageCode: "hn"
  const { baseName, languageCode } = parseTemplateName(templateName);

  console.log("Sending WhatsApp template:", {
    originalTemplateName: templateName,
    baseTemplateName: baseName,
    languageCode,
    recipientNumber,
  });

  const payload: any = {
    messaging_product: "whatsapp",
    to: recipientNumber,
    type: "template",
    template: {
      name: baseName,
      language: {
        code: languageCode,
      },
    },
  };

  if (templateParams.length > 0) {
    payload.template.components = [
      {
        type: "body",
        parameters: templateParams,
      },
    ];
  }

  // Log outgoing message before API call
  const logId = await logOutgoingMessage({
    from: getBusinessPhoneNumber(),
    to: recipientNumber,
    orderId: options?.orderId || null,
    messageTemplate: templateName,
    messageType: options?.messageType || "template",
    messageCategory: "template",
    messagePayload: payload,
    status: "queued",
  });

  try {
    const response = await retryWithBackoff(async () => {
      return await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
    });

    const messageId = response.data.messages?.[0]?.id;
    const responseStatus = response.data.messages?.[0]?.message_status;

    console.log("WhatsApp template message sent:", {
      to: recipientNumber,
      messageId,
      status: responseStatus,
      template: templateName,
      fullResponse: JSON.stringify(response.data),
    });

    // Update log with message_id and status
    if (logId) {
      await updateMessageWithResponse(
        logId,
        messageId || null,
        responseStatus === "ACCEPTED" ? "sent" : "failed",
      );
    }

    // Check for warnings or errors in the response
    if (response.data.errors) {
      console.warn("WhatsApp API returned errors:", response.data.errors);
    }
    if (response.data.meta) {
      console.log("WhatsApp API meta:", response.data.meta);
    }

    return true;
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error("Failed to send WhatsApp template message after retries:", {
      error: errorDetails,
      to: recipientNumber,
      template: templateName,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
    });

    // Update log with error status
    if (logId) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error";
      await updateMessageWithResponse(logId, null, "failed", errorMessage);
    }

    // Log specific WhatsApp API error codes
    if (error.response?.data?.error) {
      const whatsappError = error.response.data.error;
      console.error("WhatsApp API Error Details:", {
        code: whatsappError.code,
        message: whatsappError.message,
        type: whatsappError.type,
        error_subcode: whatsappError.error_subcode,
        fbtrace_id: whatsappError.fbtrace_id,
      });
    }

    return false;
  }
}

export async function sendTextMessageWithRetry(
  recipientNumber: string,
  messageText: string,
  options?: {
    messageType?: string;
    orderId?: string;
  },
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  if (!validateE164(recipientNumber)) {
    console.error("Invalid E.164 phone number:", recipientNumber);
    return false;
  }

  const { phoneNumberId, accessToken } = config;
  const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: recipientNumber,
    type: "text",
    text: {
      preview_url: true,
      body: messageText,
    },
  };

  // Log outgoing message before API call
  const logId = await logOutgoingMessage({
    from: getBusinessPhoneNumber(),
    to: recipientNumber,
    orderId: options?.orderId || null,
    messageTemplate: null,
    messageType: options?.messageType || "text",
    messageCategory: "text",
    messagePayload: payload,
    status: "queued",
  });

  try {
    const response = await retryWithBackoff(async () => {
      return await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
    });

    const messageId = response.data.messages?.[0]?.id;
    const responseStatus = response.data.messages?.[0]?.message_status;

    console.log("WhatsApp text message sent:", {
      to: recipientNumber,
      messageId,
      status: responseStatus,
      fullResponse: response.data,
    });

    // Update log with message_id and status
    if (logId) {
      await updateMessageWithResponse(
        logId,
        messageId || null,
        responseStatus === "ACCEPTED" ? "sent" : "failed",
      );
    }

    // Check for warnings or errors in the response
    if (response.data.errors) {
      console.warn("WhatsApp API returned errors:", response.data.errors);
    }
    if (response.data.meta) {
      console.log("WhatsApp API meta:", response.data.meta);
    }

    return true;
  } catch (error: any) {
    // Log comprehensive error details
    const errorDetails = error.response?.data || error.message || error;
    const errorInfo: any = {
      error: errorDetails,
      to: recipientNumber,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
    };

    // Add more error context
    if (error.code) errorInfo.errorCode = error.code;
    if (error.message) errorInfo.errorMessage = error.message;
    if (error.stack) errorInfo.stack = error.stack;
    if (error.response?.data) errorInfo.responseData = error.response.data;
    if (error.config?.url) errorInfo.requestUrl = error.config.url;
    if (error.config?.method) errorInfo.requestMethod = error.config.method;

    console.error(
      "Failed to send WhatsApp text message after retries:",
      errorInfo,
    );

    // Update log with error status
    if (logId) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error";
      await updateMessageWithResponse(logId, null, "failed", errorMessage);
    }

    // Log specific WhatsApp API error codes
    if (error.response?.data?.error) {
      const whatsappError = error.response.data.error;
      console.error("WhatsApp API Error Details:", {
        code: whatsappError.code,
        message: whatsappError.message,
        type: whatsappError.type,
        error_subcode: whatsappError.error_subcode,
        fbtrace_id: whatsappError.fbtrace_id,
        error_data: whatsappError.error_data,
      });
    } else if (error.response?.data) {
      // Log the full response data if it's not in the standard error format
      console.error(
        "WhatsApp API Response Data:",
        JSON.stringify(error.response.data, null, 2),
      );
    }

    return false;
  }
}

export async function sendInteractiveMessageWithCTA(
  recipientNumber: string,
  messageText: string,
  buttonTitle: string,
  buttonUrl: string,
  options?: {
    messageType?: string;
    orderId?: string;
  },
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  if (!validateE164(recipientNumber)) {
    console.error("Invalid E.164 phone number:", recipientNumber);
    return false;
  }

  const { phoneNumberId, accessToken } = config;
  const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: recipientNumber,
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: {
        text: messageText,
      },
      action: {
        name: "cta_url",
        parameters: {
          display_text: buttonTitle,
          url: buttonUrl,
        },
      },
    },
  };

  // Log outgoing message before API call
  const logId = await logOutgoingMessage({
    from: getBusinessPhoneNumber(),
    to: recipientNumber,
    orderId: options?.orderId || null,
    messageTemplate: null,
    messageType: options?.messageType || "interactive",
    messageCategory: "interactive",
    messagePayload: payload,
    status: "queued",
  });

  try {
    const response = await retryWithBackoff(async () => {
      return await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
    });

    const messageId = response.data.messages?.[0]?.id;
    const responseStatus = response.data.messages?.[0]?.message_status;

    console.log("WhatsApp interactive message sent:", {
      to: recipientNumber,
      messageId,
      status: responseStatus,
      buttonTitle,
      buttonUrl,
      fullResponse: response.data,
    });

    // Update log with message_id and status
    if (logId) {
      await updateMessageWithResponse(
        logId,
        messageId || null,
        responseStatus === "ACCEPTED" ? "sent" : "failed",
      );
    }

    // Check for warnings or errors in the response
    if (response.data.errors) {
      console.warn("WhatsApp API returned errors:", response.data.errors);
    }
    if (response.data.meta) {
      console.log("WhatsApp API meta:", response.data.meta);
    }

    return true;
  } catch (error: any) {
    // Log comprehensive error details
    const errorDetails = error.response?.data || error.message || error;
    const errorInfo: any = {
      error: errorDetails,
      to: recipientNumber,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      buttonTitle,
      buttonUrl,
    };

    // Add more error context
    if (error.code) errorInfo.errorCode = error.code;
    if (error.message) errorInfo.errorMessage = error.message;
    if (error.stack) errorInfo.stack = error.stack;
    if (error.response?.data) errorInfo.responseData = error.response.data;
    if (error.config?.url) errorInfo.requestUrl = error.config.url;
    if (error.config?.method) errorInfo.requestMethod = error.config.method;

    console.error(
      "Failed to send WhatsApp interactive message after retries:",
      errorInfo,
    );

    // Update log with error status
    if (logId) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error";
      await updateMessageWithResponse(logId, null, "failed", errorMessage);
    }

    // Log specific WhatsApp API error codes
    if (error.response?.data?.error) {
      const whatsappError = error.response.data.error;
      console.error("WhatsApp API Error Details:", {
        code: whatsappError.code,
        message: whatsappError.message,
        type: whatsappError.type,
        error_subcode: whatsappError.error_subcode,
        fbtrace_id: whatsappError.fbtrace_id,
        error_data: whatsappError.error_data,
      });
    } else if (error.response?.data) {
      // Log the full response data if it's not in the standard error format
      console.error(
        "WhatsApp API Response Data:",
        JSON.stringify(error.response.data, null, 2),
      );
    }

    return false;
  }
}

/**
 * Helper function to get language suffix based on storyteller preference
 * Returns '_en' or '_hn' based on preference, defaults to '_en' if null
 */
export function getStorytellerLanguageSuffix(
  languagePreference: string | null | undefined,
): string {
  return languagePreference === "hn" ? "_hn" : "_en";
}

/**
 * Helper function to get localized message based on language preference
 * Returns English or Hindi text based on preference
 */
export function getLocalizedMessage(
  messageKey: string,
  language: string | null | undefined,
  params?: Record<string, string>,
): string {
  const isHindi = language === "hn";

  // Message translations map
  type MessageConfig =
    | { en: string; hn: string }
    | {
        en: (name: string, question?: string) => string;
        hn: (name: string, question?: string) => string;
      }
    | {
        en: (buyerName: string, storytellerName: string) => string;
        hn: (buyerName: string, storytellerName: string) => string;
      }
    | {
        en: (storytellerName: string, buyerName: string) => string;
        hn: (storytellerName: string, buyerName: string) => string;
      };

  const messages: Record<string, MessageConfig> = {
    noTrialFound: {
      en: "Hi! I'm Vaani from Kahani 🌸 \n\n It looks like you haven't started a story collection yet.\n\nTo get started, please ask the person who wants to preserve your stories to create a free trial and share the link with you. \n\nOnce you click that link, we can begin your storytelling journey!",
      hn: "नमस्ते! मैं कहानी से वाणी हूँ 🌸 \n\n ऐसा लगता है कि आपने अभी तक एक कहानी संग्रह शुरू नहीं किया है \n\n शुरू करने के लिए, कृपया उस व्यक्ति से पूछें जो आपकी कहानियों को संरक्षित करना चाहता है कि वे एक निःशुल्क परीक्षण बनाएं और आपके साथ लिंक साझा करें। \n\n एक बार जब आप उस लिंक पर क्लिक करेंगे, तो हम आपकी कहानी सुनाने की यात्रा शुरू कर सकेंगे!",
    },
    foundStoryCollection: {
      en: `Great! I found your story collection. Your kahani is in progress.`,
      hn: `बहुत बढ़िया! मैंने आपका कहानी संग्रह ढूंढ लिया है। आपका कहानी अभी चल रहा है।`,
    },
    sendVoiceNoteReminder: {
      en: "Please send a voice note to answer the question. I'll be waiting to hear your story!",
      hn: "कृपया प्रश्न का उत्तर देने के लिए एक वॉइस नोट भेजें। मैं आपकी कहानी सुनने का इंतज़ार कर रही हूँ!",
    },
    completedAllQuestions: {
      en: (name: string) =>
        `Thank you ${name}! You've completed all the questions. Your stories will be compiled into a beautiful book for your family.`,
      hn: (name: string) =>
        `धन्यवाद ${name}! आपने सभी प्रश्न पूरे कर लिए हैं। आपकी कहानियाँ आपके परिवार के लिए एक सुंदर पुस्तक में संकलित की जाएंगी।`,
    },
    albumReady: {
      en: (name: string) =>
        `Hello ${name}, your Kahani album is ready 🌼\n\nIt holds the stories you shared, in your own voice, for your family to listen to whenever they miss you.\n\nThank you for trusting me with your memories.`,
      hn: (name: string) =>
        `नमस्ते ${name}, आपका कहानी एल्बम तैयार है 🌼\n\nइसमें आपकी साझा की गई कहानियाँ हैं, आपकी अपनी आवाज़ में, ताकि आपका परिवार जब भी आपको याद करे तो सुन सके।\n\nअपनी यादों पर भरोसा करने के लिए धन्यवाद।`,
    },
    notRightTime: {
      en: (name: string) =>
        `Hi ${name}, it seems this might not be the right time. We're here whenever you're ready. Feel free to reach out anytime!`,
      hn: (name: string) =>
        `नमस्ते ${name}, ऐसा लगता है कि यह सही समय नहीं हो सकता है। जब भी आप तैयार हों, हम यहाँ हैं। कभी भी संपर्क करने के लिए स्वतंत्र महसूस करें!`,
    },
    questionMessage: {
      en: (name: string, question?: string) =>
        `Thank you, ${name}.\n\nTake a moment, sit back, and think about this:\n\n*${question || ""}*\n\nWhenever you are ready to share, please send me a voice note 🎙️`,
      hn: (name: string, question?: string) =>
        `धन्यवाद ${name}!\n\nज़रा आराम से बैठिए और इस बात को याद कीजिए:\n\n*${question || ""}*\n\nजब भी आप बताने के लिए तैयार हों, कृपया मुझे एक वॉइस नोट भेजें 🎙️`,
    },
    questionMessage1: {
      en: (name: string, question?: string) =>
        `Okay. Now I would love to hear your story about this.\n\n*${question || ""}*\n\nTake your time. The more details, the better. 🤍`,
      hn: (name: string, question?: string) =>
        `ठीक है। अब मैं इस बारे में आपकी कहानी सुनना चाहूँगी।\n\n*${question || ""}*\n\nआराम से बोलिए। जितना विस्तार, उतना अच्छा। 🤍`,
    },
    questionMessage2: {
      en: (name: string, question?: string) =>
        `And one more.\n\n*${question || ""}*\n\nIf any small memory comes up, please share that too. 🙂`,
      hn: (name: string, question?: string) =>
        `और एक बात।\n\n*${question || ""}*\n\nअगर कोई छोटी-सी याद भी आए, तो वह भी बता दीजिए। 🙂`,
    },
    questionMessage3: {
      en: (name: string, question?: string) =>
        `Last one for today.\n\n*${question || ""}*\n\nSay it the way you remember it. 🤍`,
      hn: (name: string, question?: string) =>
        `आज की आख़िरी बात।\n\n*${question || ""}*\n\nजैसे आपको याद हो, वैसे ही बता दीजिए। 🤍`,
    },
    reminderMessage: {
      en: (name: string, question?: string) =>
        `Hi ${name}, quick reminder for this one: ${question || ""}\n\nWhenever you are free, please send a voice note.`,
      hn: (name: string, question?: string) =>
        `नमस्ते ${name}, बस याद दिला रही हूँ: ${question || ""}\n\nजब भी समय मिले, वॉइस नोट भेज दीजिए।`,
    },
    buyerCompletionMessage: {
      en: (buyerName: string, storytellerName: string) =>
        `Hello ${buyerName} 👋\n\nHere is ${storytellerName}'s Kahani album — their stories in their own voice 🎧📖\n\nWhen you have a quiet moment, please do listen!\n\nThese are the memories you can carry with you, always ❤️`,
      hn: (buyerName: string, storytellerName: string) =>
        `नमस्ते ${buyerName} 👋\n\nयह ${storytellerName} का कहानी एल्बम है — उनकी अपनी आवाज़ में उनकी कहानियाँ 🎧📖\n\nजब आपके पास एक शांत क्षण हो, कृपया ज़रूर सुनें!\n\nये वो यादें हैं जिन्हें आप हमेशा अपने साथ रख सकते हैं ❤️`,
    },
    activeKahaniMessage: {
      en: (storytellerName: string, buyerName: string) =>
        `Hi ${storytellerName}! 👋\n\nYou have an active Kahani with ${buyerName}. We will begin a new Kahani once ${buyerName}'s Kahani is complete! 🌸`,
      hn: (storytellerName: string, buyerName: string) =>
        `नमस्ते ${storytellerName}! 👋\n\nआपके पास ${buyerName} के साथ एक सक्रिय कहानी है। जब ${buyerName} का कहानी पूरा हो जाएगा तो हम एक नया कहानी शुरू करेंगे! 🌸`,
    },
    intermediateAcknowledgment1: {
      en: "Thank you for sharing that! 💫 Here's another question for you... 🎙️",
      hn: "आपकी बात सुनकर अच्छा लगा! 💫 यहाँ आपके लिए एक और प्रश्न है... 🎙️",
    },
    intermediateAcknowledgment2: {
      en: "Wonderful! I'm listening. Here's one more question... ✨🎙️",
      hn: "बहुत बढ़िया! मैं सुन रही हूँ। यहाँ एक और प्रश्न है... ✨🎙️",
    },
    checkinLaterResponse: {
      en: (name: string) =>
        `Sure ${name}. I will resend my last question in a little while. Cannot wait to hear your story. 🤍`,
      hn: (name: string) =>
        `ज़रूर ${name}। मैं अपना पिछला सवाल थोड़ी देर में फिर से भेज दूँगी। आपकी कहानी सुनने का इंतज़ार रहेगा। 🤍`,
    },
  };

  const messageConfig = messages[messageKey];
  if (!messageConfig) {
    console.warn(`No message found for key: ${messageKey}`);
    return "";
  }

  if (typeof messageConfig.en === "function") {
    // Handle parameterized messages
    // Check if this is a buyerCompletionMessage (takes buyerName and storytellerName)
    if (messageKey === "buyerCompletionMessage") {
      const func = isHindi
        ? (
            messageConfig as {
              en: (buyerName: string, storytellerName: string) => string;
              hn: (buyerName: string, storytellerName: string) => string;
            }
          ).hn
        : (
            messageConfig as {
              en: (buyerName: string, storytellerName: string) => string;
              hn: (buyerName: string, storytellerName: string) => string;
            }
          ).en;
      if (params) {
        return func(params.buyerName || "", params.storytellerName || "");
      }
      return func("", "");
    }

    // Check if this is an activeKahaniMessage (takes storytellerName and buyerName)
    if (messageKey === "activeKahaniMessage") {
      const func = isHindi
        ? (
            messageConfig as {
              en: (storytellerName: string, buyerName: string) => string;
              hn: (storytellerName: string, buyerName: string) => string;
            }
          ).hn
        : (
            messageConfig as {
              en: (storytellerName: string, buyerName: string) => string;
              hn: (storytellerName: string, buyerName: string) => string;
            }
          ).en;
      if (params) {
        return func(params.storytellerName || "", params.buyerName || "");
      }
      return func("", "");
    }

    // Handle other parameterized messages (name and question)
    const func = isHindi
      ? (
          messageConfig as {
            en: (name: string, question?: string) => string;
            hn: (name: string, question?: string) => string;
          }
        ).hn
      : (
          messageConfig as {
            en: (name: string, question?: string) => string;
            hn: (name: string, question?: string) => string;
          }
        ).en;
    if (params) {
      return func(params.name || "", params.question || "");
    }
    return func("", "");
  }

  return isHindi
    ? (messageConfig as { en: string; hn: string }).hn
    : (messageConfig as { en: string; hn: string }).en;
}

export async function sendLanguageSelectionMessage(
  recipientNumber: string,
  storytellerName: string,
): Promise<boolean> {
  const isProduction = true;

  if (isProduction) {
    const templateParams = [{ type: "text", text: storytellerName }];

    return sendTemplateMessageWithRetry(
      recipientNumber,
      "language_vaani_en",
      templateParams,
    );
  } else {
    const message = `Hi ${storytellerName}, please select your preferred language for our conversation.`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendFreeTrialConfirmation(
  recipientNumber: string,
  customerName: string,
  relation: string,
  albumName: string,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;
  // const isProduction = false;

  if (isProduction) {
    const message = `Hello ${customerName}.
I am Vaani from Kahani. I will help you collect your ${relation}'s stories in their own voice, the kind you will want to come back to years later.
${albumName} is a lovely choice.`;

    return sendTextMessageWithRetry(recipientNumber, message);
  } else {
    const message = `Hi ${customerName}, Thank you for choosing Kahani. You and ${relation} are about to start something truly special. Their Kahani will soon always stay with you. To confirm, you would like a mini album on "${albumName}" for ${relation}, right? If this looks different, please reply and let us know. To get started, you will get a short message to forward to your ${relation}. They just need to click the link and send the pre-filled message - that's it.`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendStorytellerOnboarding(
  recipientNumber: string,
  relation: string,
  customerName: string,
  albumName: string,
  languagePreference?: string | null,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;
  // const isProduction = false;
  if (isProduction) {
    const templateParams = [
      { type: "text", text: relation },
      { type: "text", text: customerName },
      { type: "text", text: albumName },
    ];

    const languageSuffix = getStorytellerLanguageSuffix(languagePreference);
    const templateName = `introtostoryteller_vaani${languageSuffix}`;

    return sendTemplateMessageWithRetry(
      recipientNumber,
      templateName,
      templateParams,
    );
  } else {
    const message = `Hi ${relation}, I am Vaani from Kahani. ${customerName} has asked me to record your stories in your own voice. Every day, I'll send you one simple question. You can reply with a voice note whenever you wish. Your stories will become a beautiful book your family can keep forever. Please pin this chat for us to get started on this journey!`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendHowToUseKahani(
  recipientNumber: string,
  buyerName: string,
  languagePreference?: string | null,
): Promise<boolean> {
  const messageEnglish = `It is simple.

I will share a short question here.
You send a voice note whenever you feel like.
These become a small album for ${buyerName} to keep.

That is all. Take your time. 🙂`;

  const messageHindi = `यह बहुत आसान है।

मैं यहाँ एक छोटी-सी बात कहूँगी।
आप जब मन करे, एक वॉइस नोट भेज दीजिए।
इनसे ${buyerName} के लिए एक छोटा-सा एल्बम बन जाएगा।
बस इतना ही। आराम से बोलिए। 🙂`;

  const message = languagePreference === "hn" ? messageHindi : messageEnglish;

  return sendTextMessageWithRetry(recipientNumber, message);
}

export async function sendPreBatchMessage(
  recipientNumber: string,
  storytellerDescription: string,
  buyerName: string,
  languagePreference?: string | null,
): Promise<boolean> {
  const messageEnglish = `Before we start, please take  a minute.

Just remember your stories about ${storytellerDescription}.

${buyerName} will really enjoy the little details. 🙂`;

  const messageHindi = `शुरू करने से पहले, कृपया एक मिनट लें।

बस ${storytellerDescription} के बारे में अपनी कहानियों को याद करें।

${buyerName} छोटी-छोटी बातों का बहुत आनंद लेंगे। 🙂`;

  const message = languagePreference === "hn" ? messageHindi : messageEnglish;

  return sendTextMessageWithRetry(recipientNumber, message);
}

export async function sendQuestionnairePremise(
  recipientNumber: string,
  questionIndex: number,
  questionSetPremise: { en: string[]; hn: string[] } | null | undefined,
  buyerName: string,
  languagePreference?: string | null,
): Promise<boolean> {
  if (!questionSetPremise) {
    console.warn(
      "questionSetPremise is not available, skipping premise message",
    );
    return false;
  }

  // Calculate batch number: 0th question = batch 0, 3rd question = batch 1, 6th question = batch 2, etc.
  const batchNumber = Math.floor(questionIndex / 3);

  // Get the premise string from the appropriate language array
  const isHindi = languagePreference === "hn";
  const premiseArray = isHindi ? questionSetPremise.hn : questionSetPremise.en;

  if (!premiseArray || premiseArray.length <= batchNumber) {
    console.warn(
      `Premise array doesn't have enough elements. Batch: ${batchNumber}, Array length: ${premiseArray?.length || 0}`,
    );
    return false;
  }

  const storytellerDescription = premiseArray[batchNumber];

  // Use the existing sendPreBatchMessage function
  return sendPreBatchMessage(
    recipientNumber,
    storytellerDescription,
    buyerName,
    languagePreference,
  );
}

export async function sendShareableLink(
  recipientNumber: string,
  storytellerName: string,
  buyerName: string,
  orderId: string,
  languagePreference?: string | null,
): Promise<boolean> {
  const businessPhone = process.env.WHATSAPP_BUSINESS_NUMBER_E164;

  const prefilledMessage = `Hi, ${buyerName} has placed an order st_${orderId} for me.`;

  const whatsappLink = `https://wa.me/${businessPhone}?text=${encodeURIComponent(prefilledMessage)}`;

  const isHindi = languagePreference === "hn";

  const messageEnglish = `Hello ${storytellerName}.

I would love to save a few stories from your life in your voice. Please tap this link ${whatsappLink}.
A new WhatsApp chat will open - please press Send.`;

  const messageHindi = `नमस्ते ${storytellerName},

मुझे आपकी ज़िंदगी की कुछ कहानियाँ हमेशा के लिए रिकॉर्ड करके रखनी हैं।

कृपया इस लिंक को दबाइए - ${whatsappLink} - एक नई WhatsApp चैट शुरू होगी, और वहाँ आप कोई भी मैसेज भेज दीजिए। धन्यवाद!`;

  const message = isHindi ? messageHindi : messageEnglish;

  const messageSent = await sendTextMessageWithRetry(recipientNumber, message, {
    orderId,
  });

  // Track when shareable link is sent (only on first successful send)
  if (messageSent) {
    try {
      const trial = await storage.getFreeTrialDb(orderId);
      if (trial && !trial.forwardLinkSentAt) {
        await storage.updateFreeTrialDb(orderId, {
          forwardLinkSentAt: new Date(),
        });
        console.log("Tracked forward link sent timestamp for trial:", orderId);
      }
    } catch (error) {
      // Log error but don't fail the function if tracking fails
      console.error(
        "Failed to track forward link sent timestamp:",
        error,
        "OrderId:",
        orderId,
      );
    }
  }

  return messageSent;
}

export async function sendReadinessCheck(
  recipientNumber: string,
  trial: any,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;

  if (isProduction) {
    const templateParams = [
      { type: "text", text: String(trial.id.slice(-4) || "") },
      { type: "text", text: trial.storytellerName },
    ];

    const templateName =
      trial.storytellerLanguagePreference === "hn"
        ? "check_readiness_hn"
        : "readiness_check_en";

    return sendTemplateMessageWithRetry(
      recipientNumber,
      templateName,
      templateParams,
    );
  } else {
    const message = `Hi ${trial.storytellerName}, are you ready to share your Kahani?`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendThanksFFTemplate(
  recipientNumber: string,
  storytellerName: string,
  languagePreference?: string | null,
): Promise<boolean> {
  const templateName =
    languagePreference === "hn" ? "thanks_ff_hn" : "thanks_ff_en";
  const templateParams = [{ type: "text", text: storytellerName }];
  return sendTemplateMessageWithRetry(
    recipientNumber,
    templateName,
    templateParams,
  );
}

export async function sendVoiceNoteAcknowledgment(
  recipientNumber: string,
  storytellerName: string,
  languagePreference?: string | null,
): Promise<boolean> {
  const messageEnglish = `Thank you, ${storytellerName}. 🙏

I will come back tomorrow for more stories.`;

  const messageHindi = `शुक्रिया ${storytellerName}। 🙏


मैं कल फिर आऊँगी, और कहानियाँ सुनने।`;

  const message = languagePreference === "hn" ? messageHindi : messageEnglish;

  return sendTextMessageWithRetry(recipientNumber, message);
}

export async function sendStorytellerCheckin(
  recipientNumber: string,
  storytellerName: string,
  languagePreference?: string | null,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;

  if (isProduction) {
    const templateParams = [{ type: "text", text: storytellerName }];
    const languageSuffix = getStorytellerLanguageSuffix(languagePreference);
    const templateName = `order_paused_storyteller_checkin${languageSuffix}`;

    return sendTemplateMessageWithRetry(
      recipientNumber,
      templateName,
      templateParams,
    );
  } else {
    const message = `Hi ${storytellerName}, just checking in to see if you're ready to continue sharing your stories.`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendBuyerCheckin(
  recipientNumber: string,
  buyerName: string,
  storytellerName: string,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;

  if (isProduction) {
    const templateParams = [
      { type: "text", text: buyerName },
      { type: "text", text: storytellerName },
    ];

    return sendTemplateMessageWithRetry(
      recipientNumber,
      "buyer_checkin_en",
      templateParams,
    );
  } else {
    const message = `Hello ${buyerName}.\n\nHope everything is well.\n\nLooks like ${storytellerName} has been busy, so I will pause for now.\nYou can resume anytime by messaging me.\n\nIf you need anything from my side, please tell me.`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendBuyerNudgeForNoStoryteller(
  recipientNumber: string,
  buyerName: string,
  storytellerName: string,
  orderId: string,
): Promise<boolean> {
  const businessPhone = process.env.WHATSAPP_BUSINESS_NUMBER_E164;

  const prefilledMessage = `Hi, ${buyerName} has placed an order st_${orderId} for me.`;

  const whatsappLink = `https://wa.me/${businessPhone}?text=${encodeURIComponent(prefilledMessage)}`;

  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;

  if (isProduction) {
    const templateParams = [
      { type: "text", text: buyerName },
      { type: "text", text: storytellerName },
      { type: "text", text: whatsappLink },
      { type: "text", text: storytellerName },
    ];

    return sendTemplateMessageWithRetry(
      recipientNumber,
      "no_storyteller_buyer_nudge",
      templateParams,
      { orderId },
    );
  } else {
    const message = `Hello ${buyerName}.\n\nRecording has not started yet as no confirmation message received from ${storytellerName}.\n\n*Action required:* Please send this link ${whatsappLink} to ${storytellerName} for us to get started.`;

    return sendTextMessageWithRetry(recipientNumber, message, { orderId });
  }
}

export async function sendIntermediateAcknowledgment(
  recipientNumber: string,
  storytellerName: string,
  questionNumber: 1 | 2,
  languagePreference?: string | null,
): Promise<boolean> {
  const messageKey =
    questionNumber === 1
      ? "intermediateAcknowledgment1"
      : "intermediateAcknowledgment2";
  const message = getLocalizedMessage(messageKey, languagePreference);

  return sendTextMessageWithRetry(recipientNumber, message);
}

export async function sendAlbumCompletionMessage(
  recipientNumber: string,
  playlistAlbumLink: string,
  vinylAlbumLink: string,
  storytellerName: string,
  customerName: string,
  albumId: string,
  isCustomer: boolean,
  languagePreference?: string | null,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;
  // const isProduction = false;

  if (isProduction) {
    const languageSuffix = isCustomer
      ? "_en"
      : getStorytellerLanguageSuffix(languagePreference);
    const templateName = isCustomer
      ? "albumlink_vaani_en"
      : `albumlinkstoryteller_vaani${languageSuffix}`;
    const localeQuery = languagePreference === "hn" ? "?locale=hn" : "";
    const buttonParams = {
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [
        {
          type: "text",
          text: `/playlist-albums/${albumId}${!isCustomer ? localeQuery : ""}`,
        },
      ],
    };
    const templateParams = isCustomer
      ? [
          {
            type: "body",
            parameters: [
              { type: "text", text: customerName },
              { type: "text", text: storytellerName },
            ],
          },
          buttonParams,
        ]
      : [
          {
            type: "body",
            parameters: [{ type: "text", text: storytellerName }],
          },
          buttonParams,
        ];

    return sendTemplateMessageWithRetry(
      recipientNumber,
      templateName,
      templateParams,
    );
  } else {
    const message = `Here's your mini album:\n\nPlaylist Album: ${playlistAlbumLink}\n\nVinyl Album: ${vinylAlbumLink}\n\nA short glimpse of the memories you've shared so far.`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendStorytellerCompletionMessages(
  recipientNumber: string,
  storytellerName: string,
  albumId: string,
  languagePreference?: string | null,
): Promise<boolean> {
  // Send first message: simple text message
  const firstMessage = getLocalizedMessage(
    "completedAllQuestions",
    languagePreference,
    { name: storytellerName },
  );

  const firstMessageSent = await sendTextMessageWithRetry(
    recipientNumber,
    firstMessage,
  );
  if (!firstMessageSent) {
    console.error(
      "Failed to send first completion message to storyteller:",
      recipientNumber,
    );
    return false;
  }

  // Wait 2 seconds before sending the second message
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Send second message: interactive message with CTA button
  const secondMessage = getLocalizedMessage("albumReady", languagePreference, {
    name: storytellerName,
  });
  const buttonTitle = "Open Website";
  const localeQuery = languagePreference === "hn" ? "?locale=hn" : "";
  const buttonUrl = `https://www.kahani.xyz/playlist-albums/${albumId}${localeQuery}`;

  const secondMessageSent = await sendInteractiveMessageWithCTA(
    recipientNumber,
    secondMessage,
    buttonTitle,
    buttonUrl,
  );

  if (!secondMessageSent) {
    console.error(
      "Failed to send second completion message to storyteller:",
      recipientNumber,
    );
    return false;
  }

  return true;
}

export async function sendBuyerCompletionMessage({
  recipientNumber,
  buyerName,
  storytellerName,
  trialId,
}: {
  recipientNumber: string;
  buyerName: string;
  storytellerName: string;
  trialId: string;
  languagePreference?: string | null;
}): Promise<boolean> {
  const buyerCompletionMessage = await sendWhatsappButtonTemplate(
    recipientNumber,
    "album_completion_buyer_en",
    "en",
    [buyerName, trialId, storytellerName],
    `playlist-albums/${trialId}`,
    "0",
  );
  return buyerCompletionMessage;
}

export async function sendBuyerFeedbackRequest(
  recipientNumber: string,
  buyerName: string,
  relationName: string,
  trialId: string,
): Promise<boolean> {
  const templateParams = [
    { type: "text", text: buyerName },
    { type: "text", text: relationName },
  ];

  return sendTemplateMessageWithRetry(
    recipientNumber,
    "buyer_feedback_en",
    templateParams,
    {
      orderId: trialId,
      messageType: "feedback_request",
    },
  );
}

export async function sendStorytellerFeedbackRequest(
  recipientNumber: string,
  relationName: string,
  languagePreference?: string | null,
  trialId?: string,
): Promise<boolean> {
  const languageSuffix = getStorytellerLanguageSuffix(languagePreference);
  const templateName = `feedback_storyteller${languageSuffix}`;
  const templateParams = [{ type: "text", text: relationName }];

  return sendTemplateMessageWithRetry(
    recipientNumber,
    templateName,
    templateParams,
    {
      ...(trialId && { orderId: trialId }),
      messageType: "feedback_request",
    },
  );
}

export async function sendFeedbackThankYou(
  recipientNumber: string,
  name: string,
): Promise<boolean> {
  const message = `Thank you, ${name}. 🙏\n\nThis means a lot to me.\n\nIf you have one more thoughts, please reachout to me at vaani@kahani.xyz.`;

  return sendTextMessageWithRetry(recipientNumber, message);
}

export async function sendPhotoRequestToBuyer(
  recipientNumber: string,
  buyerName: string,
  storytellerName: string,
  trialId: string,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;

  if (isProduction) {
    return sendWhatsappButtonTemplate(
      recipientNumber,
      "picture_request_en",
      "en",
      [trialId, buyerName, storytellerName],
      `custom-album-cover/${trialId}`,
      "0",
    );
  } else {
    const message = `Hi ${buyerName} 😊\n\n${storytellerName}'s first few stories are now saved beautifully.\n\nCould you please send *one nice photo of ${storytellerName} for the album cover, along with their full name* as you would like it to appear?`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

/**
 * Sends a WhatsApp button template message with body parameters and a button component
 * @param recipientNumber - Phone number in E.164 format
 * @param templateName - Name of the template (e.g., "pic_request_en")
 * @param languageCode - Language code (e.g., "en")
 * @param bodyParameters - Array of text parameters for the body component
 * @param buttonText - Text parameter for the button URL
 * @param buttonIndex - Index of the button (default: "0")
 * @returns Promise<boolean> - true if message sent successfully, false otherwise
 */
export async function sendWhatsappButtonTemplate(
  recipientNumber: string,
  templateName: string,
  languageCode: string = "en",
  bodyParameters: string[] = [],
  buttonText: string,
  buttonIndex: string = "0",
  options?: {
    messageType?: string;
    orderId?: string;
  },
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  if (!validateE164(recipientNumber)) {
    console.error("Invalid E.164 phone number:", recipientNumber);
    return false;
  }

  const { phoneNumberId, accessToken } = config;
  const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const components: any[] = [];

  // Add body component if there are body parameters
  if (bodyParameters.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParameters.map((text) => ({
        type: "text",
        text,
      })),
    });
  }

  // Add button component
  components.push({
    type: "button",
    sub_type: "url",
    index: buttonIndex,
    parameters: [
      {
        type: "text",
        text: buttonText,
      },
    ],
  });

  const payload = {
    messaging_product: "whatsapp",
    to: recipientNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  };

  // Log outgoing message before API call
  const logId = await logOutgoingMessage({
    from: getBusinessPhoneNumber(),
    to: recipientNumber,
    orderId: options?.orderId || null,
    messageTemplate: templateName,
    messageType: options?.messageType || "button_template",
    messageCategory: "template",
    messagePayload: payload,
    status: "queued",
  });

  try {
    const response = await retryWithBackoff(async () => {
      return await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
    });

    const messageId = response.data.messages?.[0]?.id;
    const responseStatus = response.data.messages?.[0]?.message_status;

    console.log("WhatsApp button template message sent:", {
      to: recipientNumber,
      messageId,
      status: responseStatus,
      template: templateName,
      fullResponse: response.data,
    });

    // Update log with message_id and status
    if (logId) {
      await updateMessageWithResponse(
        logId,
        messageId || null,
        responseStatus === "ACCEPTED" ? "sent" : "failed",
      );
    }

    // Check for warnings or errors in the response
    if (response.data.errors) {
      console.warn("WhatsApp API returned errors:", response.data.errors);
    }
    if (response.data.meta) {
      console.log("WhatsApp API meta:", response.data.meta);
    }

    return true;
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error(
      "Failed to send WhatsApp button template message after retries:",
      {
        error: errorDetails,
        to: recipientNumber,
        template: templateName,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
      },
    );

    // Update log with error status
    if (logId) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error";
      await updateMessageWithResponse(logId, null, "failed", errorMessage);
    }

    // Log specific WhatsApp API error codes
    if (error.response?.data?.error) {
      const whatsappError = error.response.data.error;
      console.error("WhatsApp API Error Details:", {
        code: whatsappError.code,
        message: whatsappError.message,
        type: whatsappError.type,
        error_subcode: whatsappError.error_subcode,
        fbtrace_id: whatsappError.fbtrace_id,
      });
    }

    return false;
  }
}

export async function downloadVoiceNoteMedia(mediaId: string): Promise<{
  url: string;
  mimeType: string;
  sha256: string;
  fileSize: number;
} | null> {
  const config = getConfig();
  if (!config) return null;

  const { accessToken } = config;

  try {
    const mediaInfoUrl = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${mediaId}`;

    const mediaInfoResponse = await axios.get(mediaInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const mediaUrl = mediaInfoResponse.data.url;
    const mimeType = mediaInfoResponse.data.mime_type;
    const sha256 = mediaInfoResponse.data.sha256;
    const fileSize = mediaInfoResponse.data.file_size;

    console.log("Retrieved media info:", {
      mediaId,
      mimeType,
      fileSize,
      sha256,
    });

    return {
      url: mediaUrl,
      mimeType,
      sha256,
      fileSize,
    };
  } catch (error: any) {
    console.error("Failed to get media info from WhatsApp:", {
      error: error.response?.data || error.message,
      mediaId,
    });
    return null;
  }
}

export async function downloadMediaFile(
  mediaUrl: string,
  accessToken: string,
): Promise<Buffer | null> {
  try {
    const response = await axios.get(mediaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: "arraybuffer",
      timeout: 30000, // 30 second timeout
    });

    return Buffer.from(response.data);
  } catch (error: any) {
    // Log comprehensive error details
    const errorDetails: any = {
      errorMessage: error.message,
      errorCode: error.code,
      isAxiosError: error.isAxiosError,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      requestUrl: mediaUrl,
    };

    // Add response data if available
    if (error.response?.data) {
      // For arraybuffer responses, try to convert to string if possible
      if (error.response.data instanceof ArrayBuffer) {
        try {
          errorDetails.responseData = Buffer.from(error.response.data)
            .toString("utf-8")
            .substring(0, 500);
        } catch {
          errorDetails.responseData = `[ArrayBuffer of size ${error.response.data.byteLength}]`;
        }
      } else {
        errorDetails.responseData = error.response.data;
      }
    }

    // Add request config details
    if (error.config) {
      errorDetails.requestMethod = error.config.method;
      errorDetails.requestHeaders = error.config.headers;
    }

    // Add stack trace for debugging
    if (error.stack) {
      errorDetails.stack = error.stack;
    }

    console.error("Failed to download media file:", errorDetails);
    return null;
  }
}
