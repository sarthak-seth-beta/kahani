import axios from "axios";

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

export async function sendTemplateMessageWithRetry(
  recipientNumber: string,
  templateName: string,
  templateParams: any[] = [],
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  if (!validateE164(recipientNumber)) {
    console.error("Invalid E.164 phone number:", recipientNumber);
    return false;
  }

  const { phoneNumberId, accessToken } = config;
  const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const payload: any = {
    messaging_product: "whatsapp",
    to: recipientNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "en",
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
      fullResponse: response.data,
    });

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

    console.error("Failed to send WhatsApp text message after retries:", errorInfo);

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
      console.error("WhatsApp API Response Data:", JSON.stringify(error.response.data, null, 2));
    }

    return false;
  }
}

export async function sendInteractiveMessageWithCTA(
  recipientNumber: string,
  messageText: string,
  buttonTitle: string,
  buttonUrl: string,
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

    console.error("Failed to send WhatsApp interactive message after retries:", errorInfo);

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
      console.error("WhatsApp API Response Data:", JSON.stringify(error.response.data, null, 2));
    }

    return false;
  }
}

//ToDo: Add sendLanguageSelectionMessage function

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
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;
  // const isProduction = false;
  if (isProduction) {
    const templateParams = [
      { type: "text", text: relation },
      { type: "text", text: customerName },
    ];

    return sendTemplateMessageWithRetry(
      recipientNumber,
      "introtostoryteller_vaani_en",
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
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;

  if (isProduction) {
    const templateParams = [{ type: "text", text: relation }];

    return sendTemplateMessageWithRetry(
      recipientNumber,
      "ready_vaani_en",
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
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;
  // const isProduction = false;

  if (isProduction) {
    const templateParams = [
      { type: "text", text: storytellerName },
    ];
    return sendTemplateMessageWithRetry(recipientNumber, "thanks_vaani_en", templateParams);
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
): Promise<boolean> {
  // const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;
  // const isProduction = false;

  if (isProduction) {
  
    const templateName = isCustomer ? "albumlink_vaani_en" : "albumlinkstoryteller_vaani_en";
    const buttonParams = {
    type: "button",
    sub_type: "url",
    index: "0",
    parameters: [
      { type: "text", text: `/playlist-albums/${albumId}` }
    ]
  }
    const templateParams = isCustomer ? [
  {
    type: "body",
    parameters: [
      { type: "text", text: customerName },
      { type: "text", text: storytellerName }
    ]
  },
  buttonParams
]
 : [
  {
    type: "body",
    parameters: [
      { type: "text", text: storytellerName },
    ]
  },
  buttonParams
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
): Promise<boolean> {
  // Send first message: simple text message
  const firstMessage = `Thank you ${storytellerName}! You've completed all the questions. Your stories will be compiled into a beautiful book for your family.`;
  
  const firstMessageSent = await sendTextMessageWithRetry(recipientNumber, firstMessage);
  if (!firstMessageSent) {
    console.error("Failed to send first completion message to storyteller:", recipientNumber);
    return false;
  }

  // Wait 2 seconds before sending the second message
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Send second message: interactive message with CTA button
  const secondMessage = `Hello ${storytellerName}, your Kahani album is ready 🌼\n\nIt holds the stories you shared, in your own voice, for your family to listen to whenever they miss you.\n\nThank you for trusting me with your memories.`;
  const buttonTitle = "Open Website";
  const buttonUrl = `https://www.kahani.xyz/playlist-albums/${albumId}`;

  const secondMessageSent = await sendInteractiveMessageWithCTA(
    recipientNumber,
    secondMessage,
    buttonTitle,
    buttonUrl,
  );

  if (!secondMessageSent) {
    console.error("Failed to send second completion message to storyteller:", recipientNumber);
    return false;
  }

  return true;
}

export async function sendBuyerCompletionMessage(
  recipientNumber: string,
  buyerName: string,
  storytellerName: string,
  albumId: string,
): Promise<boolean> {
  const message = `Hello ${buyerName} 👋\n\nHere is ${storytellerName}'s Kahani album — their stories in their own voice 🎧📖\n\nWhen you have a quiet moment, please do listen!\n\nThese are the memories you can carry with you, always ❤️`;
  const buttonTitle = "Open Website";
  const buttonUrl = `https://www.kahani.xyz/playlist-albums/${albumId}`;

  return await sendInteractiveMessageWithCTA(
    recipientNumber,
    message,
    buttonTitle,
    buttonUrl,
  );
}

export async function sendPhotoRequestToBuyer(
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
      "photorequest_vaani_en",
      templateParams,
    );
  } else {
    const message = `Hi ${buyerName} 😊\n\n${storytellerName}'s first few stories are now saved beautifully.\n\nCould you please send *one nice photo of ${storytellerName} for the album cover, along with their full name* as you would like it to appear?`;

    return sendTextMessageWithRetry(recipientNumber, message);
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
          errorDetails.responseData = Buffer.from(error.response.data).toString('utf-8').substring(0, 500);
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
