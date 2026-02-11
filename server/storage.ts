import {
  type Product,
  type Order,
  type FreeTrial,
  type Feedback,
  type InsertOrder,
  type InsertFreeTrial,
  type InsertFeedback,
  type WhatsappToken,
  type InsertWhatsappToken,
  type WebhookEvent,
  type FreeTrialRow,
  type InsertFreeTrialRow,
  type VoiceNoteRow,
  type InsertVoiceNoteRow,
  type AlbumRow,
  type InsertAlbumRow,
  type UserFeedbackRow,
  type InsertUserFeedbackRow,
  type TransactionRow,
  type InsertTransactionRow,
  type UpdateTransactionPayment,
  freeTrials,
  voiceNotes,
  albums,
  userFeedbacks,
  whatsappMessages,
  transactions,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import {
  eq,
  and,
  lte,
  lt,
  inArray,
  asc,
  desc,
  getTableColumns,
  isNotNull,
  isNull,
  sql,
  gte,
  or,
} from "drizzle-orm";

export interface IStorage {
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>;
  createFreeTrial(trial: InsertFreeTrial): Promise<FreeTrial>;
  getFreeTrial(id: string): Promise<FreeTrial | undefined>;

  createFreeTrialDb(trial: InsertFreeTrialRow): Promise<FreeTrialRow>;
  getFreeTrialDb(id: string): Promise<FreeTrialRow | undefined>;
  getFreeTrialByStorytellerPhone(
    phone: string,
  ): Promise<FreeTrialRow | undefined>;
  getFreeTrialByBuyerPhone(phone: string): Promise<FreeTrialRow | undefined>;
  getActiveTrialByStorytellerPhone(
    phone: string,
  ): Promise<FreeTrialRow | undefined>;
  getAllActiveTrialsByStorytellerPhone(phone: string): Promise<FreeTrialRow[]>;
  updateFreeTrialDb(
    id: string,
    updates: Partial<FreeTrialRow>,
  ): Promise<FreeTrialRow>;
  getFreeTrialsNeedingRetry(): Promise<FreeTrialRow[]>;
  getScheduledQuestionsDue(): Promise<FreeTrialRow[]>;
  getPendingReminders(): Promise<FreeTrialRow[]>;
  getTrialsNeedingBuyerReminder(): Promise<FreeTrialRow[]>;
  getTrialsNeedingBuyerNudge(): Promise<FreeTrialRow[]>;
  getTrialsNeedingCheckin(): Promise<FreeTrialRow[]>;
  getTrialsNeedingBuyerCheckin(): Promise<FreeTrialRow[]>;
  getTrialsNeedingBuyerFeedback(): Promise<FreeTrialRow[]>;
  getTrialsNeedingStorytellerFeedback(): Promise<FreeTrialRow[]>;
  getOldestTrialWithoutBuyerFeedback(
    phoneNumber: string,
  ): Promise<FreeTrialRow | undefined>;
  getOldestTrialWithoutStorytellerFeedback(
    phoneNumber: string,
  ): Promise<FreeTrialRow | undefined>;
  createUserFeedback(feedback: InsertUserFeedbackRow): Promise<UserFeedbackRow>;
  getUserFeedbackByTrialAndType(
    trialId: string,
    feedbackType: "buyer" | "storyteller",
  ): Promise<UserFeedbackRow | undefined>;
  updateUserFeedback(
    id: string,
    updates: Partial<UserFeedbackRow>,
  ): Promise<UserFeedbackRow>;

  createVoiceNote(voiceNote: InsertVoiceNoteRow): Promise<VoiceNoteRow>;
  getVoiceNoteById(id: string): Promise<VoiceNoteRow | undefined>;
  getVoiceNotesByTrialId(freeTrialId: string): Promise<VoiceNoteRow[]>;
  updateVoiceNote(
    id: string,
    updates: Partial<VoiceNoteRow>,
  ): Promise<VoiceNoteRow>;

  getStories(uniqueCode: string): Promise<any>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByOrderCode(orderCode: string): Promise<Feedback | undefined>;

  createWhatsappToken(token: InsertWhatsappToken): Promise<WhatsappToken>;
  getWhatsappToken(token: string): Promise<WhatsappToken | undefined>;
  consumeWhatsappToken(token: string): Promise<WhatsappToken | undefined>;

  isWebhookProcessed(idempotencyKey: string): Promise<boolean>;
  markWebhookProcessed(idempotencyKey: string): Promise<WebhookEvent>;

  getAllAlbums(): Promise<AlbumRow[]>;
  getAllAlbumsAdmin(): Promise<AlbumRow[]>; // Get all albums including inactive
  getAlbumByTitle(title: string): Promise<AlbumRow | undefined>;
  getAlbumById(id: string): Promise<AlbumRow | undefined>;
  getAlbumByIdIncludeInactive(id: string): Promise<AlbumRow | undefined>;
  createAlbum(album: InsertAlbumRow): Promise<AlbumRow>;
  updateAlbum(id: string, album: Partial<InsertAlbumRow>): Promise<AlbumRow>;
  deleteAlbum(id: string): Promise<void>;
  getTrialWithAlbum(
    trialId: string,
  ): Promise<{ trial: FreeTrialRow; album: AlbumRow | null } | null>;
  getQuestionByIndex(
    albumId: string,
    index: number,
    languagePreference?: string | null,
  ): Promise<string | undefined>;
  getTotalQuestionsForAlbum(
    albumId: string,
    languagePreference?: string | null,
  ): Promise<number>;

  // Transaction methods
  createTransaction(txn: InsertTransactionRow): Promise<TransactionRow>;
  getTransactionById(id: string): Promise<TransactionRow | undefined>;
  getTransactionByPaymentOrderId(paymentOrderId: string): Promise<TransactionRow | undefined>;
  getRecentPendingTransactions(limit: number): Promise<TransactionRow[]>;
  updateTransactionPayment(transactionId: string, paymentData: UpdateTransactionPayment): Promise<TransactionRow>;
  updateTransactionPaymentByOrderId(paymentOrderId: string, paymentData: UpdateTransactionPayment): Promise<TransactionRow | undefined>;
}

const initialProducts: Product[] = [
  {
    id: "military-veterans",
    name: "Military & Veterans",
    category: "Service Stories",
    price: 999,
    questionCount: 50,
    durationDays: 50,
    description:
      "Honor their service and sacrifice. Capture combat experiences, camaraderie, and life-changing moments.",
    image:
      "https://images.unsplash.com/photo-1562141292-a10cc3b8f8f7?w=800&h=600&fit=crop",
    features: [
      "50 thoughtfully crafted questions",
      "Daily WhatsApp delivery over 50 days",
      "Voice and text response options",
      "Professionally formatted digital memoir",
      "Unlimited family sharing link",
      "Priority email support",
    ],
    sampleQuestions: [
      "What motivated you to join the military?",
      "Describe your most challenging deployment experience.",
      "Who was your most influential commanding officer and why?",
      "What values did military service instill in you?",
      "How did your service change your perspective on life?",
    ],
  },
  {
    id: "grandparent-chronicles",
    name: "Grandparent Chronicles",
    category: "Family Legacy",
    price: 799,
    questionCount: 30,
    durationDays: 30,
    description:
      "Preserve generational wisdom, childhood memories, family traditions, and life lessons.",
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop",
    features: [
      "30 heartwarming questions",
      "Daily WhatsApp delivery over 30 days",
      "Voice and text response options",
      "Beautiful digital memoir",
      "Shareable family link",
      "Email support",
    ],
    sampleQuestions: [
      "What is your earliest childhood memory?",
      "Tell me about your parents and grandparents.",
      "What family traditions do you cherish most?",
      "What was life like when you were growing up?",
      "What advice would you give to future generations?",
    ],
  },
  {
    id: "career-life-lessons",
    name: "Career & Life Lessons",
    category: "Professional Journey",
    price: 1099,
    questionCount: 40,
    durationDays: 40,
    description:
      "Document professional achievements, career pivots, leadership experiences, and hard-earned wisdom.",
    image:
      "https://images.unsplash.com/photo-1560439513-74b037a25d84?w=800&h=600&fit=crop",
    features: [
      "40 career-focused questions",
      "Daily WhatsApp delivery over 40 days",
      "Voice and text response options",
      "Professional digital memoir",
      "Family sharing enabled",
      "Priority support",
    ],
    sampleQuestions: [
      "What was your first job and what did you learn?",
      "Describe a career-defining moment.",
      "What was your biggest professional challenge?",
      "Who mentored you and how did they impact your career?",
      "What would you tell your younger professional self?",
    ],
  },
  {
    id: "immigration-culture",
    name: "Immigration & Culture",
    category: "Cultural Heritage",
    price: 999,
    questionCount: 35,
    durationDays: 35,
    description:
      "Preserve immigration journeys, cultural heritage, adaptation stories, and traditions passed through generations.",
    image:
      "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=600&fit=crop",
    features: [
      "35 culturally sensitive questions",
      "Flexible delivery schedule",
      "Multilingual response support",
      "Cultural heritage memoir",
      "Unlimited family access",
      "Dedicated support team",
    ],
    sampleQuestions: [
      "What was life like in your homeland?",
      "Why did you decide to immigrate?",
      "What was your biggest challenge adapting to a new country?",
      "What traditions have you kept from your culture?",
      "How has your cultural identity evolved?",
    ],
  },
  {
    id: "healthcare-heroes",
    name: "Healthcare Heroes",
    category: "Medical Stories",
    price: 1199,
    questionCount: 45,
    durationDays: 45,
    description:
      "Capture compassionate care stories, patient connections, medical breakthroughs, and career highlights.",
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
    features: [
      "45 healthcare-focused questions",
      "Flexible scheduling for busy professionals",
      "HIPAA-compliant story collection",
      "Professional memoir format",
      "Private family sharing",
      "Priority support",
    ],
    sampleQuestions: [
      "Why did you choose a career in healthcare?",
      "Describe a patient who changed your perspective.",
      "What was your most challenging medical case?",
      "How has healthcare evolved during your career?",
      "What brings you the most fulfillment in your work?",
    ],
  },
  {
    id: "entrepreneur-legacy",
    name: "Entrepreneur Legacy",
    category: "Business Journey",
    price: 1299,
    questionCount: 50,
    durationDays: 50,
    description:
      "Document business ventures, entrepreneurial challenges, successes, failures, and insights.",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop",
    features: [
      "50 business-focused questions",
      "Flexible delivery schedule",
      "Voice and text responses",
      "Premium digital memoir",
      "Business insights documentation",
      "Dedicated account manager",
    ],
    sampleQuestions: [
      "What inspired you to start your first business?",
      "Describe your biggest business failure and what you learned.",
      "Who were your key mentors and advisors?",
      "What was your most pivotal business decision?",
      "What advice would you give aspiring entrepreneurs?",
    ],
  },
];

export class DatabaseStorage implements IStorage {
  private products: Map<string, Product>;
  private orders: Map<string, Order> = new Map();
  private freeTrialsLegacy: Map<string, FreeTrial> = new Map();
  private feedbacks: Map<string, Feedback> = new Map();
  private whatsappTokens: Map<string, WhatsappToken> = new Map();
  private webhookEvents: Map<string, WebhookEvent> = new Map();

  constructor() {
    this.products = new Map(initialProducts.map((p) => [p.id, p]));
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const uniqueCode = randomUUID().substring(0, 8);
    const order: Order = {
      ...insertOrder,
      id,
      uniqueCode,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) {
      throw new Error(`Order with id ${id} not found`);
    }
    const updatedOrder: Order = {
      ...order,
      ...updates,
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async createFreeTrial(insertTrial: InsertFreeTrial): Promise<FreeTrial> {
    const id = randomUUID();
    const trial: FreeTrial = {
      ...insertTrial,
      id,
      createdAt: new Date().toISOString(),
      conversationState: "awaiting_initial_contact",
      currentQuestionIndex: 0,
      retryCount: 0,
    };
    this.freeTrialsLegacy.set(id, trial);
    return trial;
  }

  async getFreeTrial(id: string): Promise<FreeTrial | undefined> {
    return this.freeTrialsLegacy.get(id);
  }

  async createFreeTrialDb(
    insertTrial: InsertFreeTrialRow,
  ): Promise<FreeTrialRow> {
    const [trial] = await db.insert(freeTrials).values(insertTrial).returning();
    return trial;
  }

  async getFreeTrialDb(id: string): Promise<FreeTrialRow | undefined> {
    const [trial] = await db
      .select(getTableColumns(freeTrials))
      .from(freeTrials)
      .where(eq(freeTrials.id, id));
    return trial;
  }

  async getFreeTrialByStorytellerPhone(
    phone: string,
  ): Promise<FreeTrialRow | undefined> {
    const [trial] = await db
      .select()
      .from(freeTrials)
      .where(eq(freeTrials.storytellerPhone, phone));
    return trial;
  }

  async getFreeTrialByBuyerPhone(
    phone: string,
  ): Promise<FreeTrialRow | undefined> {
    const [trial] = await db
      .select()
      .from(freeTrials)
      .where(eq(freeTrials.customerPhone, phone))
      .orderBy(asc(freeTrials.createdAt))
      .limit(1);
    return trial;
  }

  async getActiveTrialByStorytellerPhone(
    phone: string,
  ): Promise<FreeTrialRow | undefined> {
    const [trial] = await db
      .select()
      .from(freeTrials)
      .where(
        and(
          eq(freeTrials.storytellerPhone, phone),
          inArray(freeTrials.conversationState, [
            "in_progress",
            "awaiting_readiness",
          ]),
        ),
      )
      .orderBy(asc(freeTrials.createdAt))
      .limit(1);
    return trial;
  }

  async getAllActiveTrialsByStorytellerPhone(
    phone: string,
  ): Promise<FreeTrialRow[]> {
    const trials = await db
      .select()
      .from(freeTrials)
      .where(
        and(
          eq(freeTrials.storytellerPhone, phone),
          inArray(freeTrials.conversationState, [
            "in_progress",
            "awaiting_readiness",
          ]),
        ),
      )
      .orderBy(asc(freeTrials.createdAt));
    return trials;
  }

  async updateFreeTrialDb(
    id: string,
    updates: Partial<FreeTrialRow>,
  ): Promise<FreeTrialRow> {
    const [updatedTrial] = await db
      .update(freeTrials)
      .set(updates)
      .where(eq(freeTrials.id, id))
      .returning();

    if (!updatedTrial) {
      throw new Error(`Free trial with id ${id} not found`);
    }

    return updatedTrial;
  }

  async getFreeTrialsNeedingRetry(): Promise<FreeTrialRow[]> {
    const now = new Date();
    const trials = await db
      .select()
      .from(freeTrials)
      .where(
        and(
          eq(freeTrials.conversationState, "awaiting_readiness"),
          isNotNull(freeTrials.retryReadinessAt),
          lte(freeTrials.retryReadinessAt, now),
        ),
      );
    return trials;
  }

  async getScheduledQuestionsDue(): Promise<FreeTrialRow[]> {
    const now = new Date();
    const trials = await db
      .select()
      .from(freeTrials)
      .where(
        and(
          eq(freeTrials.conversationState, "in_progress"),
          isNotNull(freeTrials.nextQuestionScheduledFor),
          lte(freeTrials.nextQuestionScheduledFor, now),
        ),
      );
    return trials;
  }

  async getPendingReminders(): Promise<FreeTrialRow[]> {
    const now = new Date();
    const reminderThreshold = new Date(now.getTime() - 10 * 60 * 60 * 1000); // 10 hours
    const trials = await db
      .select()
      .from(freeTrials)
      .where(
        and(
          eq(freeTrials.conversationState, "in_progress"),
          lte(freeTrials.lastQuestionSentAt, reminderThreshold),
          sql`${freeTrials.questionReminderCount} < 3`,
        ),
      );

    // Filter trials that need reminders
    const filteredTrials = [];
    for (const trial of trials) {
      // Check if it's a conversational album
      // Use albumId if available, fallback to selectedAlbum for backward compatibility
      const albumIdentifier = trial.albumId;
      let album = albumIdentifier
        ? await this.getAlbumById(albumIdentifier)
        : null;
      if (!album && albumIdentifier) {
        album = await this.getAlbumByTitle(albumIdentifier);
      }
      const isConversationalAlbum = album?.isConversationalAlbum === true;

      if (isConversationalAlbum) {
        // For conversational albums: allow reminders if questionReminderCount < 2 (max 2 reminders)
        // Check if it's been 10 hours since lastQuestionSentAt (first reminder) or reminderSentAt (subsequent reminders)
        if (trial.questionReminderCount < 2) {
          const timeSinceLastAction = trial.reminderSentAt
            ? new Date(trial.reminderSentAt).getTime()
            : trial.lastQuestionSentAt
              ? new Date(trial.lastQuestionSentAt).getTime()
              : 0;

          if (
            timeSinceLastAction > 0 &&
            now.getTime() - timeSinceLastAction >= 10 * 60 * 60 * 1000
          ) {
            // Also check that nextQuestionScheduledFor is null or due (for questions 1, 2, 3 in batch)
            if (
              !trial.nextQuestionScheduledFor ||
              new Date(trial.nextQuestionScheduledFor) <= now
            ) {
              filteredTrials.push(trial);
            }
          }
        }
      } else {
        // For non-conversational albums: allow reminders if questionReminderCount < 2 (max 2 reminders)
        // Check if it's been 10 hours since lastQuestionSentAt (first reminder) or reminderSentAt (subsequent reminders)
        if (trial.questionReminderCount < 2) {
          const timeSinceLastAction = trial.reminderSentAt
            ? new Date(trial.reminderSentAt).getTime()
            : trial.lastQuestionSentAt
              ? new Date(trial.lastQuestionSentAt).getTime()
              : 0;

          if (
            timeSinceLastAction > 0 &&
            now.getTime() - timeSinceLastAction >= 10 * 60 * 60 * 1000
          ) {
            if (!trial.nextQuestionScheduledFor) {
              filteredTrials.push(trial);
            } else if (new Date(trial.nextQuestionScheduledFor) <= now) {
              filteredTrials.push(trial);
            }
          }
        }
      }
    }

    return filteredTrials;
  }

  async getTrialsNeedingBuyerReminder(): Promise<FreeTrialRow[]> {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const trials = await db
      .select()
      .from(freeTrials)
      .where(
        and(
          isNotNull(freeTrials.forwardLinkSentAt),
          lte(freeTrials.forwardLinkSentAt, fortyEightHoursAgo),
          sql`(${freeTrials.storytellerPhone} IS NULL OR ${freeTrials.conversationState} = 'awaiting_initial_contact')`,
          sql`${freeTrials.buyerNoContactReminderSentAt} IS NULL`,
        ),
      );

    return trials;
  }

  async getTrialsNeedingBuyerNudge(): Promise<FreeTrialRow[]> {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const trials = await db
      .select()
      .from(freeTrials)
      .where(
        and(
          isNotNull(freeTrials.customerPhone),
          isNull(freeTrials.storytellerPhone),
          isNull(freeTrials.noStorytellerBuyerNudgeSentAt),
          lte(freeTrials.createdAt, fortyEightHoursAgo),
        ),
      );

    return trials;
  }

  async getTrialsNeedingCheckin(): Promise<FreeTrialRow[]> {
    const now = new Date();

    const trials = await db
      .select()
      .from(freeTrials)
      .where(
        and(
          isNotNull(freeTrials.storytellerCheckinScheduledFor),
          lte(freeTrials.storytellerCheckinScheduledFor, now),
          isNotNull(freeTrials.storytellerPhone),
          sql`${freeTrials.storytellerCheckinSentAt} IS NULL`,
        ),
      );

    return trials;
  }

  async getTrialsNeedingBuyerCheckin(): Promise<FreeTrialRow[]> {
    const now = new Date();

    const trials = await db
      .select()
      .from(freeTrials)
      .where(
        and(
          isNotNull(freeTrials.buyerCheckinScheduledFor),
          lte(freeTrials.buyerCheckinScheduledFor, now),
          isNotNull(freeTrials.customerPhone),
          sql`${freeTrials.buyerCheckinSentAt} IS NULL`,
          isNotNull(freeTrials.storytellerCheckinSentAt), // Only if storyteller check-in was sent
        ),
      );

    return trials;
  }

  async getTrialsNeedingBuyerFeedback(): Promise<FreeTrialRow[]> {
    const now = new Date();
    const trials = await db
      .select(getTableColumns(freeTrials))
      .from(freeTrials)
      .innerJoin(
        userFeedbacks,
        and(
          eq(userFeedbacks.trialId, freeTrials.id),
          eq(userFeedbacks.feedbackType, "buyer"),
        ),
      )
      .where(
        and(
          isNotNull(freeTrials.customerPhone),
          isNotNull(userFeedbacks.scheduledFor),
          lte(userFeedbacks.scheduledFor, now),
          isNull(userFeedbacks.sentAt),
        ),
      );
    return trials;
  }

  async getTrialsNeedingStorytellerFeedback(): Promise<FreeTrialRow[]> {
    const now = new Date();
    const trials = await db
      .select(getTableColumns(freeTrials))
      .from(freeTrials)
      .innerJoin(
        userFeedbacks,
        and(
          eq(userFeedbacks.trialId, freeTrials.id),
          eq(userFeedbacks.feedbackType, "storyteller"),
        ),
      )
      .where(
        and(
          isNotNull(freeTrials.storytellerPhone),
          isNotNull(userFeedbacks.scheduledFor),
          lte(userFeedbacks.scheduledFor, now),
          isNull(userFeedbacks.sentAt),
        ),
      );
    return trials;
  }

  async getOldestTrialWithoutBuyerFeedback(
    phoneNumber: string,
  ): Promise<FreeTrialRow | undefined> {
    // Find trials where there's no buyer feedback row or buyer feedback rating is null
    const [trial] = await db
      .select(getTableColumns(freeTrials))
      .from(freeTrials)
      .leftJoin(
        userFeedbacks,
        and(
          eq(userFeedbacks.trialId, freeTrials.id),
          eq(userFeedbacks.feedbackType, "buyer"),
        ),
      )
      .where(
        and(
          eq(freeTrials.customerPhone, phoneNumber),
          sql`${userFeedbacks.id} IS NULL OR ${userFeedbacks.buyerFeedbackRating} IS NULL`,
        ),
      )
      .orderBy(asc(freeTrials.createdAt))
      .limit(1);
    return trial;
  }

  async getOldestTrialWithoutStorytellerFeedback(
    phoneNumber: string,
  ): Promise<FreeTrialRow | undefined> {
    // Find trials where there's no storyteller feedback row or voice note URL is null
    const [trial] = await db
      .select(getTableColumns(freeTrials))
      .from(freeTrials)
      .leftJoin(
        userFeedbacks,
        and(
          eq(userFeedbacks.trialId, freeTrials.id),
          eq(userFeedbacks.feedbackType, "storyteller"),
        ),
      )
      .where(
        and(
          eq(freeTrials.storytellerPhone, phoneNumber),
          sql`${userFeedbacks.id} IS NULL OR ${userFeedbacks.storytellerFeedbackVoiceNoteUrl} IS NULL`,
        ),
      )
      .orderBy(asc(freeTrials.createdAt))
      .limit(1);
    return trial;
  }

  async createUserFeedback(
    feedback: InsertUserFeedbackRow,
  ): Promise<UserFeedbackRow> {
    const [userFeedback] = await db
      .insert(userFeedbacks)
      .values({
        ...feedback,
        updatedAt: new Date(),
      })
      .returning();
    return userFeedback;
  }

  async getUserFeedbackByTrialAndType(
    trialId: string,
    feedbackType: "buyer" | "storyteller",
  ): Promise<UserFeedbackRow | undefined> {
    const [feedback] = await db
      .select()
      .from(userFeedbacks)
      .where(
        and(
          eq(userFeedbacks.trialId, trialId),
          eq(userFeedbacks.feedbackType, feedbackType),
        ),
      )
      .limit(1);
    return feedback;
  }

  async updateUserFeedback(
    id: string,
    updates: Partial<UserFeedbackRow>,
  ): Promise<UserFeedbackRow> {
    const [updatedFeedback] = await db
      .update(userFeedbacks)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userFeedbacks.id, id))
      .returning();

    if (!updatedFeedback) {
      throw new Error(`User feedback with id ${id} not found`);
    }

    return updatedFeedback;
  }

  async createVoiceNote(
    insertVoiceNote: InsertVoiceNoteRow,
  ): Promise<VoiceNoteRow> {
    const [voiceNote] = await db
      .insert(voiceNotes)
      .values(insertVoiceNote)
      .returning();
    return voiceNote;
  }

  async getVoiceNoteById(id: string): Promise<VoiceNoteRow | undefined> {
    const [note] = await db
      .select()
      .from(voiceNotes)
      .where(eq(voiceNotes.id, id))
      .limit(1);
    return note;
  }

  async getVoiceNotesByTrialId(freeTrialId: string): Promise<VoiceNoteRow[]> {
    const notes = await db
      .select()
      .from(voiceNotes)
      .where(eq(voiceNotes.freeTrialId, freeTrialId));
    return notes;
  }

  async updateVoiceNote(
    id: string,
    updates: Partial<VoiceNoteRow>,
  ): Promise<VoiceNoteRow> {
    const [updatedNote] = await db
      .update(voiceNotes)
      .set(updates)
      .where(eq(voiceNotes.id, id))
      .returning();

    if (!updatedNote) {
      throw new Error(`Voice note with id ${id} not found`);
    }

    return updatedNote;
  }

  async getStories(uniqueCode: string): Promise<any> {
    const order = Array.from(this.orders.values()).find(
      (o) => o.uniqueCode === uniqueCode,
    );

    if (!order) {
      return null;
    }

    const allProducts = await this.getAllProducts();

    let totalQuestions = 0;
    let primaryCategory = "Stories";

    for (const item of order.items) {
      const product = allProducts.find((p) => p.id === item.productId);
      if (product) {
        totalQuestions += product.questionCount * item.quantity;
        if (!primaryCategory || primaryCategory === "Stories") {
          primaryCategory = product.category;
        }
      }
    }

    return {
      elderName: "Your Loved One",
      category: primaryCategory,
      totalQuestions,
      responses: [],
    };
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const id = randomUUID();
    const feedback: Feedback = {
      ...insertFeedback,
      id,
      createdAt: new Date().toISOString(),
    };
    this.feedbacks.set(id, feedback);
    return feedback;
  }

  async getFeedbackByOrderCode(
    orderCode: string,
  ): Promise<Feedback | undefined> {
    return Array.from(this.feedbacks.values()).find(
      (f) => f.orderCode === orderCode,
    );
  }

  async createWhatsappToken(
    insertToken: InsertWhatsappToken,
  ): Promise<WhatsappToken> {
    const id = randomUUID();
    const token: WhatsappToken = {
      ...insertToken,
      id,
      createdAt: new Date().toISOString(),
    };
    this.whatsappTokens.set(token.token, token);
    return token;
  }

  async getWhatsappToken(token: string): Promise<WhatsappToken | undefined> {
    return this.whatsappTokens.get(token);
  }

  async consumeWhatsappToken(
    token: string,
  ): Promise<WhatsappToken | undefined> {
    const whatsappToken = this.whatsappTokens.get(token);
    if (!whatsappToken) {
      return undefined;
    }
    const consumedToken: WhatsappToken = {
      ...whatsappToken,
      consumedAt: new Date().toISOString(),
    };
    this.whatsappTokens.set(token, consumedToken);
    return consumedToken;
  }

  async isWebhookProcessed(idempotencyKey: string): Promise<boolean> {
    return this.webhookEvents.has(idempotencyKey);
  }

  async markWebhookProcessed(idempotencyKey: string): Promise<WebhookEvent> {
    const event: WebhookEvent = {
      idempotencyKey,
      processedAt: new Date().toISOString(),
    };
    this.webhookEvents.set(idempotencyKey, event);
    return event;
  }

  async getAllAlbums(): Promise<AlbumRow[]> {
    try {
      const allAlbums = await db
        .select()
        .from(albums)
        .where(eq(albums.isActive, true));
      return allAlbums;
    } catch (error: any) {
      // If table doesn't exist, return empty array with helpful error message
      if (
        error?.message?.includes("does not exist") ||
        error?.code === "42P01"
      ) {
        console.error(
          "Albums table does not exist. Please run the migration: npm run db:push or apply migrations/0001_add_albums.sql manually",
        );
        throw new Error(
          "Albums table not found. Please run database migration first.",
        );
      }
      throw error;
    }
  }

  async getAlbumByTitle(title: string): Promise<AlbumRow | undefined> {
    const [album] = await db
      .select()
      .from(albums)
      .where(and(eq(albums.title, title), eq(albums.isActive, true)));
    return album;
  }

  async getAlbumById(id: string): Promise<AlbumRow | undefined> {
    const [album] = await db
      .select()
      .from(albums)
      .where(and(eq(albums.id, id), eq(albums.isActive, true)));
    return album;
  }

  async getAlbumByIdIncludeInactive(id: string): Promise<AlbumRow | undefined> {
    const [album] = await db.select().from(albums).where(eq(albums.id, id));
    return album;
  }

  /**
   * Get album by ID or title in a single query (optimized for performance)
   */
  async getAlbumByIdOrTitle(identifier: string): Promise<AlbumRow | undefined> {
    const [album] = await db
      .select()
      .from(albums)
      .where(
        and(
          or(eq(albums.id, identifier), eq(albums.title, identifier)),
          eq(albums.isActive, true),
        ),
      )
      .limit(1);
    return album;
  }

  /**
   * Optimized method to fetch trial and album together in a single query
   * Uses LEFT JOIN to get both trial and album in one DB round-trip
   */
  async getTrialWithAlbum(
    trialId: string,
  ): Promise<{ trial: FreeTrialRow; album: AlbumRow | null } | null> {
    const result = await db
      .select({
        trial: freeTrials,
        album: albums,
      })
      .from(freeTrials)
      .leftJoin(
        albums,
        and(eq(freeTrials.albumId, albums.id), eq(albums.isActive, true)),
      )
      .where(eq(freeTrials.id, trialId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const { trial, album } = result[0];
    return { trial, album };
  }

  async getAllAlbumsAdmin(): Promise<AlbumRow[]> {
    try {
      const allAlbums = await db
        .select()
        .from(albums)
        .orderBy(albums.createdAt);
      return allAlbums;
    } catch (error: any) {
      if (
        error?.message?.includes("does not exist") ||
        error?.code === "42P01"
      ) {
        console.error(
          "Albums table does not exist. Please run the migration: npm run db:push or apply migrations/0001_add_albums.sql manually",
        );
        throw new Error(
          "Albums table not found. Please run database migration first.",
        );
      }
      throw error;
    }
  }

  async createAlbum(albumData: InsertAlbumRow): Promise<AlbumRow> {
    const [newAlbum] = await db.insert(albums).values(albumData).returning();
    return newAlbum;
  }

  async updateAlbum(
    id: string,
    albumData: Partial<InsertAlbumRow>,
  ): Promise<AlbumRow> {
    const [updatedAlbum] = await db
      .update(albums)
      .set({
        ...albumData,
        updatedAt: new Date(),
      })
      .where(eq(albums.id, id))
      .returning();
    if (!updatedAlbum) {
      throw new Error("Album not found");
    }
    return updatedAlbum;
  }

  async deleteAlbum(id: string): Promise<void> {
    const result = await db.delete(albums).where(eq(albums.id, id));
    if (result.rowCount === 0) {
      throw new Error("Album not found");
    }
  }

  async getQuestionByIndex(
    albumTitleOrId: string,
    index: number,
    languagePreference?: string | null,
  ): Promise<string | undefined> {
    // Try to find by title first (for backward compatibility)
    let album = await this.getAlbumByIdIncludeInactive(albumTitleOrId);
    // If not found by title, try by ID
    if (!album) {
      album = await this.getAlbumByTitle(albumTitleOrId);
    }
    if (!album) {
      return undefined;
    }

    // Use Hindi questions if preference is 'hn' and questions_hn exists and is not null
    if (
      languagePreference === "hn" &&
      album.questionsHn &&
      album.questionsHn.length > 0
    ) {
      if (index < album.questionsHn.length) {
        return album.questionsHn[index];
      }
    }

    // Fallback to English questions
    if (!album.questions || index >= album.questions.length) {
      return undefined;
    }
    return album.questions[index];
  }

  async getTotalQuestionsForAlbum(
    albumTitleOrId: string,
    languagePreference?: string | null,
  ): Promise<number> {
    // Try to find by title first (for backward compatibility)
    let album = await this.getAlbumByTitle(albumTitleOrId);
    // If not found by title, try by ID
    if (!album) {
      album = await this.getAlbumById(albumTitleOrId);
    }
    if (!album) {
      return 0;
    }

    // If Hindi preferred and questions_hn available, use that length
    if (
      languagePreference === "hn" &&
      album.questionsHn &&
      album.questionsHn.length > 0
    ) {
      return album.questionsHn.length;
    }

    // Fallback to English questions length
    if (!album.questions) {
      return 0;
    }
    return album.questions.length;
  }

  /**
   * Check if there are recent failed attempts to send a message with the same template to the same phone number
   * This helps prevent infinite retry loops
   */
  async hasRecentFailedAttempts(
    phoneNumber: string,
    templateName: string,
    withinMinutes: number = 60,
    maxAttempts: number = 3,
  ): Promise<boolean> {
    const result = await this.getRecentFailedAttempts(
      phoneNumber,
      templateName,
      withinMinutes,
    );
    return result.count >= maxAttempts;
  }

  /**
   * Get details about recent failed attempts
   * Returns count and last error message
   */
  async getRecentFailedAttempts(
    phoneNumber: string,
    templateName: string,
    withinMinutes: number = 60,
  ): Promise<{ count: number; lastError: string | null }> {
    const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);

    const failedMessages = await db
      .select()
      .from(whatsappMessages)
      .where(
        and(
          eq(whatsappMessages.to, phoneNumber),
          eq(whatsappMessages.messageTemplate, templateName),
          eq(whatsappMessages.status, "failed"),
          gte(whatsappMessages.createdAt, cutoffTime),
        ),
      )
      .orderBy(asc(whatsappMessages.createdAt));

    const lastError =
      failedMessages.length > 0
        ? failedMessages[failedMessages.length - 1].error || null
        : null;

    return {
      count: failedMessages.length,
      lastError,
    };
  }

  // Transaction methods implementation
  async createTransaction(txn: InsertTransactionRow): Promise<TransactionRow> {
    const [created] = await db.insert(transactions).values(txn).returning();
    return created;
  }

  async getTransactionById(id: string): Promise<TransactionRow | undefined> {
    const [txn] = await db.select().from(transactions).where(eq(transactions.id, id));
    return txn;
  }

  async getTransactionByPaymentOrderId(paymentOrderId: string): Promise<TransactionRow | undefined> {
    const [txn] = await db.select().from(transactions).where(eq(transactions.paymentOrderId, paymentOrderId));
    return txn;
  }

  async getRecentPendingTransactions(limit: number): Promise<TransactionRow[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.paymentStatus, "pending"))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async updateTransactionPayment(transactionId: string, paymentData: UpdateTransactionPayment): Promise<TransactionRow> {
    const [updated] = await db
      .update(transactions)
      .set({
        ...paymentData,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId))
      .returning();
    return updated;
  }

  async updateTransactionPaymentByOrderId(paymentOrderId: string, paymentData: UpdateTransactionPayment): Promise<TransactionRow | undefined> {
    const setData: Record<string, any> = { updatedAt: new Date() };

    if (paymentData.paymentStatus !== undefined) setData.paymentStatus = paymentData.paymentStatus;
    if (paymentData.paymentId !== undefined) setData.paymentId = paymentData.paymentId;
    if (paymentData.paymentTransactionId !== undefined) setData.paymentTransactionId = paymentData.paymentTransactionId;
    if (paymentData.paymentOrderId !== undefined) setData.paymentOrderId = paymentData.paymentOrderId;
    if (paymentData.paymentAmount !== undefined) setData.paymentAmount = paymentData.paymentAmount;

    const [updated] = await db
      .update(transactions)
      .set(setData)
      .where(eq(transactions.paymentOrderId, paymentOrderId))
      .returning();

    return updated;
  }
}

export const storage = new DatabaseStorage();
