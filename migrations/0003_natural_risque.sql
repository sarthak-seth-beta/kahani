CREATE TABLE "albums" (
	"id" varchar PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"questions" jsonb NOT NULL,
	"questions_hn" jsonb,
	"cover_image" text NOT NULL,
	"best_fit_for" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "albums_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" varchar PRIMARY KEY NOT NULL,
	"message_id" varchar(255),
	"from" varchar(50) NOT NULL,
	"to" varchar(50) NOT NULL,
	"order_id" varchar(255),
	"message_template" varchar(255),
	"message_type" varchar(100) NOT NULL,
	"message_category" varchar(50) NOT NULL,
	"message_payload" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_webhook_events" (
	"id" varchar PRIMARY KEY NOT NULL,
	"message_id" varchar(255),
	"from" varchar(50),
	"to" varchar(50),
	"event_type" varchar(50) NOT NULL,
	"response_payload" jsonb NOT NULL,
	"media_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "free_trials" ADD COLUMN "question_reminder_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "free_trials" ADD COLUMN "custom_cover_image_url" text;--> statement-breakpoint
ALTER TABLE "free_trials" ADD COLUMN "storyteller_language_preference" varchar(2);--> statement-breakpoint
CREATE UNIQUE INDEX "albums_title_idx" ON "albums" USING btree ("title");--> statement-breakpoint
CREATE INDEX "albums_is_active_idx" ON "albums" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_message_id_idx" ON "whatsapp_messages" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_order_id_idx" ON "whatsapp_messages" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_created_at_idx" ON "whatsapp_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_from_to_idx" ON "whatsapp_messages" USING btree ("from","to");--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_message_id_idx" ON "whatsapp_webhook_events" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_event_type_idx" ON "whatsapp_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_created_at_idx" ON "whatsapp_webhook_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_response_payload_gin_idx" ON "whatsapp_webhook_events" USING btree ("response_payload");--> statement-breakpoint
CREATE INDEX "free_trials_customer_phone_idx" ON "free_trials" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "free_trials_storyteller_phone_idx" ON "free_trials" USING btree ("storyteller_phone");--> statement-breakpoint
CREATE INDEX "free_trials_created_at_idx" ON "free_trials" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "free_trials_storyteller_phone_state_idx" ON "free_trials" USING btree ("storyteller_phone","conversation_state");--> statement-breakpoint
CREATE INDEX "free_trials_state_last_question_idx" ON "free_trials" USING btree ("conversation_state","last_question_sent_at");