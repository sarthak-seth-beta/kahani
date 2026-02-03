# Server Scripts Directory

This directory is reserved for standalone CLI scripts and maintenance utilities.

## Replay webhook message (real-world thanks_ff test)

Test the conversation handler with a real trial and a real Meta webhook payload from the DB.

**Prereqs:** `.env` with `DATABASE_URL` or `SUPABASE_DATABASE_URL`.

**Run (from project root):**

```bash
npx tsx server/scripts/replay-webhook-message.ts
```

**Optional env:**

- `REPLAY_FROM_NUMBER=919723384957` – storyteller phone (E.164)
- `REPLAY_MESSAGE_ID=wamid....` – incoming message id from Meta
- `REPLAY_DRY_RUN=1` – only fetch and log; do not call the handler (no WhatsApp sends)

**Using Supabase MCP / SQL** to inspect data first:

- **Trial** by phone (table `free_trials`):
  ```sql
  SELECT id, conversation_state, storyteller_name, album_id, selected_album, storyteller_phone
  FROM free_trials
  WHERE storyteller_phone = '919723384957'
  ORDER BY created_at DESC LIMIT 5;
  ```
- **Webhook event** by message id (table `whatsapp_webhook_events`; payload is in `response_payload.messages[0]`):
  ```sql
  SELECT id, message_id, "from", event_type, response_payload, created_at
  FROM whatsapp_webhook_events
  WHERE message_id = 'wamid.HBgMOTE5NzIzMzg0OTU3FQIAEhgUM0EzOEM0MkEwNUY2MTREOTA5MTgA'
    AND event_type = 'incoming_message'
  LIMIT 1;
  ```

Without `REPLAY_DRY_RUN=1`, the script will call `handleIncomingMessage` and may send WhatsApp messages.

## Usage Guidelines

Place standalone scripts here such as:

- Database migration utilities
- Data import/export scripts
- Maintenance tasks
- CLI tools for development

## Note

Regular application server modules should remain in the `server/` directory root. Only discrete executable scripts belong here.
