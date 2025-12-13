import axios from "axios";
import {
  logOutgoingMessage,
  updateMessageWithResponse,
} from "./whatsappLogger";

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

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.length === 10) {
    return "91" + cleaned;
  }

  return cleaned;
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
        responseStatus === "ACCEPTED" ? "sent" : "unknown",
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
    console.log("WhatsApp text message response:", response);

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
        responseStatus === "ACCEPTED" ? "sent" : "unknown",
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
        responseStatus === "ACCEPTED" ? "sent" : "unknown",
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
      en: `Great! I found your story collection. You're currently working on answering questions. Please send a voice note to answer the current question.`,
      hn: `बहुत बढ़िया! मैंने आपका कहानी संग्रह ढूंढ लिया है। आप वर्तमान में प्रश्नों के उत्तर देने पर काम कर रहे हैं। कृपया वर्तमान प्रश्न का उत्तर देने के लिए एक वॉइस नोट भेजें।`,
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
    reminderMessage: {
      en: (name: string, question?: string) =>
        `Hi ${name}, just a gentle reminder about the question I sent earlier:\n\n*${question || ""}*\n\nWhenever you're ready, please share your story with a voice note. Take your time.`,
      hn: (name: string, question?: string) =>
        `नमस्ते ${name}, मैंने पहले भेजे गए प्रश्न के बारे में एक कोमल अनुस्मारक:\n\n*${question || ""}*\n\nजब भी आप तैयार हों, कृपया एक वॉइस नोट के साथ अपनी कहानी साझा करें। अपना समय लें।`,
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
    const templateParams = [
      { type: "text", text: customerName },
      { type: "text", text: relation },
      { type: "text", text: relation },
    ];

    return sendTemplateMessageWithRetry(
      recipientNumber,
      "buyerconfirmation_vaani_en",
      templateParams,
    );
  } else {
    const message = `Hi ${customerName}, Thank you for choosing Kahani. You and ${relation} are about to start something truly special. Their Kahani will soon always stay with you. To confirm, you would like a mini album on "${albumName}" for ${relation}, right? If this looks different, please reply and let us know. To get started, you will get a short message to forward to your ${relation}. They just need to click the link and send the pre-filled message - that's it.`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendStorytellerOnboarding(
  recipientNumber: string,
  relation: string,
  customerName: string,
  languagePreference?: string | null,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;
  // const isProduction = false;
  if (isProduction) {
    const templateParams = [
      { type: "text", text: relation },
      { type: "text", text: customerName },
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

export async function sendShareableLink(
  recipientNumber: string,
  storytellerName: string,
  buyerName: string,
  orderId: string,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;
  // const isProduction = false;
  const businessPhone = process.env.WHATSAPP_BUSINESS_NUMBER_E164;

  const prefilledMessage = `Hi, ${buyerName} has placed an order ${orderId} for me.`;

  const whatsappLink = `https://wa.me/${businessPhone}?text=${encodeURIComponent(prefilledMessage)}`;

  if (isProduction) {
    const templateParams = [
      { type: "text", text: storytellerName },
      { type: "text", text: whatsappLink },
    ];

    return sendTemplateMessageWithRetry(
      recipientNumber,
      "forward_vaani_en",
      templateParams,
    );
  } else {
    const message = `Please share this link with *${storytellerName}*:
    ${whatsappLink} 
    When ${storytellerName} opens this link, they'll be able to start chatting with us directly on WhatsApp!`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendReadinessCheck(
  recipientNumber: string,
  relation: string,
  languagePreference?: string | null,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;

  if (isProduction) {
    const templateParams = [{ type: "text", text: relation }];

    const languageSuffix = getStorytellerLanguageSuffix(languagePreference);
    const templateName = `ready_vaani${languageSuffix}`;

    return sendTemplateMessageWithRetry(
      recipientNumber,
      templateName,
      templateParams,
    );
  } else {
    const message = `Hi ${relation}, are you ready to share your Kahani?`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
}

export async function sendVoiceNoteAcknowledgment(
  recipientNumber: string,
  storytellerName: string,
  languagePreference?: string | null,
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
  const isProduction = true;
  // const isProduction = false;

  if (isProduction) {
    const templateParams = [{ type: "text", text: storytellerName }];
    const languageSuffix = getStorytellerLanguageSuffix(languagePreference);
    const templateName = `thanks_vaani${languageSuffix}`;
    return sendTemplateMessageWithRetry(
      recipientNumber,
      templateName,
      templateParams,
    );
  } else {
    const message = `Thank you for sharing your story! It's been saved and recorded safely. We will send you the next question very soon.`;

    return sendTextMessageWithRetry(recipientNumber, message);
  }
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

export async function sendBuyerCompletionMessage(
  recipientNumber: string,
  buyerName: string,
  storytellerName: string,
  albumId: string,
  languagePreference?: string | null,
): Promise<boolean> {
  const buyerCompletionMessage = await sendWhatsappButtonTemplate(
    recipientNumber,
    "albumlink_vaani_en",
    "en",
    [buyerName, storytellerName],
    `/custom-album-cover/${albumId}`,
    "0",
  );
  return buyerCompletionMessage;
  // const message = getLocalizedMessage(
  //   "buyerCompletionMessage",
  //   languagePreference,
  //   {
  //     buyerName,
  //     storytellerName,
  //   },
  // );
  // const buttonTitle = "Open Website";
  // const buttonUrl = `https://www.kahani.xyz/playlist-albums/${albumId}`;

  // return await sendInteractiveMessageWithCTA(
  //   recipientNumber,
  //   message,
  //   buttonTitle,
  //   buttonUrl,
  // );
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
      "pic_request_en",
      "en",
      [buyerName, storytellerName, storytellerName],
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
        responseStatus === "ACCEPTED" ? "sent" : "unknown",
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
