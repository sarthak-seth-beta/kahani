/**
 * Replay a real WhatsApp webhook message through the conversation handler
 * using DB state (trial + stored webhook payload).
 *
 * Use case: test thanks_ff / in_progress flow with real Meta payload and real trial.
 *
 * Prereqs: .env with DATABASE_URL (or SUPABASE_DATABASE_URL).
 *
 * Run (from project root):
 *   npx tsx server/scripts/replay-webhook-message.ts
 *
 * Optional env:
 *   REPLAY_FROM_NUMBER=919723384957   (default)
 *   REPLAY_MESSAGE_ID=wamid.HBgMOTE5NzIzMzg0OTU3FQIAEhgUM0EzOEM0MkEwNUY2MTREOTA5MTgA
 *   REPLAY_DRY_RUN=1                  (fetch and log only; do not call handler)
 *
 * --- Supabase MCP / SQL (inspect data before replay) ---
 *
 * Trial by storyteller phone (use E.164, e.g. 919723384957):
 *   SELECT id, conversation_state, storyteller_name, album_id, selected_album, storyteller_phone
 *   FROM free_trials
 *   WHERE storyteller_phone = '919723384957'
 *   ORDER BY created_at DESC LIMIT 5;
 *
 * Incoming webhook event by message_id (message payload is in response_payload.messages[0]):
 *   SELECT id, message_id, "from", event_type, response_payload, created_at
 *   FROM whatsapp_webhook_events
 *   WHERE message_id = 'wamid.HBgMOTE5NzIzMzg0OTU3FQIAEhgUM0EzOEM0MkEwNUY2MTREOTA5MTgA'
 *     AND event_type = 'incoming_message'
 *   LIMIT 1;
 *
 * This script uses the same tables (free_trials, whatsapp_webhook_events) via the app DB client.
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../.."); // server/scripts -> server -> project root

dotenv.config({ path: resolve(projectRoot, ".env") });

const FROM_NUMBER = process.env.REPLAY_FROM_NUMBER || "919723384957";
const MESSAGE_ID =
  process.env.REPLAY_MESSAGE_ID ||
  "wamid.HBgMOTE5NzIzMzg0OTU3FQIAEhgUM0EzOEM0MkEwNUY2MTREOTA5MTgA";
const DRY_RUN = process.env.REPLAY_DRY_RUN === "1";

async function main() {
  const { db } = await import("../db");
  const { whatsappWebhookEvents } = await import("@shared/schema");
  const { eq, and } = await import("drizzle-orm");
  const { storage } = await import("../storage");
  const { handleIncomingMessage } = await import("../conversationHandler");

  console.log("Replay config:", {
    FROM_NUMBER,
    MESSAGE_ID,
    DRY_RUN,
    hasDb: !!process.env.DATABASE_URL || !!process.env.SUPABASE_DATABASE_URL,
  });

  // 1) Resolve trial by storyteller phone (E.164)
  const trial = await storage.getActiveTrialByStorytellerPhone(FROM_NUMBER);
  if (!trial) {
    console.error("No active trial found for storyteller phone:", FROM_NUMBER);
    console.error(
      "Check free_trials.storyteller_phone. Use E.164 e.g. 919723384957.",
    );
    process.exit(1);
  }
  console.log("Trial:", {
    id: trial.id,
    conversationState: trial.conversationState,
    storytellerName: trial.storytellerName,
    albumId: trial.albumId ?? null,
    selectedAlbum: trial.selectedAlbum ?? null,
  });

  // 2) Load message from whatsapp_webhook_events (incoming_message with this message_id)
  const [event] = await db
    .select()
    .from(whatsappWebhookEvents)
    .where(
      and(
        eq(whatsappWebhookEvents.messageId, MESSAGE_ID),
        eq(whatsappWebhookEvents.eventType, "incoming_message"),
      ),
    )
    .limit(1);

  if (!event) {
    console.error("No webhook event found for message_id:", MESSAGE_ID);
    console.error(
      "Query: whatsapp_webhook_events WHERE message_id = ? AND event_type = 'incoming_message'",
    );
    process.exit(1);
  }

  const payload = event.responsePayload as {
    messages?: Array<{
      from: string;
      type: string;
      id?: string;
      button?: any;
      text?: any;
      interactive?: any;
    }>;
  };
  const message = payload?.messages?.[0];
  if (!message) {
    console.error(
      "Webhook event has no messages[0]. response_payload:",
      payload,
    );
    process.exit(1);
  }

  const messageType = message.type;
  const fromNumber = message.from;

  console.log("Message to replay:", {
    id: message.id,
    type: messageType,
    from: fromNumber,
    button: message.button ?? null,
    text: message.text ?? null,
  });

  if (DRY_RUN) {
    console.log("DRY_RUN=1: skipping handleIncomingMessage.");
    return;
  }

  console.log("Calling handleIncomingMessage...");
  await handleIncomingMessage(fromNumber, message, messageType);
  console.log("handleIncomingMessage completed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
