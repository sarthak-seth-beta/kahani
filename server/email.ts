import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ALERT_EMAILS = [
  "sarthakseth021@gmail.com",
  // "info@entrepi.world",
];

export async function sendErrorAlertEmail(
  errorCode: number,
  recipientId: string,
  errorReason: string,
  webhookPayload: any,
): Promise<void> {
  // Check if API key is configured
  if (!resend || !process.env.RESEND_API_KEY) {
    console.error(
      "RESEND_API_KEY is not configured. Cannot send error alert email.",
    );
    return;
  }

  try {
    const emailBody = `
    recipient_id: ${recipientId}
error code: ${errorCode}
error reason: ${errorReason}

Full webhook payload:
${JSON.stringify(webhookPayload, null, 2)}

`;

    // Make subject unique to prevent email threading

    const uniqueSubject = `Message dropped by Meta for ${recipientId}`;

    await resend.emails.send({
      from: "Kahani Alerts <onboarding@resend.dev>",
      to: "sarthakseth021@gmail.com",
      subject: uniqueSubject,
      text: emailBody,
    });
  } catch (error: any) {
    // Log error but don't throw - webhook processing should continue
    console.error("Failed to send error alert email:", {
      error: error.message,
      errorStack: error.stack,
      errorCode,
      recipientId,
    });
  }
}

export async function sendWhatsAppFailureAlertEmail({
  templateName,
  phoneNumber,
  trialId,
  messageType,
  failureCount,
  lastError,
}: {
  templateName: string;
  phoneNumber: string;
  trialId?: string | null;
  messageType: string;
  failureCount: number;
  lastError?: string | null;
}): Promise<void> {
  // Check if API key is configured
  if (!resend || !process.env.RESEND_API_KEY) {
    console.error(
      "RESEND_API_KEY is not configured. Cannot send WhatsApp failure alert email.",
    );
    return;
  }

  try {
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #d32f2f;">⚠️ WhatsApp Message Failure Alert</h2>
        
        <p style="font-size: 16px; color: #333;">
          Multiple failed attempts detected for sending a WhatsApp message. The system has stopped retrying to prevent infinite loops.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9f9f9;">
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd; width: 40%;">Template Name:</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;"><code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${templateName}</code></td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Phone Number:</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${phoneNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Message Type:</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${messageType}</td>
          </tr>
          ${
            trialId
              ? `
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Trial ID:</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;"><code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${trialId}</code></td>
          </tr>
          `
              : ""
          }
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Failure Count:</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;"><strong style="color: #d32f2f;">${failureCount} failed attempts</strong></td>
          </tr>
          ${
            lastError
              ? `
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Last Error:</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;"><code style="background: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; word-break: break-all;">${lastError}</code></td>
          </tr>
          `
              : ""
          }
        </table>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>Action Taken:</strong> The system has marked this message as "sent" to prevent further retry attempts. 
            Please investigate the issue and manually send the message if needed.
          </p>
        </div>
        
        <div style="margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px;">
          <p>This is an automated alert from the Kahani WhatsApp messaging system.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      </div>
    `;

    const subject = `WhatsApp Message Failure: ${templateName} to ${phoneNumber}`;

    for (const email of ALERT_EMAILS) {
      await resend.emails.send({
        from: "Kahani Alerts <onboarding@resend.dev>",
        to: email,
        subject,
        html: emailHtml,
      });
    }

    console.log("Sent WhatsApp failure alert email for:", {
      templateName,
      phoneNumber,
      trialId,
    });
  } catch (error: any) {
    // Log error but don't throw - scheduler should continue
    console.error("Failed to send WhatsApp failure alert email:", {
      error: error.message,
      errorStack: error.stack,
      templateName,
      phoneNumber,
      trialId,
    });
  }
}

export async function sendUserNeedsHelpEmail(
  fromNumber: string,
  messageText: string,
  trials: any[],
): Promise<void> {
  // Check if API key is configured
  if (!resend || !process.env.RESEND_API_KEY) {
    console.error(
      "RESEND_API_KEY is not configured. Cannot send user needs help email.",
    );
    return;
  }

  try {
    // Build trials section HTML
    let trialsHtml = "";
    if (trials.length === 0) {
      trialsHtml = `
        <tr>
          <td colspan="2" style="padding: 12px; text-align: center; color: #666;">
            No associated trials found
          </td>
        </tr>
      `;
    } else {
      trials.forEach((trial, index) => {
        const isEven = index % 2 === 0;
        const bgColor = isEven ? "#f9f9f9" : "#ffffff";
        trialsHtml += `
          <tr style="background: ${bgColor};">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd; width: 40%; vertical-align: top;">Trial ${index + 1}:</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">
              <div style="margin-bottom: 8px;">
                <strong>Trial ID:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${trial.id || "N/A"}</code>
              </div>
              <div style="margin-bottom: 8px;">
                <strong>Storyteller:</strong> ${trial.storytellerName || "N/A"} (${trial.storytellerPhone || "N/A"})
              </div>
              <div style="margin-bottom: 8px;">
                <strong>Customer/Buyer:</strong> ${trial.buyerName || "N/A"} (${trial.customerPhone || "N/A"})
              </div>
              <div>
                <strong>Conversation State:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${trial.conversationState || "N/A"}</code>
              </div>
            </td>
          </tr>
        `;
      });
    }

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #A35139;">User Needs Help</h2>
        
        <p style="font-size: 16px; color: #333;">
          A user has sent a message that may require assistance.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9f9f9;">
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd; width: 40%;">Phone Number:</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${fromNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Message:</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd; word-break: break-word;">${messageText || "(empty message)"}</td>
          </tr>
        </table>

        <h3 style="color: #333; margin-top: 30px; margin-bottom: 15px;">Associated Trials:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9f9f9;">
          ${trialsHtml}
        </table>
        
        <div style="margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px;">
          <p>This is an automated alert from the Kahani WhatsApp messaging system.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      </div>
    `;

    const subject = "User Needs Help";

    for (const email of ALERT_EMAILS) {
      await resend.emails.send({
        from: "Kahani Alerts <onboarding@resend.dev>",
        to: email,
        subject,
        html: emailHtml,
      });
    }

    console.log("Sent user needs help email for:", {
      fromNumber,
      messageText,
      trialCount: trials.length,
    });
  } catch (error: any) {
    // Log error but don't throw - webhook processing should continue
    console.error("Failed to send user needs help email:", {
      error: error.message,
      errorStack: error.stack,
      fromNumber,
      messageText,
    });
  }
}

const ADMIN_EMAIL = "sarthakseth021@gmail.com";

export async function sendCustomAlbumRequestEmail({
  title,
  yourName,
  recipientName,
  occasion,
  language,
  instructions,
  email,
  phone,
  questions,
}: {
  title: string;
  yourName?: string;
  recipientName: string;
  occasion?: string;
  language?: string;
  instructions?: string;
  email?: string;
  phone?: string;
  questions?: Array<{ text?: string } | string>;
}): Promise<boolean> {
  const questionsList =
    questions
      ?.map((q, i) => {
        const text = typeof q === "string" ? q : (q?.text ?? "");
        return `<li><strong>Q${i + 1}:</strong> ${text}</li>`;
      })
      .join("") || "<li>No questions</li>";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #A35139;">New Custom Album Request</h1>
      <p>You have received a new request for a custom album!</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Title</td><td style="padding: 10px;">${title}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold;">Sender Name</td><td style="padding: 10px;">${yourName || "N/A"}</td></tr>
        <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Acc for</td><td style="padding: 10px;">${recipientName}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold;">Occasion</td><td style="padding: 10px;">${occasion || "N/A"}</td></tr>
        <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Language</td><td style="padding: 10px;">${language || "N/A"}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold;">Contact Email</td><td style="padding: 10px;">${email || "N/A"}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold;">Phone</td><td style="padding: 10px;">${phone || "N/A"}</td></tr>
        <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Instructions</td><td style="padding: 10px;">${instructions || "N/A"}</td></tr>
      </table>
      <h3>Custom Questions:</h3>
      <ul>${questionsList}</ul>
      <div style="margin-top: 30px; font-size: 12px; color: #888;">Sent from Kahani Web Platform</div>
    </div>
  `;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Album Request: ${title}`,
    html,
  });
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  console.log("--- sendEmail called ---");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("API Key present:", !!process.env.RESEND_API_KEY);

  if (!resend || !process.env.RESEND_API_KEY) {
    console.error("DEBUG: RESEND_API_KEY missing or resend client null");
    return false;
  }

  try {
    console.log("DEBUG: Calling resend.emails.send...");
    const { data, error } = await resend.emails.send({
      from: "Kahani <team@resend.dev>",
      to,
      subject,
      html,
    });
    console.log("DEBUG: Resend response received");

    if (error) {
      console.error("DEBUG: Resend API Error:", error);
      return false;
    }

    console.log("DEBUG: Email sent successfully:", data);
    return true;
  } catch (error) {
    console.error("DEBUG: Failed to execute sendEmail exception:", error);
    return false;
  }
}
