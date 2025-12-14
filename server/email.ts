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

    const uniqueSubject = `Message dropped by Meta fir ${recipientId}`;

    const response = await resend.emails.send({
      from: "Kahani Alerts <onboarding@resend.dev>",
      to: "sarthakseth021@gmail.com",
      subject: uniqueSubject,
      text: emailBody,
    });

    // Log the full response to debug
    console.log("Resend API response:", JSON.stringify(response, null, 2));

    if (response.error) {
      console.error("Resend API returned an error:", {
        error: response.error,
        errorCode,
        recipientId,
      });
      return;
    }

    console.log("Error alert email sent successfully:", {
      errorCode,
      recipientId,
      emailId: response.data?.id,
      to: ALERT_EMAILS,
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
