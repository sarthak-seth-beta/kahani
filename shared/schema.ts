import { z } from "zod";
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  questionCount: z.number(),
  durationDays: z.number(),
  description: z.string(),
  sampleQuestions: z.array(z.string()),
  image: z.string(),
  features: z.array(z.string()),
});

export type Product = z.infer<typeof productSchema>;

export const orderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  price: z.number(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const insertOrderSchema = z.object({
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  total: z.number(),
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;

export const orderSchema = insertOrderSchema.extend({
  id: z.string(),
  uniqueCode: z.string(),
  paymentId: z.string().optional(),
  status: z.enum(["pending", "paid", "failed"]).default("pending"),
  customerPhoneE164: z.string().optional(),
  lastConfirmationSentAt: z.string().optional(),
  createdAt: z.string(),
});

export type Order = z.infer<typeof orderSchema>;

export const whatsappTokenSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
  consumedAt: z.string().optional(),
  createdAt: z.string(),
});

export type WhatsappToken = z.infer<typeof whatsappTokenSchema>;

export const insertWhatsappTokenSchema = z.object({
  orderId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
});

export type InsertWhatsappToken = z.infer<typeof insertWhatsappTokenSchema>;

export const webhookEventSchema = z.object({
  idempotencyKey: z.string(),
  processedAt: z.string(),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;

// Helper function to extract phone number part (without country code)
function extractPhoneNumberDigits(phone: string): string {
  // Known country codes with their lengths
  const countryCodes: Array<{ prefix: string; length: number }> = [
    { prefix: "+971", length: 3 }, // UAE
    { prefix: "+880", length: 3 }, // Bangladesh
    { prefix: "+886", length: 3 }, // Taiwan
    { prefix: "+852", length: 3 }, // Hong Kong
    { prefix: "+966", length: 3 }, // Saudi Arabia
    { prefix: "+965", length: 3 }, // Kuwait
    { prefix: "+974", length: 3 }, // Qatar
    { prefix: "+968", length: 3 }, // Oman
    { prefix: "+973", length: 3 }, // Bahrain
    { prefix: "+962", length: 3 }, // Jordan
    { prefix: "+961", length: 3 }, // Lebanon
    { prefix: "+358", length: 3 }, // Finland
    { prefix: "+380", length: 3 }, // Ukraine
    { prefix: "+351", length: 3 }, // Portugal
    { prefix: "+353", length: 3 }, // Ireland
    { prefix: "+44", length: 2 }, // UK
    { prefix: "+91", length: 2 }, // India
    { prefix: "+1", length: 1 }, // US/Canada
  ];

  // Try to match known country codes
  for (const { prefix, length } of countryCodes) {
    if (phone.startsWith(prefix)) {
      const withoutPrefix = phone.slice(prefix.length);
      return withoutPrefix.replace(/\D/g, "");
    }
  }

  // Default: remove + and first 1-3 digits (country code), then extract digits
  const withoutPlus = phone.replace(/^\+/, "");
  const phoneNumberPart = withoutPlus.replace(/^\d{1,3}/, "");
  return phoneNumberPart.replace(/\D/g, "");
}

export const insertFreeTrialSchema = z.object({
  customerPhone: z
    .string()
    .min(1, "Phone number is required")
    .refine(
      (phone) => {
        const phoneDigits = extractPhoneNumberDigits(phone);
        return phoneDigits.length === 10;
      },
      {
        message: "Phone number must be exactly 10 digits",
      },
    ),
  buyerName: z.string().min(2, "Name must be at least 2 characters"),
  storytellerName: z
    .string()
    .min(2, "Storyteller name must be at least 2 characters"),
  albumId: z.string().uuid("Album ID must be a valid UUID"),
  storytellerLanguagePreference: z.enum(["en", "hn", "other"]).default("en"),
});

export type InsertFreeTrial = z.infer<typeof insertFreeTrialSchema>;

export const freeTrialSchema = insertFreeTrialSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  storytellerPhone: z.string().optional(),
  conversationState: z
    .enum([
      "awaiting_initial_contact",
      "awaiting_readiness",
      "ready",
      "in_progress",
      "completed",
    ])
    .default("awaiting_initial_contact"),
  currentQuestionIndex: z.number().default(0),
  retryReadinessAt: z.string().optional(),
  retryCount: z.number().default(0),
  lastReadinessResponse: z.string().optional(),
  welcomeSentAt: z.string().optional(),
  readinessAskedAt: z.string().optional(),
  lastQuestionSentAt: z.string().optional(),
  reminderSentAt: z.string().optional(),
  nextQuestionScheduledFor: z.string().optional(),
});

export type FreeTrial = z.infer<typeof freeTrialSchema>;

export const voiceNoteSchema = z.object({
  id: z.string(),
  freeTrialId: z.string(),
  questionIndex: z.number(),
  questionText: z.string(),
  mediaId: z.string(),
  mediaUrl: z.string().optional(),
  localFilePath: z.string().optional(),
  mimeType: z.string().optional(),
  receivedAt: z.string(),
});

export type VoiceNote = z.infer<typeof voiceNoteSchema>;

export const insertVoiceNoteSchema = z.object({
  freeTrialId: z.string(),
  questionIndex: z.number(),
  questionText: z.string(),
  mediaId: z.string(),
  mediaUrl: z.string().optional(),
  localFilePath: z.string().optional(),
  mimeType: z.string().optional(),
});

export type InsertVoiceNote = z.infer<typeof insertVoiceNoteSchema>;

export const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
});

export type CartItem = z.infer<typeof cartItemSchema>;

const baseFeedbackSchema = z.object({
  orderCode: z.string().min(1, "Order code is required"),
  overallRating: z.number().min(1, "Overall rating is required").max(5),
  whatsappEase: z.enum([
    "very-easy",
    "easy",
    "neutral",
    "difficult",
    "very-difficult",
  ]),
  storyQuality: z.enum([
    "very-satisfied",
    "satisfied",
    "neutral",
    "dissatisfied",
    "very-dissatisfied",
  ]),
  wouldRecommend: z.enum([
    "definitely-yes",
    "probably-yes",
    "not-sure",
    "probably-not",
    "definitely-not",
  ]),
  writtenFeedback: z.string().max(500).optional(),
  allowTestimonial: z.boolean().default(false),
  testimonialName: z.string().optional(),
  testimonialRelationship: z.string().optional(),
  testimonialPhoto: z.string().optional(),
  allowFollowUp: z.boolean().default(false),
  followUpEmail: z.string().optional(),
  followUpPhone: z.string().optional(),
});

export const insertFeedbackSchema = baseFeedbackSchema.superRefine(
  (data, ctx) => {
    if (data.allowTestimonial) {
      if (!data.testimonialName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Name is required when allowing testimonial usage",
          path: ["testimonialName"],
        });
      }
      if (!data.testimonialRelationship) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Relationship is required when allowing testimonial usage",
          path: ["testimonialRelationship"],
        });
      }
    }
    if (data.allowFollowUp && !data.followUpEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required when allowing follow-up",
        path: ["followUpEmail"],
      });
    }
    if (
      data.allowFollowUp &&
      data.followUpEmail &&
      !z.string().email().safeParse(data.followUpEmail).success
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid email address",
        path: ["followUpEmail"],
      });
    }
  },
);

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export const feedbackSchema = baseFeedbackSchema.extend({
  id: z.string(),
  createdAt: z.string(),
});

export type Feedback = z.infer<typeof feedbackSchema>;

export const freeTrials = pgTable(
  "free_trials",
  {
    id: varchar("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
    buyerName: varchar("buyer_name", { length: 255 }).notNull(),
    storytellerName: varchar("storyteller_name", { length: 255 }).notNull(),
    albumId: varchar("album_id", { length: 255 })
      .notNull()
      .references(() => albums.id, { onDelete: "restrict" }),
    selectedAlbum: varchar("selected_album", { length: 255 }), // Optional, kept for backward compatibility
    storytellerPhone: varchar("storyteller_phone", { length: 20 }),
    conversationState: varchar("conversation_state", { length: 50 })
      .notNull()
      .default("awaiting_initial_contact"),
    currentQuestionIndex: integer("current_question_index")
      .notNull()
      .default(0),
    retryReadinessAt: timestamp("retry_readiness_at", { withTimezone: true }),
    retryCount: integer("retry_count").notNull().default(0),
    lastReadinessResponse: varchar("last_readiness_response", { length: 50 }),
    welcomeSentAt: timestamp("welcome_sent_at", { withTimezone: true }),
    readinessAskedAt: timestamp("readiness_asked_at", { withTimezone: true }),
    lastQuestionSentAt: timestamp("last_question_sent_at", {
      withTimezone: true,
    }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    questionReminderCount: integer("question_reminder_count")
      .notNull()
      .default(0),
    nextQuestionScheduledFor: timestamp("next_question_scheduled_for", {
      withTimezone: true,
    }),
    customCoverImageUrl: text("custom_cover_image_url"),
    storytellerLanguagePreference: varchar("storyteller_language_preference", {
      length: 2,
    }),
    forwardLinkSentAt: timestamp("forward_link_sent_at", {
      withTimezone: true,
    }),
    buyerNoContactReminderSentAt: timestamp(
      "buyer_no_contact_reminder_sent_at",
      { withTimezone: true },
    ),
    storytellerCheckinScheduledFor: timestamp(
      "storyteller_checkin_scheduled_for",
      { withTimezone: true },
    ),
    storytellerCheckinSentAt: timestamp("storyteller_checkin_sent_at", {
      withTimezone: true,
    }),
    buyerCheckinScheduledFor: timestamp("buyer_checkin_scheduled_for", {
      withTimezone: true,
    }),
    buyerCheckinSentAt: timestamp("buyer_checkin_sent_at", {
      withTimezone: true,
    }),
    noStorytellerBuyerNudgeSentAt: timestamp(
      "no_storyteller_buyer_nudge_sent_at",
      { withTimezone: true },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    conversationStateIdx: index("free_trials_conversation_state_idx").on(
      table.conversationState,
    ),
    retryReadinessIdx: index("free_trials_retry_readiness_at_idx").on(
      table.retryReadinessAt,
    ),
    nextQuestionScheduledIdx: index(
      "free_trials_next_question_scheduled_idx",
    ).on(table.nextQuestionScheduledFor),
    customerPhoneIdx: index("free_trials_customer_phone_idx").on(
      table.customerPhone,
    ),
    storytellerPhoneIdx: index("free_trials_storyteller_phone_idx").on(
      table.storytellerPhone,
    ),
    createdAtIdx: index("free_trials_created_at_idx").on(table.createdAt),
    storytellerPhoneStateIdx: index(
      "free_trials_storyteller_phone_state_idx",
    ).on(table.storytellerPhone, table.conversationState),
    stateLastQuestionIdx: index("free_trials_state_last_question_idx").on(
      table.conversationState,
      table.lastQuestionSentAt,
    ),
  }),
);

export type FreeTrialRow = typeof freeTrials.$inferSelect;
export type InsertFreeTrialRow = typeof freeTrials.$inferInsert;

export const voiceNotes = pgTable(
  "voice_notes",
  {
    id: varchar("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    freeTrialId: varchar("free_trial_id", { length: 255 })
      .notNull()
      .references(() => freeTrials.id, { onDelete: "cascade" }),
    questionIndex: integer("question_index").notNull(),
    questionText: text("question_text").notNull(),
    mediaId: varchar("media_id", { length: 255 }).notNull(),
    mediaUrl: text("media_url"),
    localFilePath: text("local_file_path"),
    mimeType: varchar("mime_type", { length: 100 }),
    mediaSha256: varchar("media_sha256", { length: 64 }),
    downloadStatus: varchar("download_status", { length: 20 })
      .notNull()
      .default("pending"),
    sizeBytes: integer("size_bytes"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    freeTrialIdIdx: index("voice_notes_free_trial_id_idx").on(
      table.freeTrialId,
    ),
    uniqueQuestionIdx: uniqueIndex("voice_notes_trial_question_idx").on(
      table.freeTrialId,
      table.questionIndex,
    ),
  }),
);

export type VoiceNoteRow = typeof voiceNotes.$inferSelect;
export type InsertVoiceNoteRow = typeof voiceNotes.$inferInsert;

export const userFeedbacks = pgTable(
  "user_feedbacks",
  {
    id: varchar("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    trialId: varchar("trial_id", { length: 255 })
      .notNull()
      .references(() => freeTrials.id, { onDelete: "cascade" }),
    feedbackType: varchar("feedback_type", { length: 20 }).notNull(),
    buyerFeedbackRating: integer("buyer_feedback_rating"),
    storytellerFeedbackVoiceNoteUrl: text(
      "storyteller_feedback_voice_note_url",
    ),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    thankYouSentAt: timestamp("thank_you_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    trialIdIdx: index("user_feedbacks_trial_id_idx").on(table.trialId),
    feedbackTypeIdx: index("user_feedbacks_feedback_type_idx").on(
      table.feedbackType,
    ),
    scheduledForIdx: index("user_feedbacks_scheduled_for_idx").on(
      table.scheduledFor,
    ),
    trialTypeUnique: uniqueIndex("user_feedbacks_trial_type_unique").on(
      table.trialId,
      table.feedbackType,
    ),
  }),
);

export type UserFeedbackRow = typeof userFeedbacks.$inferSelect;
export type InsertUserFeedbackRow = typeof userFeedbacks.$inferInsert;

export const albums = pgTable(
  "albums",
  {
    id: varchar("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: varchar("title", { length: 255 }).notNull().unique(),
    description: text("description").notNull(),
    questions: jsonb("questions").$type<string[]>().notNull(),
    questionsHn: jsonb("questions_hn").$type<string[]>(),
    coverImage: text("cover_image").notNull(),
    bestFitFor: jsonb("best_fit_for").$type<string[]>(),
    isActive: boolean("is_active").notNull().default(true),
    isConversationalAlbum: boolean("is_conversational_album")
      .notNull()
      .default(false),
    questionSetTitles: jsonb("question_set_titles").$type<{
      en: string[];
      hn: string[];
    }>(),
    questionSetPremise: jsonb("question_set_premise").$type<{
      en: string[];
      hn: string[];
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    titleIdx: uniqueIndex("albums_title_idx").on(table.title),
    isActiveIdx: index("albums_is_active_idx").on(table.isActive),
  }),
);

export type AlbumRow = typeof albums.$inferSelect;
export type InsertAlbumRow = typeof albums.$inferInsert;

export const albumSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  questions: z.array(z.string()),
  coverImage: z.string(),
  bestFitFor: z.array(z.string()).nullable().optional(),
  isActive: z.boolean(),
  isConversationalAlbum: z.boolean(),
  questionSetTitles: z
    .object({
      en: z.array(z.string()),
      hn: z.array(z.string()),
    })
    .nullable()
    .optional(),
  questionSetPremise: z
    .object({
      en: z.array(z.string()),
      hn: z.array(z.string()),
    })
    .nullable()
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Album = z.infer<typeof albumSchema>;

export const insertAlbumSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  questions: z.array(z.string()).min(1, "At least one question is required"),
  coverImage: z.string().url("Cover image must be a valid URL"),
  isActive: z.boolean().default(true),
});

export type InsertAlbum = z.infer<typeof insertAlbumSchema>;

// WhatsApp Logging Tables

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: varchar("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    messageId: varchar("message_id", { length: 255 }),
    from: varchar("from", { length: 50 }).notNull(),
    to: varchar("to", { length: 50 }).notNull(),
    orderId: varchar("order_id", { length: 255 }),
    messageTemplate: varchar("message_template", { length: 255 }),
    messageType: varchar("message_type", { length: 100 }).notNull(),
    messageCategory: varchar("message_category", { length: 50 }).notNull(),
    messagePayload: jsonb("message_payload")
      .notNull()
      .$type<Record<string, any>>(),
    status: varchar("status", { length: 50 }).notNull().default("sent"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    messageIdIdx: index("whatsapp_messages_message_id_idx").on(table.messageId),
    orderIdIdx: index("whatsapp_messages_order_id_idx").on(table.orderId),
    createdAtIdx: index("whatsapp_messages_created_at_idx").on(table.createdAt),
    fromToIdx: index("whatsapp_messages_from_to_idx").on(table.from, table.to),
  }),
);

export type WhatsAppMessageRow = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessageRow = typeof whatsappMessages.$inferInsert;

export const whatsappWebhookEvents = pgTable(
  "whatsapp_webhook_events",
  {
    id: varchar("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    messageId: varchar("message_id", { length: 255 }),
    from: varchar("from", { length: 50 }),
    to: varchar("to", { length: 50 }),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    responsePayload: jsonb("response_payload")
      .notNull()
      .$type<Record<string, any>>(),
    mediaUrl: text("media_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    messageIdIdx: index("whatsapp_webhook_events_message_id_idx").on(
      table.messageId,
    ),
    eventTypeIdx: index("whatsapp_webhook_events_event_type_idx").on(
      table.eventType,
    ),
    createdAtIdx: index("whatsapp_webhook_events_created_at_idx").on(
      table.createdAt,
    ),
    responsePayloadGinIdx: index(
      "whatsapp_webhook_events_response_payload_gin_idx",
    ).on(table.responsePayload),
  }),
);

export type WhatsAppWebhookEventRow = typeof whatsappWebhookEvents.$inferSelect;
export type InsertWhatsAppWebhookEventRow =
  typeof whatsappWebhookEvents.$inferInsert;

// Zod schemas for validation
export const insertWhatsAppMessageSchema = z.object({
  messageId: z.string().optional(),
  from: z.string().min(1),
  to: z.string().min(1),
  orderId: z.string().optional(),
  messageTemplate: z.string().optional(),
  messageType: z.string().min(1),
  messageCategory: z.enum(["text", "template", "media", "interactive"]),
  messagePayload: z.record(z.any()),
  status: z
    .enum([
      "queued",
      "sent",
      "delivered",
      "read",
      "failed",
      "dropped",
      "unknown",
    ])
    .default("sent"),
  error: z.string().optional(),
});

export type InsertWhatsAppMessage = z.infer<typeof insertWhatsAppMessageSchema>;

export const insertWhatsAppWebhookEventSchema = z.object({
  messageId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  eventType: z.string().min(1),
  responsePayload: z.record(z.any()),
  mediaUrl: z.string().url().optional(),
});

export type InsertWhatsAppWebhookEvent = z.infer<
  typeof insertWhatsAppWebhookEventSchema
>;

// Traffic Sources Tracking Table
export const trafficSources = pgTable("traffic_sources", {
  source: varchar("source", { length: 50 }).primaryKey(),
  count: integer("count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TrafficSourceRow = typeof trafficSources.$inferSelect;
export type InsertTrafficSourceRow = typeof trafficSources.$inferInsert;

// Transactions Table for Payment Flow (one row per payment attempt)
export const transactions = pgTable(
  "transactions",
  {
    id: varchar("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    phoneE164: varchar("phone_e164", { length: 20 }),

    // Payment tracking fields
    paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
    paymentId: varchar("payment_id", { length: 255 }),
    paymentTransactionId: varchar("payment_transaction_id", { length: 255 }),
    paymentOrderId: varchar("payment_order_id", { length: 255 }),
    paymentAmount: integer("payment_amount"),
    packageType: varchar("package_type", { length: 20 }),
    albumId: varchar("album_id", { length: 255 }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    phoneIdx: index("transactions_phone_idx").on(table.phone),
    paymentOrderIdIdx: index("transactions_payment_order_id_idx").on(table.paymentOrderId),
    paymentStatusIdx: index("transactions_payment_status_idx").on(table.paymentStatus),
  }),
);

export type TransactionRow = typeof transactions.$inferSelect;
export type InsertTransactionRow = typeof transactions.$inferInsert;

// Zod schemas for transactions
export const insertTransactionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  phoneE164: z.string().optional(),
  albumId: z.string().uuid("Album ID must be a valid UUID"),
  packageType: z.enum(["digital", "ebook", "printed"]),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export const transactionSchema = insertTransactionSchema.extend({
  id: z.string(),
  paymentStatus: z.enum(["pending", "success", "failed"]).default("pending"),
  paymentId: z.string().optional(),
  paymentTransactionId: z.string().optional(),
  paymentOrderId: z.string().optional(),
  paymentAmount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const updateTransactionPaymentSchema = z.object({
  paymentStatus: z.enum(["pending", "success", "failed"]),
  paymentId: z.string().optional(),
  paymentTransactionId: z.string().optional(),
  paymentOrderId: z.string().optional(),
  paymentAmount: z.number().optional(),
});

export type UpdateTransactionPayment = z.infer<typeof updateTransactionPaymentSchema>;
