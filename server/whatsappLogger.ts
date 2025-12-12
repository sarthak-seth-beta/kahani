import { db } from "./db";
import {
  whatsappMessages,
  whatsappWebhookEvents,
  type InsertWhatsAppMessageRow,
  type InsertWhatsAppWebhookEventRow,
} from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Log an outgoing WhatsApp message to the database
 * This should be called BEFORE sending the message to WhatsApp API
 */
export async function logOutgoingMessage(
  data: Omit<InsertWhatsAppMessageRow, "id" | "createdAt" | "updatedAt">,
): Promise<string | null> {
  try {
    const result = await db
      .insert(whatsappMessages)
      .values({
        ...data,
        status: data.status || "sent",
      })
      .returning({ id: whatsappMessages.id });

    return result[0]?.id || null;
  } catch (error) {
    console.error("Failed to log outgoing WhatsApp message:", error);
    return null;
  }
}

/**
 * Update the message_id and status of an outgoing message after API response
 */
export async function updateMessageWithResponse(
  logId: string,
  messageId: string | null,
  status: "sent" | "failed" | "dropped" = "sent",
  error?: string,
): Promise<void> {
  try {
    await db
      .update(whatsappMessages)
      .set({
        messageId,
        status,
        error: error || null,
        updatedAt: new Date(),
      })
      .where(eq(whatsappMessages.id, logId));
  } catch (error) {
    console.error("Failed to update WhatsApp message with response:", error);
  }
}

/**
 * Update message status from webhook event
 * Correlates webhook event with outgoing message via message_id
 */
export async function updateMessageStatus(
  messageId: string,
  status: "sent" | "delivered" | "read" | "failed" | "dropped" | "unknown",
  error?: string,
): Promise<void> {
  try {
    await db
      .update(whatsappMessages)
      .set({
        status,
        error: error || null,
        updatedAt: new Date(),
      })
      .where(eq(whatsappMessages.messageId, messageId));
  } catch (error) {
    console.error("Failed to update WhatsApp message status:", error);
  }
}

/**
 * Log a webhook event (append-only)
 * This should be called for ALL webhook events received
 */
export async function logWebhookEvent(
  data: Omit<InsertWhatsAppWebhookEventRow, "id" | "createdAt">,
): Promise<string | null> {
  try {
    const result = await db
      .insert(whatsappWebhookEvents)
      .values(data)
      .returning({ id: whatsappWebhookEvents.id });

    return result[0]?.id || null;
  } catch (error) {
    console.error("Failed to log WhatsApp webhook event:", error);
    return null;
  }
}

/**
 * Correlate webhook event with outgoing message and update status
 * This is a convenience function that logs the webhook AND updates the message
 */
export async function correlateWebhookToMessage(
  webhookData: Omit<InsertWhatsAppWebhookEventRow, "id" | "createdAt">,
  status?: "sent" | "delivered" | "read" | "failed" | "dropped" | "unknown",
  error?: string,
): Promise<void> {
  // Always log the webhook event (append-only)
  await logWebhookEvent(webhookData);

  // If we have a message_id and status, update the corresponding message
  if (webhookData.messageId && status) {
    await updateMessageStatus(webhookData.messageId, status, error);
  }
}

