import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { WebClient } from "@slack/web-api";
import { storage } from "./storage";
import { verifySlackRequest } from "./slackVerify";
import {
  insertOrderSchema,
  insertFreeTrialSchema,
  insertFeedbackSchema,
  PACKAGE_PRICES,
} from "@shared/schema";
import { logWebhookEvent, correlateWebhookToMessage } from "./whatsappLogger";
import { sendErrorAlertEmail } from "./email";
import { trackServerEvent, initPostHog } from "./posthog";

// Base URL used for PhonePe callback URLs — must be HTTPS in production.
// Set PHONEPE_CALLBACK_BASE_URL explicitly when APP_BASE_URL is localhost.
function phonePeCallbackBase(): string {
  return (
    process.env.PHONEPE_CALLBACK_BASE_URL ||
    process.env.APP_BASE_URL ||
    "http://localhost:3000"
  );
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize PostHog for server-side tracking
  initPostHog();

  // Configure multer for file uploads (memory storage)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only image files
      const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only images are allowed."));
      }
    },
  });

  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Admin endpoint: Get daily free trial counts
  app.get("/api/admin/daily-free-trials", async (req, res) => {
    try {
      // Disable caching for admin endpoints to ensure fresh data
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      });

      const { pool } = await import("./db");

      // Get date range from query params (if no dates provided, fetch all data)
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      let dateFilter = "1=1"; // Fetch all data if no date range provided
      if (startDate && endDate) {
        dateFilter = `created_at >= '${startDate}'::date AND created_at < ('${endDate}'::date + INTERVAL '1 day')`;
      } else if (startDate) {
        dateFilter = `created_at >= '${startDate}'::date`;
      } else if (endDate) {
        dateFilter = `created_at < ('${endDate}'::date + INTERVAL '1 day')`;
      }

      // Query to get daily counts - simple and straightforward
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*)::int as count
        FROM free_trials
        WHERE ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      const result = await pool.query(query);

      // Format the data for the chart
      const dailyData = result.rows.map((row: any) => {
        const dateObj =
          row.date instanceof Date ? row.date : new Date(row.date);
        const dateStr = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD format

        return {
          date: dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          count: Number(row.count),
          fullDate: dateStr,
        };
      });

      res.json(dailyData);
    } catch (error: any) {
      console.error("Error fetching daily free trials:", error);
      res.status(500).json({
        error: "Failed to fetch daily free trials",
        message: error.message,
      });
    }
  });

  // Admin endpoint: Export free trials as CSV (all columns, raw data)
  app.get("/api/admin/export-free-trials", async (req, res) => {
    try {
      const { pool } = await import("./db");

      // Query ALL columns from free_trials table
      const query = `SELECT * FROM free_trials ORDER BY created_at DESC`;
      const result = await pool.query(query);

      if (result.rows.length === 0) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="free_trials_empty.csv"`,
        );
        return res.send("No data");
      }

      // Get column names from the first row
      const columns = Object.keys(result.rows[0]);

      // Columns that contain phone numbers (should be treated as text in Excel)
      const phoneColumns = ["customer_phone", "storyteller_phone", "phone"];

      // Generate CSV with all columns
      const csvRows = [columns.join(",")];

      for (const row of result.rows) {
        const values = columns.map((col) => {
          const val = row[col];
          if (val === null || val === undefined) {
            return "";
          }
          // Force phone numbers to be text by prefixing with = and wrapping in quotes
          // This tells Excel to treat it as a text formula
          if (phoneColumns.includes(col) && val) {
            return `="${String(val)}"`;
          }
          if (typeof val === "object") {
            return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          }
          if (
            typeof val === "string" &&
            (val.includes(",") || val.includes('"') || val.includes("\n"))
          ) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        });
        csvRows.push(values.join(","));
      }

      const csv = csvRows.join("\n");

      // Set headers for CSV download
      const filename = `free_trials_${new Date().toISOString().split("T")[0]}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(csv);
    } catch (error: any) {
      console.error("Error exporting free trials:", error);
      res.status(500).json({
        error: "Failed to export free trials",
        message: error.message,
      });
    }
  });

  // Admin endpoint: Return sheet sync data as JSON for Google Apps Script
  app.get("/api/admin/sheet-sync-data", async (req, res) => {
    try {
      // Simple API key auth
      const apiKey = req.query.key as string;
      const expectedKey = process.env.SHEET_SYNC_API_KEY;
      if (!expectedKey || apiKey !== expectedKey) {
        return res.status(401).json({ error: "Invalid or missing API key" });
      }

      const { pool } = await import("./db");

      const query = `
        SELECT
          ft.id as trial_id,
          ft.buyer_name,
          ft.customer_phone,
          ft.storyteller_name,
          ft.storyteller_phone,
          ft.created_at,
          ft.conversation_state,
          ft.current_question_index,
          ft.retry_count,
          ft.storyteller_language_preference,
          ft.custom_cover_image_url,
          a.title as album_title,
          a.is_active as album_is_active,
          a.best_fit_for as album_best_fit_for,
          t.package_type,
          t.discount_code_applied,
          t.payment_amount,
          t.expected_amount_paise,
          t.payment_transaction_id,
          CASE WHEN uod.id IS NOT NULL THEN true ELSE false END as has_book_form,
          uod.additional_copies
        FROM free_trials ft
        LEFT JOIN albums a ON ft.album_id = a.id
        LEFT JOIN LATERAL (
          SELECT * FROM transactions t2
          WHERE t2.album_id::text = ft.album_id
            AND TRIM(LEADING '+' FROM t2.phone) = TRIM(LEADING '+' FROM ft.customer_phone)
          ORDER BY (t2.trial_id = ft.id) DESC NULLS LAST,
                   CASE WHEN t2.payment_status = 'success' THEN 0 ELSE 1 END,
                   t2.created_at DESC
          LIMIT 1
        ) t ON true
        LEFT JOIN LATERAL (
          SELECT id, additional_copies FROM user_order_details uod2
          WHERE uod2.trial_id = ft.id
          LIMIT 1
        ) uod ON true
        ORDER BY ft.created_at DESC
      `;

      const result = await pool.query(query);

      // Map rows to the sheet column format
      const rows = result.rows.map((row: any) => {
        const createdAt = row.created_at
          ? new Date(row.created_at).toISOString().split("T")[0]
          : "";
        const isCustomAlbum =
          row.album_is_active === false && row.album_best_fit_for != null
            ? "Yes"
            : "No";
        const amountPaid =
          row.expected_amount_paise != null
            ? (row.expected_amount_paise / 100).toFixed(2)
            : "";
        const isCompleted =
          row.conversation_state === "completed" ? "Yes" : "No";
        const langMap: Record<string, string> = {
          en: "English",
          hn: "Hindi",
        };
        const language =
          langMap[row.storyteller_language_preference] ||
          row.storyteller_language_preference ||
          "";
        const skuMap: Record<string, string> = {
          digital: "Voice Only",
          ebook: "Digital Book",
          printed: "Physical Book",
        };
        const photoUploaded = row.custom_cover_image_url ? "Yes" : "No";

        return {
          kahaniLink: `https://kahani.xyz/playlist-albums/${row.trial_id}`,
          trialId: row.trial_id || "",
          questionIndex:
            row.current_question_index != null
              ? row.current_question_index
              : "",
          buyerName: row.buyer_name || "",
          buyerNumber: row.customer_phone || "",
          storytellerName: row.storyteller_name || "",
          storytellerNumber: row.storyteller_phone || "",
          date: createdAt,
          albumTitle: row.album_title || "",
          customAlbum: isCustomAlbum,
          skuSelected: skuMap[row.package_type] || row.package_type || "",
          discountCodeUsed: row.discount_code_applied || "",
          amountPaid: amountPaid,
          paymentTransactionId: row.payment_transaction_id || "",
          conversationState: row.conversation_state || "",
          completed: isCompleted,
          questionCount:
            row.current_question_index != null
              ? row.current_question_index
              : "",
          retryCount: row.retry_count != null ? row.retry_count : "",
          languageSelected: language,
          photoUploaded: photoUploaded,
          bookForm: row.has_book_form ? "Yes" : "No",
          noOfBooks: row.additional_copies != null ? row.additional_copies : "",
        };
      });

      res.json({
        success: true,
        count: rows.length,
        syncedAt: new Date().toISOString(),
        rows,
      });
    } catch (error: any) {
      console.error("Error fetching sheet sync data:", error);
      res.status(500).json({
        error: "Failed to fetch sheet sync data",
        message: error.message,
      });
    }
  });

  // Slack slash command — exports free_trials to CSV and posts to channel
  app.post("/api/slack/export-free-trials", async (req, res) => {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    const slackToken = process.env.SLACK_BOT_TOKEN;
    const rawBody = (req as { rawBody?: Buffer }).rawBody;
    const signature = req.headers["x-slack-signature"] as string | undefined;
    const timestamp = req.headers["x-slack-request-timestamp"] as
      | string
      | undefined;

    if (!signingSecret || !slackToken) {
      console.error("[Slack] Missing SLACK_SIGNING_SECRET or SLACK_BOT_TOKEN");
      return res.status(500).send("Slack integration not configured");
    }

    if (!verifySlackRequest(signingSecret, signature, timestamp, rawBody)) {
      return res.status(401).send("Invalid signature");
    }

    const channelId = req.body?.channel_id as string | undefined;
    if (!channelId) {
      return res.status(400).send("Missing channel_id");
    }

    // Respond immediately (Slack requires response within 3 seconds)
    res.status(200).send("Exporting trials... I'll post the CSV shortly.");

    // Run export in background
    (async () => {
      try {
        const { pool } = await import("./db");
        const query = `SELECT * FROM free_trials ORDER BY created_at DESC`;
        const result = await pool.query(query);

        const phoneColumns = ["customer_phone", "storyteller_phone", "phone"];
        const columns =
          result.rows.length > 0 ? Object.keys(result.rows[0]) : [];

        const csvRows =
          result.rows.length === 0
            ? ["No data"]
            : [
                columns.join(","),
                ...result.rows.map((row: Record<string, unknown>) =>
                  columns
                    .map((col) => {
                      const val = row[col];
                      if (val === null || val === undefined) return "";
                      if (phoneColumns.includes(col) && val)
                        return `="${String(val)}"`;
                      if (typeof val === "object")
                        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
                      if (
                        typeof val === "string" &&
                        (val.includes(",") ||
                          val.includes('"') ||
                          val.includes("\n"))
                      )
                        return `"${String(val).replace(/"/g, '""')}"`;
                      return String(val);
                    })
                    .join(","),
                ),
              ];

        const csv = csvRows.join("\n");
        const dateStr = new Date().toISOString().split("T")[0];
        const filename = `free_trials_${dateStr}.csv`;
        const rowCount = result.rows.length;

        const slack = new WebClient(slackToken);
        const { ok, error: uploadError } = await slack.files.uploadV2({
          content: csv,
          filename,
          channel_id: channelId,
          initial_comment: `Free trials export (${rowCount} rows) — ${dateStr}`,
        });

        if (!ok || uploadError) {
          console.error("[Slack] Upload failed:", uploadError);
        }
      } catch (err) {
        console.error("[Slack] Export failed:", err);
      }
    })();
  });

  // Admin endpoint: Get daily WhatsApp messages (outgoing and incoming)
  app.get("/api/admin/daily-whatsapp-messages", async (req, res) => {
    try {
      // Disable caching for admin endpoints to ensure fresh data
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      });

      const { pool } = await import("./db");

      // Get date range from query params (if no dates provided, fetch all data)
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      let dateFilter = "1=1"; // Fetch all data if no date range provided
      if (startDate && endDate) {
        dateFilter = `created_at >= '${startDate}'::date AND created_at < ('${endDate}'::date + INTERVAL '1 day')`;
      } else if (startDate) {
        dateFilter = `created_at >= '${startDate}'::date`;
      } else if (endDate) {
        dateFilter = `created_at < ('${endDate}'::date + INTERVAL '1 day')`;
      }

      // Query to get daily counts from both tables
      const query = `
        WITH outgoing AS (
          SELECT 
            DATE(created_at) as date,
            COUNT(*)::int as count
          FROM whatsapp_messages
          WHERE ${dateFilter}
          GROUP BY DATE(created_at)
        ),
        incoming AS (
          SELECT 
            DATE(created_at) as date,
            COUNT(*)::int as count
          FROM whatsapp_webhook_events
          WHERE ${dateFilter}
          GROUP BY DATE(created_at)
        ),
        all_dates AS (
          SELECT date FROM outgoing
          UNION
          SELECT date FROM incoming
        )
        SELECT 
          ad.date,
          COALESCE(o.count, 0)::int as outgoing_count,
          COALESCE(i.count, 0)::int as incoming_count
        FROM all_dates ad
        LEFT JOIN outgoing o ON ad.date = o.date
        LEFT JOIN incoming i ON ad.date = i.date
        ORDER BY ad.date ASC
      `;

      const result = await pool.query(query);

      // Format the data for the chart
      const dailyData = result.rows.map((row: any) => {
        const dateObj =
          row.date instanceof Date ? row.date : new Date(row.date);
        const dateStr = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD format

        return {
          date: dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          outgoing: Number(row.outgoing_count),
          incoming: Number(row.incoming_count),
          fullDate: dateStr,
        };
      });

      res.json(dailyData);
    } catch (error: any) {
      console.error("Error fetching daily WhatsApp messages:", error);
      res.status(500).json({
        error: "Failed to fetch daily WhatsApp messages",
        message: error.message,
      });
    }
  });

  // Admin endpoint: Get traffic sources (source, count, created_at, updated_at)
  app.get("/api/admin/traffic-sources", async (req, res) => {
    try {
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      });

      const { pool } = await import("./db");

      // Try with created_at/updated_at first; fallback to source+count if columns missing (e.g. old DB)
      let result: { rows: Record<string, unknown>[] };
      try {
        result = await pool.query(
          `SELECT source, count, created_at, updated_at FROM traffic_sources ORDER BY count DESC`,
        );
      } catch (queryErr: any) {
        const msg = String(queryErr?.message || queryErr);
        if (
          msg.includes("created_at") ||
          msg.includes("updated_at") ||
          msg.includes("does not exist")
        ) {
          result = await pool.query(
            `SELECT source, count FROM traffic_sources ORDER BY count DESC`,
          );
        } else {
          throw queryErr;
        }
      }

      const toIso = (raw: unknown): string | null => {
        if (raw instanceof Date && !Number.isNaN((raw as Date).getTime())) {
          return (raw as Date).toISOString();
        }
        if (raw != null) {
          const d = new Date(raw as string | number);
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        }
        return null;
      };

      const rows = result.rows.map((row: Record<string, unknown>) => ({
        source: String(row.source),
        count: Number(row.count),
        created_at: toIso(row.created_at ?? row.createdAt),
        updated_at: toIso(row.updated_at ?? row.updatedAt),
      }));

      res.json(rows);
    } catch (error: any) {
      console.error("Error fetching traffic sources:", error);
      res.status(500).json({
        error: "Failed to fetch traffic sources",
        message: error.message,
      });
    }
  });

  // Admin endpoint: Get all albums (including inactive)
  app.get("/api/admin/albums", async (req, res) => {
    try {
      // Disable caching for admin endpoints to ensure fresh data
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      });

      const allAlbums = await storage.getAllAlbumsAdmin();
      // Transform to match frontend expectations
      const albumsResponse = allAlbums.map((album) => ({
        id: album.id,
        title: album.title,
        description: album.description,
        questions: album.questions || [],
        questions_hn: album.questionsHn || null,
        cover_image: album.coverImage,
        best_fit_for: album.bestFitFor || null,
        is_active: album.isActive,
        created_at: album.createdAt?.toISOString() || "",
        updated_at: album.updatedAt?.toISOString() || "",
      }));
      res.json(albumsResponse);
    } catch (error: any) {
      console.error("Error fetching albums:", error);
      res.status(500).json({
        error: "Failed to fetch albums",
        message: error.message,
      });
    }
  });

  // Admin endpoint: Upload album cover image (temporary)
  app.post(
    "/api/admin/albums/upload-image",
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        // Check if file was uploaded
        if (!req.file) {
          return res.status(400).json({ error: "No image file provided" });
        }

        // Validate file type
        const allowedMimeTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            error:
              "Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.",
          });
        }

        // Validate file size
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
          return res.status(400).json({
            error: "File size exceeds 10MB limit",
          });
        }

        // Generate unique temporary filename
        const { randomUUID } = await import("crypto");
        const tempFileName = `temp-${randomUUID()}`;

        // Compress image before upload
        const { compressImage } = await import("./supabase");
        const { uploadImageToR2 } = await import("./r2");
        const originalBuffer = Buffer.from(req.file.buffer);
        const { buffer: compressedBuffer, mimeType: compressedMimeType } =
          await compressImage(originalBuffer, req.file.mimetype);

        // Upload compressed image to Cloudflare R2 Storage
        const r2Url = await uploadImageToR2(
          compressedBuffer,
          tempFileName,
          compressedMimeType,
        );

        if (!r2Url) {
          console.error("Failed to upload image to Cloudflare R2 Storage");
          return res.status(500).json({
            error: "Failed to upload image. Please try again later.",
          });
        }

        // Extract filename from URL for later deletion if needed
        const urlParts = r2Url.split("/");
        const fileName = urlParts[urlParts.length - 1];

        res.json({
          success: true,
          imageUrl: r2Url,
          fileName: fileName, // Return filename for cleanup if album save fails
          message: "Image uploaded successfully",
        });
      } catch (error: any) {
        console.error("Error uploading album cover image:", error);
        if (error.message === "Invalid file type. Only images are allowed.") {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({
          error: "Failed to upload image",
          message: error.message || "Internal server error",
        });
      }
    },
  );

  // Admin endpoint: Delete album cover image
  app.delete("/api/admin/albums/delete-image", async (req, res) => {
    try {
      const { fileName } = req.body;

      if (!fileName) {
        return res.status(400).json({ error: "File name is required" });
      }

      const { deleteImageFromR2 } = await import("./r2");
      const deleted = await deleteImageFromR2(fileName);

      if (!deleted) {
        return res.status(500).json({
          error: "Failed to delete image",
        });
      }

      res.json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting album cover image:", error);
      res.status(500).json({
        error: "Failed to delete image",
        message: error.message || "Internal server error",
      });
    }
  });

  // Admin endpoint: Create new album
  app.post("/api/admin/albums", async (req, res) => {
    let uploadedImageFileName: string | null = null;

    try {
      const { insertAlbumSchema } = await import("@shared/schema");
      const validatedData = insertAlbumSchema.parse(req.body);

      // Extract uploaded image filename if provided (for cleanup on failure)
      uploadedImageFileName = req.body.uploadedImageFileName || null;

      // Transform to database format
      const albumData = {
        title: validatedData.title,
        description: validatedData.description,
        questions: validatedData.questions,
        questionsHn: (req.body.questionsHn as string[]) || null,
        coverImage: validatedData.coverImage,
        bestFitFor: (req.body.bestFitFor as string[]) || null,
        isActive: validatedData.isActive ?? true,
      };

      const newAlbum = await storage.createAlbum(albumData);

      // Transform response
      res.status(201).json({
        id: newAlbum.id,
        title: newAlbum.title,
        description: newAlbum.description,
        questions: newAlbum.questions || [],
        questions_hn: newAlbum.questionsHn || null,
        cover_image: newAlbum.coverImage,
        best_fit_for: newAlbum.bestFitFor || null,
        is_active: newAlbum.isActive,
        created_at: newAlbum.createdAt?.toISOString() || "",
        updated_at: newAlbum.updatedAt?.toISOString() || "",
      });
    } catch (error: any) {
      console.error("Error creating album:", error);

      // Cleanup uploaded image if album creation failed
      if (uploadedImageFileName) {
        try {
          const { deleteImageFromR2 } = await import("./r2");
          await deleteImageFromR2(uploadedImageFileName);
          console.log("Cleaned up uploaded image after album creation failure");
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded image:", cleanupError);
        }
      }

      if (error.name === "ZodError") {
        res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      } else {
        res.status(500).json({
          error: "Failed to create album",
          message: error.message,
        });
      }
    }
  });

  // Admin endpoint: Update album
  app.put("/api/admin/albums/:id", async (req, res) => {
    let uploadedImageFileName: string | null = null;
    let oldImageUrl: string | null = null;

    try {
      const { id } = req.params;
      const { insertAlbumSchema } = await import("@shared/schema");

      // Get existing album to check for old image (get all albums and find by id)
      const allAlbums = await storage.getAllAlbumsAdmin();
      const existingAlbum = allAlbums.find((a) => a.id === id);
      if (!existingAlbum) {
        return res.status(404).json({ error: "Album not found" });
      }
      oldImageUrl = existingAlbum.coverImage;

      // Validate the data (all fields optional for update)
      const updateData = insertAlbumSchema.partial().parse(req.body);

      // Extract uploaded image filename if provided (for cleanup on failure)
      uploadedImageFileName = req.body.uploadedImageFileName || null;

      // Transform to database format
      const albumData: any = {};
      if (updateData.title !== undefined) albumData.title = updateData.title;
      if (updateData.description !== undefined)
        albumData.description = updateData.description;
      if (updateData.questions !== undefined)
        albumData.questions = updateData.questions;
      if (updateData.coverImage !== undefined)
        albumData.coverImage = updateData.coverImage;
      if (updateData.isActive !== undefined)
        albumData.isActive = updateData.isActive;

      // Handle optional fields
      if (req.body.questionsHn !== undefined) {
        albumData.questionsHn =
          (req.body.questionsHn as string[]).length > 0
            ? req.body.questionsHn
            : null;
      }
      if (req.body.bestFitFor !== undefined) {
        albumData.bestFitFor =
          (req.body.bestFitFor as string[]).length > 0
            ? req.body.bestFitFor
            : null;
      }

      const updatedAlbum = await storage.updateAlbum(id, albumData);

      // Delete old image if a new one was uploaded
      if (
        uploadedImageFileName &&
        oldImageUrl &&
        oldImageUrl !== updatedAlbum.coverImage
      ) {
        try {
          const { deleteImageFromR2 } = await import("./r2");
          // Extract filename from old URL
          const oldUrlParts = oldImageUrl.split("/");
          const oldFileName = oldUrlParts[oldUrlParts.length - 1];
          await deleteImageFromR2(oldFileName);
          console.log("Deleted old album cover image");
        } catch (cleanupError) {
          console.error("Failed to delete old image:", cleanupError);
          // Don't fail the request if old image deletion fails
        }
      }

      // Transform response
      res.json({
        id: updatedAlbum.id,
        title: updatedAlbum.title,
        description: updatedAlbum.description,
        questions: updatedAlbum.questions || [],
        questions_hn: updatedAlbum.questionsHn || null,
        cover_image: updatedAlbum.coverImage,
        best_fit_for: updatedAlbum.bestFitFor || null,
        is_active: updatedAlbum.isActive,
        created_at: updatedAlbum.createdAt?.toISOString() || "",
        updated_at: updatedAlbum.updatedAt?.toISOString() || "",
      });
    } catch (error: any) {
      console.error("Error updating album:", error);

      // Cleanup uploaded image if album update failed
      if (uploadedImageFileName) {
        try {
          const { deleteImageFromR2 } = await import("./r2");
          await deleteImageFromR2(uploadedImageFileName);
          console.log("Cleaned up uploaded image after album update failure");
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded image:", cleanupError);
        }
      }

      if (error.name === "ZodError") {
        res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      } else if (error.message === "Album not found") {
        res.status(404).json({
          error: "Album not found",
        });
      } else {
        res.status(500).json({
          error: "Failed to update album",
          message: error.message,
        });
      }
    }
  });

  // Admin endpoint: Delete album
  app.delete("/api/admin/albums/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Get album to check for cover image before deletion
      const allAlbums = await storage.getAllAlbumsAdmin();
      const albumToDelete = allAlbums.find((a) => a.id === id);

      if (!albumToDelete) {
        return res.status(404).json({ error: "Album not found" });
      }

      // Delete the album
      await storage.deleteAlbum(id);

      // Delete associated cover image from storage if it exists and is a temp file
      if (albumToDelete.coverImage) {
        try {
          const { deleteImageFromR2 } = await import("./r2");
          // Extract filename from URL
          const urlParts = albumToDelete.coverImage.split("/");
          const fileName = urlParts[urlParts.length - 1];
          // Only delete if it's a temp file (starts with "temp-")
          if (fileName.startsWith("temp-")) {
            await deleteImageFromR2(fileName);
            console.log("Deleted album cover image from storage");
          }
        } catch (cleanupError) {
          console.error("Failed to delete album cover image:", cleanupError);
          // Don't fail the request if image deletion fails
        }
      }

      res.json({
        success: true,
        message: "Album deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting album:", error);
      if (error.message === "Album not found") {
        res.status(404).json({
          error: "Album not found",
        });
      } else {
        res.status(500).json({
          error: "Failed to delete album",
          message: error.message,
        });
      }
    }
  });

  app.get("/api/albums", async (req, res) => {
    try {
      const allAlbums = await storage.getAllAlbums();
      // Transform to match frontend expectations
      const albumsResponse = allAlbums.map((album) => ({
        id: album.id,
        title: album.title,
        description: album.description,
        cover_image: album.coverImage,
        questions: album.questions,
        questions_hn: album.questionsHn || [],
        question_set_titles: album.questionSetTitles || null,
        best_fit_for: album.bestFitFor || null,
      }));
      res.json(albumsResponse);
    } catch (error: any) {
      console.error("Error fetching albums:", error);
      // Provide more detailed error information
      const errorMessage = error?.message || "Unknown error";
      const errorStack =
        process.env.NODE_ENV === "development" ? error?.stack : undefined;
      res.status(500).json({
        error: "Failed to fetch albums",
        message: errorMessage,
        ...(errorStack && { stack: errorStack }),
      });
    }
  });

  // Get a single album by ID (includes inactive, for free-trial flow with generated albums)
  app.get("/api/album/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const album = await storage.getAlbumByIdIncludeInactive(id);
      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }
      res.json({
        id: album.id,
        title: album.title,
        description: album.description,
        cover_image: album.coverImage,
        questions: album.questions || [],
        questions_hn: album.questionsHn || [],
        question_set_titles: album.questionSetTitles || null,
        best_fit_for: album.bestFitFor || null,
      });
    } catch (error: any) {
      console.error("Error fetching album:", error);
      res.status(500).json({ error: "Failed to fetch album" });
    }
  });

  app.post("/api/free-trial", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const albumIdRaw = (body.albumId ?? body.album_id) as string | undefined;
      let albumId = typeof albumIdRaw === "string" ? albumIdRaw.trim() : "";

      // Remove any trailing query params or fragments that might have been included
      if (albumId.includes("&")) {
        albumId = albumId.split("&")[0];
      }
      if (albumId.includes("#")) {
        albumId = albumId.split("#")[0];
      }

      // Final trim after cleaning
      albumId = albumId.trim();

      if (!albumId) {
        console.error(
          "[FreeTrial] Empty albumId after cleaning. Raw value:",
          albumIdRaw,
        );
        return res.status(400).json({ error: "Album ID is required" });
      }

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(albumId)) {
        console.error(
          "[FreeTrial] Invalid UUID format:",
          albumId,
          "Raw:",
          albumIdRaw,
        );
        return res.status(400).json({ error: "Invalid album ID format" });
      }

      const validatedData = insertFreeTrialSchema.parse({ ...body, albumId });

      const { normalizePhoneNumber } = await import("./whatsapp");
      const normalizedPhone = normalizePhoneNumber(validatedData.customerPhone);

      // Get album to verify it exists and get title for tracking (include inactive e.g. generated albums)
      let album = await storage.getAlbumByIdIncludeInactive(
        validatedData.albumId,
      );
      if (!album) {
        const allAlbums = await storage.getAllAlbumsAdmin();
        album =
          allAlbums.find((a) => a.id === validatedData.albumId) ?? undefined;
      }
      if (!album) {
        console.error(
          "[FreeTrial] Album not found for ID:",
          validatedData.albumId,
          "Checked inactive albums: true",
        );
        return res.status(400).json({ error: "Invalid album ID" });
      }

      console.log("[FreeTrial] Album found:", {
        albumId: album.id,
        title: album.title,
        isActive: album.isActive,
      });

      const trial = await storage.createFreeTrialDb({
        customerPhone: normalizedPhone,
        buyerName: validatedData.buyerName,
        storytellerName: validatedData.storytellerName,
        albumId: validatedData.albumId,
        selectedAlbum: album.title, // Populate for backward compatibility
        storytellerLanguagePreference:
          validatedData.storytellerLanguagePreference,
      });

      // Track free trial creation on server side
      // Use trial ID as distinct ID (no PII)
      trackServerEvent(trial.id, "free_trial_created", {
        trial_id: trial.id,
        album_id: validatedData.albumId,
        album_title: album.title,
        language_preference: validatedData.storytellerLanguagePreference,
        // Don't include phone, names, or other PII
      });

      // Send response immediately
      res.json({
        ...trial,
      });
    } catch (error: any) {
      console.error("Error creating free trial:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input", details: error.errors });
      }
      const errorMessage = error?.message || "Unknown error";
      const errorStack =
        process.env.NODE_ENV === "development" ? error?.stack : undefined;
      res.status(500).json({
        error: "Failed to create free trial",
        message: errorMessage,
        ...(errorStack && { stack: errorStack }),
      });
    }
  });

  // Solo Trial endpoint (for users recording their own stories - "Myself" flow)
  app.post("/api/solo-trial", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const albumIdRaw = (body.albumId ?? body.album_id) as string | undefined;
      let albumId = typeof albumIdRaw === "string" ? albumIdRaw.trim() : "";

      // Remove any trailing query params or fragments that might have been included
      if (albumId.includes("&")) {
        albumId = albumId.split("&")[0];
      }
      if (albumId.includes("#")) {
        albumId = albumId.split("#")[0];
      }

      // Final trim after cleaning
      albumId = albumId.trim();

      if (!albumId) {
        console.error(
          "[SoloTrial] Empty albumId after cleaning. Raw value:",
          albumIdRaw,
        );
        return res.status(400).json({ error: "Album ID is required" });
      }

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(albumId)) {
        console.error(
          "[SoloTrial] Invalid UUID format:",
          albumId,
          "Raw:",
          albumIdRaw,
        );
        return res.status(400).json({ error: "Invalid album ID format" });
      }

      const { insertSoloTrialSchema } = await import("@shared/schema");
      const validatedData = insertSoloTrialSchema.parse({ ...body, albumId });

      const { normalizePhoneNumber } = await import("./whatsapp");
      const normalizedPhone = normalizePhoneNumber(validatedData.customerPhone);

      // Get album to verify it exists (include inactive e.g. generated albums)
      let album = await storage.getAlbumByIdIncludeInactive(
        validatedData.albumId,
      );
      if (!album) {
        const allAlbums = await storage.getAllAlbumsAdmin();
        album =
          allAlbums.find((a) => a.id === validatedData.albumId) ?? undefined;
      }
      if (!album) {
        console.error(
          "[SoloTrial] Album not found for ID:",
          validatedData.albumId,
        );
        return res.status(400).json({ error: "Invalid album ID" });
      }

      console.log("[SoloTrial] Album found:", {
        albumId: album.id,
        title: album.title,
        isActive: album.isActive,
      });

      const trial = await storage.createSoloTrial({
        customerPhone: normalizedPhone,
        buyerName: validatedData.buyerName,
        albumId: validatedData.albumId,
        languagePreference: validatedData.languagePreference,
      });

      // Track solo trial creation on server side
      trackServerEvent(trial.id, "solo_trial_created", {
        trial_id: trial.id,
        album_id: validatedData.albumId,
        album_title: album.title,
        language_preference: validatedData.languagePreference,
      });

      res.json({
        ...trial,
      });
    } catch (error: any) {
      console.error("Error creating solo trial:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input", details: error.errors });
      }
      const errorMessage = error?.message || "Unknown error";
      const errorStack =
        process.env.NODE_ENV === "development" ? error?.stack : undefined;
      res.status(500).json({
        error: "Failed to create solo trial",
        message: errorMessage,
        ...(errorStack && { stack: errorStack }),
      });
    }
  });

  // Get solo trial by ID
  app.get("/api/solo-trial/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const trial = await storage.getSoloTrialById(id);
      if (!trial) {
        return res.status(404).json({ error: "Solo trial not found" });
      }
      res.json(trial);
    } catch (error: any) {
      console.error("Error fetching solo trial:", error);
      res.status(500).json({ error: "Failed to fetch solo trial" });
    }
  });

  app.get("/api/albums/:trialId", async (req, res) => {
    try {
      const { trialId } = req.params;
      const localeParam = (
        req.query.locale as string | undefined
      )?.toLowerCase();
      const languagePreference =
        localeParam === "hn" || localeParam === "hi"
          ? "hn"
          : localeParam === "en"
            ? "en"
            : undefined;

      // Optimized: Fetch trial+album and voice notes in parallel (2 queries instead of 3).
      // Use include-inactive so existing trial links work even if the album was deactivated.
      const [trialWithAlbum, voiceNotes] = await Promise.all([
        storage.getTrialWithAlbumIncludeInactive(trialId),
        storage.getVoiceNotesByTrialId(trialId),
      ]);

      if (!trialWithAlbum || !trialWithAlbum.trial) {
        return res.status(404).json({ error: "Album not found" });
      }

      const { trial, album } = trialWithAlbum;

      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }

      // Use in-memory album data instead of querying
      const finalLanguagePreference =
        languagePreference || trial.storytellerLanguagePreference;
      const questions =
        finalLanguagePreference === "hn" &&
        album.questionsHn &&
        album.questionsHn.length > 0
          ? album.questionsHn
          : album.questions;

      const totalQuestions = questions.length;

      // Build tracks from in-memory data (no additional queries)
      const tracks = questions.map((questionText, index) => {
        const voiceNote = voiceNotes.find(
          (note) => note.questionIndex === index,
        );

        return {
          questionIndex: index,
          questionText,
          voiceNoteId: voiceNote?.id || null,
          answeredAt: voiceNote?.receivedAt || null,
          mediaUrl: voiceNote?.mediaUrl || null,
          mediaId: voiceNote?.mediaId || null,
        };
      });

      // Album metadata already fetched above, no need to fetch again
      // Fallback values if album metadata is missing
      const albumDescription =
        album?.description ||
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
      // Use custom cover image if available, otherwise use album cover image
      const customCoverImage =
        trial.customCoverImageUrl &&
        String(trial.customCoverImageUrl).trim() !== ""
          ? String(trial.customCoverImageUrl).trim()
          : null;
      const albumCoverImage =
        customCoverImage ||
        album?.coverImage ||
        "/attached_assets/Generated Image November 08, 2025 - 8_27PM_1762623023120.png";

      // Add cache headers for better performance (cache for 5 minutes)
      res.set({
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      });

      res.json({
        trial: {
          id: trial.id,
          storytellerName: trial.storytellerName,
          buyerName: trial.buyerName,
          albumId: trial.albumId || album.id,
          selectedAlbum: album.title, // Keep for backward compatibility
        },
        album: {
          description: albumDescription,
          coverImage: albumCoverImage,
          cover_image: album?.coverImage || null, // Direct cover_image from albums table
          isConversationalAlbum: album.isConversationalAlbum || false,
          questionSetTitles: album.questionSetTitles || null,
        },
        tracks,
      });
    } catch (error) {
      console.error("Error fetching album:", error);
      res.status(500).json({ error: "Failed to fetch album" });
    }
  });

  app.post(
    "/api/free-trial/:trialId/upload-cover",

    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        const { trialId } = req.params;

        // Validate trialId exists
        const trial = await storage.getFreeTrialDb(trialId);
        if (!trial) {
          return res.status(404).json({ error: "Trial not found" });
        }

        // Check if file was uploaded
        if (!req.file) {
          return res.status(400).json({ error: "No image file provided" });
        }

        // Validate file type (multer should have caught this, but double-check)
        const allowedMimeTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            error:
              "Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.",
          });
        }

        // Validate file size (multer should have caught this, but double-check)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
          return res.status(400).json({
            error: "File size exceeds 10MB limit",
          });
        }

        // Compress image before upload
        const { compressImage } = await import("./supabase");
        const originalBuffer = Buffer.from(req.file.buffer);
        const { buffer: compressedBuffer, mimeType: compressedMimeType } =
          await compressImage(originalBuffer, req.file.mimetype);

        // Generate key with format: trialID_timestamp
        const timestamp = Date.now();
        const extension =
          compressedMimeType.includes("jpeg") ||
          compressedMimeType.includes("jpg")
            ? "jpg"
            : compressedMimeType.includes("png")
              ? "png"
              : compressedMimeType.includes("gif")
                ? "gif"
                : compressedMimeType.includes("webp")
                  ? "webp"
                  : "jpg";
        const key = `${trialId}_${timestamp}.${extension}`;

        // Upload compressed image to Cloudflare R2
        const { uploadToR2, R2_ALBUM_COVERS_BUCKET } = await import("./r2");
        const publicUrl = await uploadToR2(
          R2_ALBUM_COVERS_BUCKET,
          key,
          compressedBuffer,
          compressedMimeType,
        );

        if (!publicUrl) {
          console.error("Failed to upload image to R2:", trialId);
          return res.status(500).json({
            error: "Failed to upload image. Please try again later.",
          });
        }

        // Update database with R2 URL
        await storage.updateFreeTrialDb(trialId, {
          customCoverImageUrl: publicUrl,
        });

        console.log("Custom cover image uploaded successfully:", {
          trialId,
          publicUrl,
          key,
        });

        res.json({
          success: true,
          imageUrl: publicUrl,
          message: "Image uploaded successfully",
        });
      } catch (error: any) {
        console.error("Error uploading cover image:", error);
        if (error.message === "Invalid file type. Only images are allowed.") {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({
          error: "Failed to upload image",
          message: error.message || "Internal server error",
        });
      }
    },
  );

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData);

      const { sendTemplateMessage, normalizePhoneNumber } =
        await import("./whatsapp");
      const normalizedPhone = normalizePhoneNumber(validatedData.customerPhone);
      const whatsappSent = await sendTemplateMessage(
        normalizedPhone,
        "hello_world",
        "en",
      );

      if (!whatsappSent) {
        console.warn(
          "WhatsApp confirmation message failed for order:",
          order.id,
        );
      }

      console.log("Order created:", {
        id: order.id,
        uniqueCode: order.uniqueCode,
        customerPhone: normalizedPhone,
        items: order.items,
        whatsappSent,
      });

      res.json({ ...order, whatsappSent });
    } catch (error: any) {
      console.error("Error creating order:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.get("/api/stories/:uniqueCode", async (req, res) => {
    try {
      const stories = await storage.getStories(req.params.uniqueCode);
      if (!stories) {
        return res.status(404).json({ error: "Stories not found" });
      }
      res.json(stories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ error: "Failed to fetch stories" });
    }
  });

  app.get("/api/feedback/check/:orderCode", async (req, res) => {
    try {
      const feedback = await storage.getFeedbackByOrderCode(
        req.params.orderCode,
      );
      res.json({
        submitted: !!feedback,
        feedbackId: feedback?.id || null,
      });
    } catch (error) {
      console.error("Error checking feedback:", error);
      res.status(500).json({ error: "Failed to check feedback" });
    }
  });

  app.post("/api/feedback/submit", async (req, res) => {
    try {
      const validatedData = insertFeedbackSchema.parse(req.body);

      const existingFeedback = await storage.getFeedbackByOrderCode(
        validatedData.orderCode,
      );
      if (existingFeedback) {
        return res
          .status(400)
          .json({ error: "Feedback already submitted for this order" });
      }

      const feedback = await storage.createFeedback(validatedData);

      console.log("Feedback submitted:", {
        id: feedback.id,
        orderCode: feedback.orderCode,
        rating: feedback.overallRating,
      });

      res.json(feedback);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // ─── Discount helpers & endpoints ───────────────────────────────────
  const MIN_PAYMENT_PAISE = 100; // ₹1 floor — PhonePe won't accept ₹0

  /**
   * Look up & validate a discount code. Returns the discount row + computed
   * amounts, or an error string.
   */
  type DiscountResult =
    | {
        ok: true;
        discount: {
          id: string;
          code: string;
          discountType: string;
          discountValue: number;
          usageLimitTotal: number | null;
          usageLimitPerUser: number | null;
        };
        baseAmountPaise: number;
        discountAmountPaise: number;
        finalAmountPaise: number;
      }
    | { ok: false; error: string };

  async function resolveDiscount(
    code: string,
    packageType: string,
    userIdentifier?: string | null,
  ): Promise<DiscountResult> {
    const baseAmountPaise = PACKAGE_PRICES[packageType];
    if (!baseAmountPaise) return { ok: false, error: "Invalid package type" };

    const normalizedCode = code.trim().toUpperCase();
    const discountResult =
      await storage.getActiveDiscountByCode(normalizedCode);
    if (!discountResult) {
      return { ok: false, error: "Invalid or inactive discount code" };
    }

    // Usage limit — total
    if (discountResult.usageLimitTotal !== null) {
      const totalCount = await storage.getDiscountRedemptionCount(
        discountResult.id,
      );
      if (totalCount >= discountResult.usageLimitTotal) {
        return {
          ok: false,
          error: "This discount code has reached its usage limit",
        };
      }
    }

    // Usage limit — per user
    if (discountResult.usageLimitPerUser !== null && userIdentifier) {
      const userCount = await storage.getDiscountRedemptionCountForUser(
        discountResult.id,
        userIdentifier,
      );
      if (userCount >= discountResult.usageLimitPerUser) {
        return { ok: false, error: "You have already used this discount code" };
      }
    }

    // Compute discount
    let discountAmountPaise: number;
    if (discountResult.discountType === "percentage") {
      discountAmountPaise = Math.floor(
        (baseAmountPaise * discountResult.discountValue) / 100,
      );
    } else {
      // fixed_amount (value is already in paise)
      discountAmountPaise = Math.min(
        discountResult.discountValue,
        baseAmountPaise,
      );
    }

    let finalAmountPaise = baseAmountPaise - discountAmountPaise;
    // Enforce floor of ₹1 so PhonePe doesn't reject
    if (finalAmountPaise < MIN_PAYMENT_PAISE) {
      finalAmountPaise = MIN_PAYMENT_PAISE;
      discountAmountPaise = baseAmountPaise - MIN_PAYMENT_PAISE;
    }

    return {
      ok: true,
      discount: discountResult,
      baseAmountPaise,
      discountAmountPaise,
      finalAmountPaise,
    };
  }

  // Validate a discount code (for UI preview — "You save ₹X")
  app.post("/api/discounts/validate", async (req, res) => {
    try {
      const { code, packageType } = req.body;
      if (!code || !packageType) {
        return res.status(400).json({ error: "Missing code or packageType" });
      }

      const result = await resolveDiscount(code, packageType);
      if (!result.ok) {
        return res.status(400).json({ valid: false, error: result.error });
      }

      return res.json({
        valid: true,
        code: result.discount!.code,
        discountType: result.discount!.discountType,
        discountValue: result.discount!.discountValue,
        baseAmountPaise: result.baseAmountPaise,
        discountAmountPaise: result.discountAmountPaise,
        finalAmountPaise: result.finalAmountPaise,
      });
    } catch (error) {
      console.error("Error validating discount:", error);
      return res
        .status(500)
        .json({ error: "Failed to validate discount code" });
    }
  });

  // Validate a discount code for the book-order (extra-copies) flow.
  // Code must have book_order = true, otherwise returns "code not valid".
  // Uses raw SQL so the book_order column is always read even if the
  // Drizzle schema hasn't been reloaded by the running server process.
  app.post("/api/discounts/validate-book-order", async (req, res) => {
    try {
      const { code, baseAmountPaise } = req.body as {
        code?: string;
        baseAmountPaise?: number;
      };
      if (
        !code ||
        typeof baseAmountPaise !== "number" ||
        baseAmountPaise <= 0
      ) {
        return res
          .status(400)
          .json({ valid: false, error: "Missing code or amount" });
      }

      const { pool } = await import("./db");
      const normalizedCode = code.trim().toUpperCase();

      const { rows } = await pool.query(
        `SELECT id, code, discount_type, discount_value, is_active, book_order,
                usage_limit_total, usage_limit_per_user
         FROM discounts
         WHERE code = $1 AND is_active = true
         LIMIT 1`,
        [normalizedCode],
      );

      if (rows.length === 0) {
        return res.status(400).json({ valid: false, error: "Code not valid" });
      }

      const row = rows[0];

      if (!row.book_order) {
        return res.status(400).json({ valid: false, error: "Code not valid" });
      }

      // Usage limits — total
      if (row.usage_limit_total !== null) {
        const count = await storage.getDiscountRedemptionCount(row.id);
        if (count >= row.usage_limit_total) {
          return res.status(400).json({
            valid: false,
            error: "This code has reached its usage limit",
          });
        }
      }

      // Compute discount amount
      let discountAmountPaise: number;
      if (row.discount_type === "percentage") {
        discountAmountPaise = Math.floor(
          (baseAmountPaise * row.discount_value) / 100,
        );
      } else {
        discountAmountPaise = Math.min(row.discount_value, baseAmountPaise);
      }

      const MIN = 100; // ₹1 floor
      let finalAmountPaise = baseAmountPaise - discountAmountPaise;
      if (finalAmountPaise < MIN) {
        finalAmountPaise = MIN;
        discountAmountPaise = baseAmountPaise - MIN;
      }

      return res.json({
        valid: true,
        code: row.code,
        discountType: row.discount_type,
        discountValue: row.discount_value,
        baseAmountPaise,
        discountAmountPaise,
        finalAmountPaise,
      });
    } catch (error) {
      console.error("Error validating book-order discount:", error);
      return res
        .status(500)
        .json({ valid: false, error: "Failed to validate code" });
    }
  });

  // ─── Transaction helpers ────────────────────────────────────────────────

  // Send a Slack notification when a transaction's payment has completed.
  async function postTransactionPaymentToSlack(transaction: {
    id: string;
    name: string;
    phone: string;
    albumId: string;
    packageType: string;
    paymentStatus?: string;
    paymentAmount?: number | null;
    paymentOrderId?: string | null;
  }): Promise<void> {
    const slackToken = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_TRANSACTIONS_CHANNEL_ID;

    if (!slackToken || !channelId) {
      // Slack integration is optional; just log and skip if not configured
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Slack] Missing SLACK_BOT_TOKEN or SLACK_TRANSACTIONS_CHANNEL_ID; skipping transaction notification",
        );
      }
      return;
    }

    try {
      const slack = new WebClient(slackToken);
      await slack.chat.postMessage({
        channel: channelId,
        text: `Payment completed for transaction: ${transaction.id}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "*Payment completed*\n" +
                `• *ID*: ${transaction.id}\n` +
                `• *Name*: ${transaction.name}\n` +
                `• *Phone*: ${transaction.phone}\n` +
                `• *Album ID*: ${transaction.albumId}\n` +
                `• *Package*: ${transaction.packageType}\n` +
                (transaction.paymentOrderId
                  ? `• *Payment order ID*: ${transaction.paymentOrderId}\n`
                  : "") +
                (transaction.paymentAmount != null
                  ? `• *Amount (paise)*: ${transaction.paymentAmount}\n`
                  : "") +
                (transaction.paymentStatus
                  ? `• *Payment status*: ${transaction.paymentStatus}\n`
                  : ""),
            },
          },
        ],
      });
    } catch (err) {
      console.error("[Slack] Failed to send transaction notification:", err);
    }
  }

  // Transaction Management Endpoints
  // Create transaction record (one per payment attempt)
  app.post("/api/transactions", async (req, res) => {
    try {
      const {
        name,
        phone,
        phoneE164,
        albumId,
        packageType,
        storytellerName,
        storytellerLanguagePreference,
      } = req.body;

      // Validate request
      if (!name || !phone || !albumId || !packageType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Always create a fresh transaction record for every payment attempt
      const transaction = await storage.createTransaction({
        name,
        phone,
        phoneE164: phoneE164 || phone,
        albumId,
        packageType,
        storytellerName: storytellerName || null,
        storytellerLanguagePreference: storytellerLanguagePreference || null,
        paymentStatus: "pending",
      });

      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({
        error: "Failed to create transaction record",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get transaction by payment order ID
  app.get(
    "/api/transactions/by-payment-order/:paymentOrderId",
    async (req, res) => {
      try {
        const { paymentOrderId } = req.params;
        let txn = await storage.getTransactionByPaymentOrderId(paymentOrderId);

        if (!txn) {
          // Fallback: Try to find the most recent pending transaction
          const recentTxns = await storage.getRecentPendingTransactions(1);
          if (recentTxns.length > 0) {
            const fallbackTxn = recentTxns[0];
            await storage.updateTransactionPayment(fallbackTxn.id, {
              paymentOrderId,
              paymentStatus: "pending",
            });
            txn = fallbackTxn;
          } else {
            return res.status(404).json({ error: "Transaction not found" });
          }
        }

        res.json(txn);
      } catch (error) {
        console.error("Error fetching transaction:", error);
        res.status(500).json({
          error: "Failed to fetch transaction",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Update transaction payment information (after successful payment)
  app.put("/api/transactions/payment/:paymentOrderId", async (req, res) => {
    try {
      const { paymentOrderId } = req.params;
      const { paymentStatus, paymentId, paymentTransactionId, paymentAmount } =
        req.body;

      if (!paymentStatus) {
        return res.status(400).json({ error: "Missing payment status" });
      }

      // Fetch transaction to verify expected amount (stored at create-order time)
      const txn = await storage.getTransactionByPaymentOrderId(paymentOrderId);
      if (!txn) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Use stored expected_amount_paise (set at create-order, includes discount).
      // Fall back to hardcoded package price for older transactions without it.
      const expectedAmount =
        txn.expectedAmountPaise ?? PACKAGE_PRICES[txn.packageType || ""];

      if (paymentStatus === "success") {
        if (
          !paymentId ||
          !paymentTransactionId ||
          typeof paymentAmount !== "number" ||
          paymentAmount <= 0
        ) {
          return res.status(500).json({
            error: "Incomplete payment details for successful payment",
          });
        }
        if (!expectedAmount) {
          return res
            .status(500)
            .json({ error: "Unknown package type for amount verification" });
        }
        if (expectedAmount !== paymentAmount) {
          console.error("SECURITY: Amount mismatch!", {
            transactionId: txn.id,
            expected: expectedAmount,
            received: paymentAmount,
          });
          return res
            .status(400)
            .json({ error: "Payment amount verification failed" });
        }
      } else if (
        paymentAmount !== undefined &&
        expectedAmount &&
        paymentAmount !== expectedAmount
      ) {
        console.error("SECURITY: Amount mismatch!", {
          transactionId: txn.id,
          expected: expectedAmount,
          received: paymentAmount,
        });
        return res
          .status(400)
          .json({ error: "Payment amount verification failed" });
      }

      const updatedTxn = await storage.updateTransactionPaymentByOrderId(
        paymentOrderId,
        {
          paymentStatus,
          paymentId,
          paymentTransactionId,
          paymentOrderId,
          paymentAmount,
        },
      );

      if (!updatedTxn) {
        return res.status(500).json({ error: "Failed to update transaction" });
      }

      // Only notify Slack when payment has actually completed successfully
      if (updatedTxn.paymentStatus === "success") {
        void postTransactionPaymentToSlack({
          id: updatedTxn.id,
          name: updatedTxn.name ?? "",
          phone: updatedTxn.phone ?? "",
          albumId: updatedTxn.albumId ?? "",
          packageType: updatedTxn.packageType ?? "",
          paymentStatus: updatedTxn.paymentStatus ?? undefined,
          paymentAmount: updatedTxn.paymentAmount ?? undefined,
          paymentOrderId: updatedTxn.paymentOrderId ?? undefined,
        });
      }

      res.json(updatedTxn);
    } catch (error) {
      console.error("Error updating transaction payment:", error);
      res.status(500).json({
        error: "Failed to update payment info",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get transaction payment status (for verification)
  app.get(
    "/api/transactions/:transactionId/payment-status",
    async (req, res) => {
      try {
        const { transactionId } = req.params;

        const txn = await storage.getTransactionById(transactionId);
        if (!txn) {
          return res.status(404).json({ error: "Transaction not found" });
        }

        res.json({
          paymentStatus: txn.paymentStatus,
          paymentOrderId: txn.paymentOrderId,
          paymentTransactionId: txn.paymentTransactionId,
          paymentAmount: txn.paymentAmount,
        });
      } catch (error) {
        console.error("Error fetching payment status:", error);
        res.status(500).json({
          error: "Failed to fetch payment status",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // PhonePe Payment Gateway Endpoints
  // PhonePe: Create payment order
  app.post("/api/phonepe/create-order", async (req, res) => {
    try {
      const { albumId, packageType, transactionId, discountCode, mode } =
        req.body;

      if (!albumId || !packageType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate transactionId
      let txn:
        | Awaited<ReturnType<typeof storage.getTransactionById>>
        | undefined;
      if (transactionId) {
        txn = await storage.getTransactionById(transactionId);
        if (!txn) {
          return res.status(404).json({ error: "Transaction not found" });
        }
      }

      // Server computes amount — never trust client-supplied amount
      const baseAmountPaise = PACKAGE_PRICES[packageType];
      if (!baseAmountPaise) {
        return res.status(400).json({ error: "Invalid package type" });
      }

      let finalAmountPaise = baseAmountPaise;
      let discountApplied: { id: string; code: string } | null = null;

      // Apply discount if provided
      if (discountCode) {
        const userIdentifier = txn?.phoneE164 || txn?.phone || null;
        const result = await resolveDiscount(
          discountCode,
          packageType,
          userIdentifier,
        );

        if (!result.ok) {
          return res.status(400).json({ error: result.error });
        }

        finalAmountPaise = result.finalAmountPaise;
        discountApplied = {
          id: result.discount!.id,
          code: result.discount!.code,
        };
      }

      // Verify album exists
      const album = await storage.getAlbumByIdIncludeInactive(albumId);
      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }

      // Generate order IDs
      const { randomUUID } = await import("crypto");
      const merchantOrderId = `ORD_${Date.now()}_${randomUUID().slice(0, 8)}`;
      const merchantUserId = randomUUID();

      // Create PhonePe order
      const { phonePeService } = await import("./phonepe");
      const redirectUrl = `${phonePeCallbackBase()}/payment/callback?merchantOrderId=${merchantOrderId}&albumId=${albumId}&packageType=${packageType}${transactionId ? `&transactionId=${transactionId}` : ""}${mode === "solo" ? "&mode=solo" : ""}`;

      console.log(
        "[PhonePe] Mode param received:",
        mode,
        "| Redirect URL:",
        redirectUrl,
      );

      const orderResponse = await phonePeService.createOrder({
        amount: finalAmountPaise,
        merchantOrderId,
        merchantUserId,
        redirectUrl,
        metadata: { albumId, packageType },
      });

      if (
        !orderResponse.success ||
        !orderResponse.data?.instrumentResponse?.redirectInfo?.url
      ) {
        return res
          .status(500)
          .json({ error: "Failed to create payment order" });
      }

      // Update transaction record with payment order ID + expected amount + discount info
      if (transactionId) {
        try {
          await storage.updateTransactionPayment(transactionId, {
            paymentOrderId: merchantOrderId,
            paymentStatus: "pending",
            expectedAmountPaise: finalAmountPaise,
            discountCodeApplied: discountApplied?.code || undefined,
          });
        } catch (updateError) {
          console.error(
            "Failed to update transaction with payment order ID:",
            updateError,
          );
        }
      }

      // Record discount redemption (counted at create-order time)
      if (discountApplied && transactionId) {
        try {
          await storage.createDiscountRedemption({
            discountId: discountApplied.id,
            transactionId,
            userIdentifier: txn?.phoneE164 || txn?.phone || null,
          });
        } catch (redemptionError) {
          console.error(
            "Failed to record discount redemption:",
            redemptionError,
          );
          // Non-blocking — payment can still proceed
        }
      }

      return res.json({
        success: true,
        merchantOrderId,
        transactionId: orderResponse.data.transactionId,
        redirectUrl: orderResponse.data.instrumentResponse.redirectInfo.url,
        amount: finalAmountPaise,
        packageType,
        albumId,
        discountApplied: discountApplied?.code || null,
      });
    } catch (error: any) {
      console.error("PhonePe order error:", error.message);
      return res.status(500).json({
        error: "Failed to create payment order",
        message: error.message,
      });
    }
  });

  // PhonePe: Check payment status
  app.post("/api/phonepe/check-status", async (req, res) => {
    try {
      const { merchantOrderId } = req.body;

      if (!merchantOrderId) {
        return res.status(400).json({ error: "merchantOrderId is required" });
      }

      // Check payment status with PhonePe
      const { phonePeService } = await import("./phonepe");
      const statusResponse =
        await phonePeService.checkPaymentStatus(merchantOrderId);

      if (!statusResponse.success) {
        return res
          .status(500)
          .json({ error: "Failed to check payment status" });
      }

      const data = statusResponse.data;
      const isSuccess = data?.state === "COMPLETED";

      return res.json({
        success: true,
        merchantOrderId: data?.merchantOrderId,
        transactionId: data?.transactionId, // PhonePe's payment ID
        amount: data?.amount,
        state: data?.state,
        isSuccess,
      });
    } catch (error: any) {
      console.error("Payment status error:", error.message);
      return res.status(500).json({
        error: "Failed to check payment status",
        message: error.message,
      });
    }
  });

  // PhonePe: Payment callback — server-side handler (runs before React app)
  app.get("/payment/callback", async (req, res) => {
    const baseUrl = process.env.APP_BASE_URL || "";
    try {
      const {
        merchantOrderId,
        albumId,
        packageType,
        transactionId,
        flowType,
        orderDetailsId,
      } = req.query;

      if (!merchantOrderId) {
        return res.redirect(`${baseUrl}/free-trial?error=missing_order_id`);
      }

      // Verify payment with PhonePe
      const { phonePeService } = await import("./phonepe");

      // ── Extra-copies flow ──────────────────────────────────────────────
      if (flowType === "extra-copies") {
        // Wrap in try-catch because checkPaymentStatus throws on non-200
        // from PhonePe (e.g. cancelled payments). We must still redirect
        // the user back to the address form, not to the generic error page.
        let statusResponse: Awaited<
          ReturnType<typeof phonePeService.checkPaymentStatus>
        > | null = null;
        try {
          statusResponse = await phonePeService.checkPaymentStatus(
            merchantOrderId as string,
          );
        } catch (statusErr) {
          console.error(
            "Extra-copies payment status check failed (treating as non-success):",
            statusErr,
          );
        }

        const isSuccess =
          statusResponse?.success &&
          statusResponse?.data?.state === "COMPLETED";

        if (isSuccess && statusResponse?.data) {
          try {
            const { pool } = await import("./db");
            const { rows } = await pool.query(
              `SELECT id, trial_id, transaction_id, extra_payment_amount_paise
               FROM user_order_details WHERE extra_payment_order_id = $1`,
              [merchantOrderId],
            );

            if (rows.length > 0) {
              const order = rows[0];

              // Amount integrity check
              if (
                typeof statusResponse.data.amount === "number" &&
                order.extra_payment_amount_paise !== statusResponse.data.amount
              ) {
                console.error("SECURITY: Extra-copies amount mismatch", {
                  expected: order.extra_payment_amount_paise,
                  received: statusResponse.data.amount,
                });
                return res.redirect(
                  `${baseUrl}/free-trial?error=amount_mismatch`,
                );
              }

              // Update user_order_details payment status
              await pool.query(
                `UPDATE user_order_details SET extra_payment_status = 'success'
                 WHERE extra_payment_order_id = $1`,
                [merchantOrderId],
              );

              // Store payment details on the linked transaction using the existing helper
              if (order.transaction_id) {
                try {
                  await storage.updateTransactionPayment(order.transaction_id, {
                    paymentStatus: "success",
                    paymentId: statusResponse.data.transactionId,
                    paymentTransactionId: statusResponse.data.transactionId,
                    paymentOrderId: merchantOrderId as string,
                    paymentAmount: statusResponse.data.amount,
                  });
                } catch (txnErr) {
                  console.error(
                    "Failed to update transaction for extra-copies payment:",
                    txnErr,
                  );
                }
              }
            }
          } catch (dbErr) {
            console.error("Extra-copies callback DB error:", dbErr);
            // Non-fatal — still redirect to confirmed page
          }

          return res.redirect(`${baseUrl}/book-order-confirmation`);
        } else {
          // Failed / cancelled payment — mark as failed and redirect back to the address form
          try {
            const { pool } = await import("./db");

            // Update status so the row isn't stuck at 'pending'
            await pool
              .query(
                `UPDATE user_order_details SET extra_payment_status = 'failed'
               WHERE extra_payment_order_id = $1 AND extra_payment_status = 'pending'`,
                [merchantOrderId],
              )
              .catch((e: unknown) =>
                console.error(
                  "Non-fatal: could not mark extra payment as failed:",
                  e,
                ),
              );

            let trialIdForRedirect: string | null = null;

            if (orderDetailsId) {
              const byId = await pool.query(
                `SELECT trial_id FROM user_order_details WHERE id = $1`,
                [orderDetailsId],
              );
              trialIdForRedirect =
                byId.rows.length > 0 ? (byId.rows[0].trial_id as string) : null;
            }

            if (!trialIdForRedirect) {
              const byOrder = await pool.query(
                `SELECT trial_id FROM user_order_details WHERE extra_payment_order_id = $1`,
                [merchantOrderId],
              );
              trialIdForRedirect =
                byOrder.rows.length > 0
                  ? (byOrder.rows[0].trial_id as string)
                  : null;
            }

            if (trialIdForRedirect) {
              return res.redirect(
                `${baseUrl}/address-form/${encodeURIComponent(
                  trialIdForRedirect,
                )}?error=payment_failed`,
              );
            }
          } catch (lookupErr) {
            console.error(
              "Extra-copies callback redirect lookup error:",
              lookupErr,
            );
          }

          // Fallback if we couldn't resolve the trial
          return res.redirect(`${baseUrl}/free-trial?error=payment_failed`);
        }
      }
      // ── Standard purchase flow ────────────────────────────────────────
      const statusResponse = await phonePeService.checkPaymentStatus(
        merchantOrderId as string,
      );
      const isSuccess =
        statusResponse.success && statusResponse.data?.state === "COMPLETED";

      if (isSuccess && statusResponse.data) {
        // UPDATE TRANSACTIONS TABLE WITH PAYMENT INFO
        try {
          // Look up the transaction to get stored expected amount (includes any discount)
          const callbackTxn = await storage.getTransactionByPaymentOrderId(
            merchantOrderId as string,
          );
          const expectedAmount =
            callbackTxn?.expectedAmountPaise ??
            PACKAGE_PRICES[packageType as string];
          const receivedAmount = statusResponse.data.amount;

          if (expectedAmount !== receivedAmount) {
            console.error("SECURITY: Amount mismatch!", {
              expected: expectedAmount,
              received: receivedAmount,
            });
            return res.redirect(
              `${baseUrl}/free-trial?error=amount_mismatch&albumId=${albumId || ""}`,
            );
          }

          const paymentData = {
            paymentStatus: "success" as const,
            paymentId: statusResponse.data.transactionId,
            paymentTransactionId: statusResponse.data.transactionId,
            paymentOrderId: merchantOrderId as string,
            paymentAmount: statusResponse.data.amount,
          };

          // Try to update by paymentOrderId first
          let updatedTxn = await storage.updateTransactionPaymentByOrderId(
            merchantOrderId as string,
            paymentData,
          );

          // Fallback: if transaction not found by paymentOrderId, try by transactionId from redirect URL
          if (!updatedTxn && transactionId) {
            try {
              updatedTxn = await storage.updateTransactionPayment(
                transactionId as string,
                paymentData,
              );
            } catch (fallbackError) {
              console.error("transactionId fallback failed:", fallbackError);
            }
          }

          // If we have an updated transaction row, notify Slack that payment completed.
          if (updatedTxn) {
            void postTransactionPaymentToSlack({
              id: updatedTxn.id,
              name: updatedTxn.name ?? "",
              phone: updatedTxn.phone ?? "",
              albumId: updatedTxn.albumId ?? "",
              packageType: updatedTxn.packageType ?? "",
              paymentStatus: updatedTxn.paymentStatus ?? undefined,
              paymentAmount: updatedTxn.paymentAmount ?? undefined,
              paymentOrderId: updatedTxn.paymentOrderId ?? undefined,
            });
          }
        } catch (updateError) {
          console.error("Failed to update user payment info:", updateError);
          // Continue anyway - user can still see order details
        }

        const params = new URLSearchParams({
          albumId: (albumId as string) || "",
          paymentOrderId: merchantOrderId as string,
          paymentTransactionId: statusResponse.data.transactionId || "",
          paymentStatus: "success",
          paymentAmount: statusResponse.data.amount?.toString() || "",
          packageType: (packageType as string) || "",
        });
        return res.redirect(`${baseUrl}/order-details?${params.toString()}`);
      } else {
        return res.redirect(
          `${baseUrl}/free-trial?error=payment_failed&albumId=${albumId || ""}`,
        );
      }
    } catch (error: any) {
      console.error("Payment callback error:", error.message);
      return res.redirect(
        `${process.env.APP_BASE_URL}/free-trial?error=callback_error`,
      );
    }
  });

  // PhonePe: Webhook handler (v2 - uses Authorization header with SHA256(username:password))
  app.post("/webhooks/payment", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"] as string;

      // Validate Authorization header
      if (!authHeader) {
        return res.status(400).json({ error: "Missing authorization header" });
      }

      // Verify authorization (SHA256 of username:password configured on PhonePe dashboard)
      const { phonePeService } = await import("./phonepe");
      const isValid = phonePeService.verifyWebhookAuthorization(authHeader);

      if (!isValid) {
        return res.status(401).json({ error: "Invalid authorization" });
      }

      // v2 webhook payload: { event, payload: { merchantOrderId, state, ... } }
      const { event, payload } = req.body;
      const merchantOrderId = payload?.merchantOrderId;
      const state = payload?.state;

      if (!merchantOrderId) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      // Check idempotency
      const idempotencyKey = `phonepe_${merchantOrderId}_${state}`;
      if (await storage.isWebhookProcessed(idempotencyKey)) {
        return res.status(200).json({ message: "Already processed" });
      }

      // Process based on event type
      if (event === "checkout.order.completed" || state === "COMPLETED") {
        console.log("[PhonePe] Webhook: Payment completed", merchantOrderId);
        await storage.markWebhookProcessed(idempotencyKey);
      } else if (event === "checkout.order.failed" || state === "FAILED") {
        console.log("[PhonePe] Webhook: Payment failed", merchantOrderId);
        await storage.markWebhookProcessed(idempotencyKey);
      }

      return res.status(200).json({ message: "Webhook processed", state });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/w/invite/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const whatsappToken = await storage.getWhatsappToken(token);

      if (!whatsappToken) {
        return res.status(404).send("Invalid or expired invitation link");
      }

      const now = new Date();
      const expiresAt = new Date(whatsappToken.expiresAt);

      if (now > expiresAt) {
        return res.status(410).send("This invitation link has expired");
      }

      await storage.consumeWhatsappToken(token);

      const order = await storage.getOrder(whatsappToken.orderId);
      if (!order) {
        return res.status(404).send("Order not found");
      }

      const whatsappBusinessNumber =
        process.env.WHATSAPP_BUSINESS_NUMBER_E164 || "919876543210";
      const waLink = `https://wa.me/${whatsappBusinessNumber}?text=${encodeURIComponent(
        `Hi, I'm contacting on behalf of order ${order.uniqueCode}. Token: ${token}`,
      )}`;

      console.log("Token consumed, redirecting to WhatsApp:", {
        token,
        orderId: order.id,
        orderCode: order.uniqueCode,
      });

      res.redirect(302, waLink);
    } catch (error: any) {
      console.error("Error processing invite link:", error);
      res.status(500).send("Internal server error");
    }
  });

  app.get("/api/whatsapp-business-number", async (req, res) => {
    try {
      const businessNumber = process.env.WHATSAPP_BUSINESS_NUMBER_E164;
      if (!businessNumber) {
        return res
          .status(500)
          .json({ error: "WhatsApp business number not configured" });
      }
      res.json({ businessNumber });
    } catch (error: any) {
      console.error("Error fetching WhatsApp business number:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/webhook/whatsapp", async (req, res) => {
    console.log(
      "WhatsApp webhook verification received:",
      JSON.stringify(req.query, null, 2),
    );
    try {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

      if (!verifyToken) {
        console.error("WHATSAPP_WEBHOOK_VERIFY_TOKEN not configured");
        return res.status(500).send("Webhook verification not configured");
      }

      if (mode === "subscribe" && token === verifyToken) {
        console.log("WhatsApp webhook verified successfully");
        return res.status(200).send(challenge);
      }

      console.error("WhatsApp webhook verification failed:", { mode, token });
      res.status(403).send("Forbidden");
    } catch (error: any) {
      console.error("Error verifying WhatsApp webhook:", error);
      res.status(500).send("Internal server error");
    }
  });

  // Error codes that should trigger email alerts
  const ERROR_CODES_TO_ALERT = [131049];
  const ERROR_CODE_MAP: Record<number, string> = {
    131049: "Message dropped by Meta",
  };

  app.post("/webhook/whatsapp", async (req, res) => {
    console.log(
      "WhatsApp webhook received:",
      JSON.stringify(req.body, null, 2),
    );
    try {
      res.status(200).json({ status: "received" });

      const body = req.body;

      if (body.object !== "whatsapp_business_account") {
        console.log("Ignoring non-WhatsApp webhook:", body.object);
        return;
      }

      const entry = body.entry?.[0];
      if (!entry) {
        console.log("No entry in webhook payload");
        return;
      }

      const changes = entry.changes?.[0];
      if (!changes) {
        console.log("No changes in webhook payload");
        return;
      }

      const value = changes.value;
      if (!value) {
        console.log("No value in webhook payload");
        return;
      }

      // Handle status updates (message delivery status)
      const statuses = value.statuses;
      if (statuses && statuses.length > 0) {
        const status = statuses[0];
        console.log("📊 WhatsApp Message Status Update:", {
          messageId: status.id,
          status: status.status,
          recipientId: status.recipient_id,
          timestamp: status.timestamp,
          conversation: status.conversation,
          pricing: status.pricing,
        });

        // Log webhook event and correlate with outgoing message
        const statusMapping: Record<
          string,
          "sent" | "delivered" | "read" | "failed" | "dropped" | "unknown"
        > = {
          sent: "sent",
          delivered: "delivered",
          read: "read",
          failed: "failed",
          deleted: "dropped",
        };

        const mappedStatus = statusMapping[status.status] || "unknown";
        const errorMessage = status.errors?.[0]?.message;

        // Check for error codes that require email alerts
        const errorCode = status.errors?.[0]?.code;
        if (
          errorCode
          // &&
          // ERROR_CODES_TO_ALERT.includes(errorCode) &&
          // status.recipient_id
        ) {
          const errorReason =
            status.errors?.[0]?.message ||
            status.errors?.[0]?.title ||
            "Unknown error";
          await sendErrorAlertEmail(
            errorCode,
            status.recipient_id,
            errorReason,
            req.body,
          );
        }

        await correlateWebhookToMessage(
          {
            messageId: status.id,
            from: null,
            to: status.recipient_id || null,
            eventType: "status_update",
            responsePayload: status,
            mediaUrl: null,
          },
          mappedStatus,
          errorMessage,
        );

        // Status can be: sent, delivered, read, failed
        return;
      }

      // Handle incoming messages
      const messages = value.messages;
      if (!messages || messages.length === 0) {
        console.log("No messages in webhook payload");
        return;
      }

      const message = messages[0];
      const messageType = message.type;
      const fromNumber = message.from;

      console.log("Received WhatsApp message:", {
        from: fromNumber,
        type: messageType,
      });

      console.log("WhatsApp message:", JSON.stringify(message, null, 2));

      // Log incoming message webhook event (skip media per requirements)
      await logWebhookEvent({
        messageId: message.id || null,
        from: fromNumber || null,
        to: value.metadata?.phone_number_id || null,
        eventType: "incoming_message",
        responsePayload: {
          ...value,
          messages: [message],
        },
        mediaUrl: null, // Skip storing incoming message media per requirements
      });

      const messageIdempotencyKey = `whatsapp_msg_${message.id}`;
      const alreadyProcessed = await storage.isWebhookProcessed(
        messageIdempotencyKey,
      );

      if (alreadyProcessed) {
        console.log(
          "WhatsApp message already processed:",
          messageIdempotencyKey,
        );
        return;
      }

      const { handleIncomingMessage } = await import("./conversationHandler");
      try {
        await handleIncomingMessage(fromNumber, message, messageType);
        console.log(
          "handleIncomingMessage completed successfully for:",
          fromNumber,
        );
        await storage.markWebhookProcessed(messageIdempotencyKey);
      } catch (error: any) {
        console.error("Error in handleIncomingMessage:", {
          error: error.message,
          stack: error.stack,
          fromNumber,
          messageType,
        });
        // Don't mark as processed if there was an error
        throw error;
      }
    } catch (error: any) {
      console.error("Error processing WhatsApp webhook:", {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  app.post("/api/custom-album", async (req, res) => {
    try {
      const {
        title,
        yourName,
        recipientName,
        occasion,
        language,
        instructions,
        email,
        phone,
        questions,
      } = req.body;

      // Validate required fields
      if (!title || !recipientName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { sendCustomAlbumRequestEmail } = await import("./email");
      const emailSent = await sendCustomAlbumRequestEmail({
        title,
        yourName,
        recipientName,
        occasion,
        language,
        instructions,
        email,
        phone,
        questions,
      });

      if (!emailSent) {
        throw new Error(
          "Failed to send email. Check RESEND_API_KEY and verified sender/receiver addresses.",
        );
      }

      res.json({ success: true, message: "Request received successfully" });
    } catch (error: any) {
      console.error("Error submitting custom album:", error);
      res.status(500).json({ error: "Failed to submit request" });
    }
  });

  // Rate limiter for Gemini API: 5 requests per 30 minutes per IP
  const GEMINI_RATE_LIMIT = { max: 5, windowMs: 30 * 60 * 1000 };
  const geminiRequestTimestamps = new Map<string, number[]>();

  function getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string")
      return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
    return req.ip || "unknown";
  }

  /** Rate limit key: prefer browsing session ID (per-tab) over IP. Same pattern as QR tracking. */
  function getRateLimitKey(req: Request): string {
    const sessionId = req.headers["x-session-id"];
    if (typeof sessionId === "string" && /^[a-f0-9-]{36}$/i.test(sessionId)) {
      return `session:${sessionId}`;
    }
    return `ip:${getClientIp(req)}`;
  }

  function checkGeminiRateLimit(key: string): boolean {
    const now = Date.now();
    const cutoff = now - GEMINI_RATE_LIMIT.windowMs;
    let timestamps = geminiRequestTimestamps.get(key) ?? [];
    timestamps = timestamps.filter((t) => t > cutoff);
    if (timestamps.length >= GEMINI_RATE_LIMIT.max) return false;
    timestamps.push(now);
    geminiRequestTimestamps.set(key, timestamps);
    return true;
  }

  // Generate album preview via Gemini API
  app.post("/api/generate-album", async (req, res) => {
    try {
      const isDevMode = req.headers["x-dev-mode"] === "enzo";
      if (isDevMode) {
        console.log("dev mode activated!");
      }
      if (!isDevMode) {
        const rateLimitKey = getRateLimitKey(req);
        if (!checkGeminiRateLimit(rateLimitKey)) {
          return res.status(429).json({
            error: "limit exceeded. Try Again after 30 minutes.",
          });
        }
      }

      const body = req.body as any;
      const {
        orderId,
        recipientName,
        language,
        theme,
        personalHints,
        tone,
        albumGoal,
        makeItPersonal,
        topicsToAvoid,
        questions,
        relation,
      } = body;

      const validTones = ["warm", "respectful", "funny", "calm"];
      const validGoals = [
        "stories",
        "family_history",
        "values_lessons",
        "voice_future",
      ];

      if (!recipientName || !theme || !tone || !Array.isArray(albumGoal)) {
        return res.status(400).json({
          error:
            "Missing required fields: recipientName, theme, tone, albumGoal",
        });
      }
      if (!validTones.includes(tone)) {
        return res.status(400).json({
          error: `Invalid tone. Must be one of: ${validTones.join(", ")}`,
        });
      }
      if (albumGoal.length < 1) {
        return res.status(400).json({
          error: "Select at least one album goal",
        });
      }
      if (albumGoal.some((g: string) => !validGoals.includes(g))) {
        return res.status(400).json({
          error: `Invalid album goal. Must be one or more of: ${validGoals.join(", ")}`,
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Gemini API key not configured. Add GEMINI_API_KEY to .env",
        });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const { z } = await import("zod");

      const langMap: Record<string, string> = { en: "English", hn: "Hindi" };
      const langPref = langMap[language || ""] || "Both";

      const toneMap: Record<string, string> = {
        warm: "Warm and casual",
        respectful: "Respectful and formal",
        funny: "Funny and light",
        calm: "Calm and emotional",
      };
      const toneValue = toneMap[tone || "warm"] || "Warm and casual";

      const goalMap: Record<string, string> = {
        stories: "Capture stories",
        family_history: "Capture family history",
        values_lessons: "Capture values & lessons",
        voice_future: "Capture voice for the future",
      };
      const albumGoalsText =
        albumGoal?.map((g: string) => goalMap[g] || g).join(", ") ||
        "Capture stories";

      // Always generate both English and Hindi content
      const needsHindi = true;
      const needsEnglish = true;

      const customQuestionsText =
        questions
          ?.filter((q: { text?: string }) => q?.text?.trim())
          .map((q: { text: string }) => q.text)
          .join("\n- ") || "None";

      const safeRelation =
        typeof relation === "string" && relation.trim().length > 0
          ? relation.trim()
          : "unspecified";

      // Zod schema for new album structure (order_id + album with chapters)
      const questionPairSchema = z.object({ en: z.string(), hn: z.string() });
      const chapterSchema = z.object({
        title: z.object({ en: z.string(), hn: z.string() }),
        premise: z.object({ en: z.string(), hn: z.string() }),
        questions: z.array(questionPairSchema).length(3),
      });
      const generatedAlbumSchema = z.object({
        order_id: z.string(),
        album: z.object({
          title: z.object({ en: z.string(), hn: z.string() }),
          description: z.object({ en: z.string(), hn: z.string() }),
          chapters: z.array(chapterSchema).length(5),
        }),
      });

      // JSON schema for Gemini structured output (matches new album format)
      const responseJsonSchema = {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Echo of the order_id from INPUTS",
          },
          album: {
            type: "object",
            properties: {
              title: {
                type: "object",
                properties: {
                  en: { type: "string", description: "English" },
                  hn: {
                    type: "string",
                    description: "Hindi in Devanagari script",
                  },
                },
                required: ["en", "hn"],
              },
              description: {
                type: "object",
                properties: {
                  en: { type: "string", description: "English" },
                  hn: {
                    type: "string",
                    description: "Hindi in Devanagari script",
                  },
                },
                required: ["en", "hn"],
              },
              chapters: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "object",
                      properties: {
                        en: { type: "string", description: "English" },
                        hn: {
                          type: "string",
                          description: "Hindi in Devanagari script",
                        },
                      },
                      required: ["en", "hn"],
                    },
                    premise: {
                      type: "object",
                      properties: {
                        en: { type: "string", description: "English" },
                        hn: {
                          type: "string",
                          description: "Hindi in Devanagari script",
                        },
                      },
                      required: ["en", "hn"],
                    },
                    questions: {
                      type: "array",
                      minItems: 3,
                      maxItems: 3,
                      items: {
                        type: "object",
                        properties: {
                          en: { type: "string", description: "English" },
                          hn: {
                            type: "string",
                            description: "Hindi in Devanagari script",
                          },
                        },
                        required: ["en", "hn"],
                      },
                    },
                  },
                  required: ["title", "premise", "questions"],
                },
              },
            },
            required: ["title", "description", "chapters"],
          },
        },
        required: ["order_id", "album"],
      };

      const legacyPrompt = `You are the Kahani Album Designer.

Your job is to turn form inputs into a deeply personal, beautifully structured, WhatsApp-first story album.

You are not writing a survey.
You are not writing an interview.
You are not writing therapy prompts.
You are designing a gentle storytelling journey that helps someone share their life through easy voice notes.

The final output must feel like Kahani:
- warm
- personal
- respectful
- clear
- easy to answer
- emotionally real, never dramatic
- simple enough for WhatsApp
- thoughtful enough to become a keepsake book

IMPORTANT BRAND BEHAVIOR
Everything must feel comfort-first.
Use familiar, everyday language.
Keep emotional depth understated and natural.
Nothing should feel pushy, literary, preachy, or over-written.
Questions should feel like caring nudges.
Premises should feel like soft reminders before speaking.

INPUTS
- order_id: ${orderId ?? ""}
- who_is_this_for: ${recipientName}
- language_preference: ${langPref}
- theme: ${theme}
- personal_hints: ${personalHints || "None"}
- tone: ${toneValue}
- album_goal: ${albumGoalsText}
${topicsToAvoid ? `- topics_to_avoid: ${topicsToAvoid}` : ""}
${makeItPersonal ? `- make_it_more_personal: true` : ""}
${customQuestionsText !== "None" ? `- must_include_questions:\n  - ${customQuestionsText}` : ""}

YOUR THINKING PROCESS
Before writing anything, silently decide:
1. What kind of album this is emotionally.
2. What the storyteller is most likely to enjoy talking about.
3. What the receiver is most likely hoping to preserve.
4. What should feel easy at the start.
5. What should feel richer in the middle.
6. What should feel meaningful at the end.
7. How the selected goals should change the balance of memory, history, values, and voice.

Then design the album around that.

PRIMARY OBJECTIVE
Create an album that feels specific, intimate, and easy to answer.
It should unlock real stories, not generic responses.

SECONDARY OBJECTIVE
Make the album feel gift-worthy even before the stories are recorded.
That means the album title, chapter titles, and description must feel elegant, simple, and emotionally right.

NON-NEGOTIABLE RULES
1. Return exactly 5 chapters.
2. Return exactly 3 questions per chapter.
3. Return exactly 15 questions total.
4. Every question must be open-ended.
5. Every question must be a single ask only.
6. Every question must feel easy to answer in a WhatsApp voice note.
7. Never use buyer name, storyteller name, or relation labels inside any question.
8. Never use names or relation words in album title or chapter titles.
9. Do not ask count-based, fact-only, or trivia-style questions unless absolutely necessary to the theme.
10. Do not use guilt, fear, trauma-bait, regret-bait, or morbid framing unless explicitly requested.
11. Do not sound like a journalist, therapist, teacher, or historian.
12. Do not make the album feel generic, ceremonial, or overly poetic.
13. Keep all language natural and spoken.
14. If must_include_questions are provided, lightly rewrite them to fit the flow and style.
15. If topics_to_avoid are provided, exclude them completely.

QUESTION RULES
Every question must do at least one of these:
- unlock a memory
- open a scene
- invite a reflection
- reveal a habit, belief, or value
- bring out a turning point
- preserve a message or advice

Questions should preferably lead to stories, not one-line answers.

Avoid:
- two-part questions
- long setup before the real question
- repeated phrasing patterns
- overly abstract prompts
- stiff phrasing
- yes/no framing
- fact-check style questions
- generic prompts that could fit any person

Prefer:
- moments
- people
- places
- routines
- feelings around real events
- decisions
- lessons
- small details that make memories vivid

QUESTION LENGTH
- Aim for 8-14 words.
- Never exceed 18 words.

FIRST-PERSON INTIMACY RULE
Use first-person phrasing only where it makes the album feel warmer and more personal.
Examples of allowed styles when appropriate:
- What kind of child was I?
- What do you remember about my early school days?
- When did you first notice my personality?
Do not overuse first-person framing.
Use it only when it clearly fits the album context.

GOAL MAPPING
Use selected goals as weighted priorities.

- Capture stories:
  prioritize vivid memories, scenes, small details, people, moments
- Capture family history:
  prioritize place, background, family context, era, migration, traditions, timeline
- Capture values & lessons:
  prioritize beliefs, principles, choices, learnings, advice
- Capture voice for the future:
  prioritize messages, blessings, hopes, identity, reflection, essence

If multiple goals are selected, blend them naturally.
Do not make the album feel mechanically segmented by goals.

TONE MAPPING
The selected tone must affect both phrasing and structure.

- Warm & casual:
  soft, familiar, easy entry, emotionally open, natural
- Respectful & formal:
  dignified, polished, gentle, slightly more composed
- Funny & light:
  playful, affectionate, charming, easy, but never silly or jokey for the sake of it
- Calm & emo:
  tender, reflective, intimate, understated, emotionally deeper by the end

TITLE RULES
Album title matters a lot.
It should feel like the cover of a keepsake book.

Album title must be:
- 2 to 5 words
- elegant and memorable
- emotionally suggestive, not descriptive
- simple enough to feel timeless
- giftable
- non-generic
- no names
- no relation words
- no emojis
- no punctuation-heavy styling
- no colons
- no clichés like "Life Journey", "Sweet Memories", "My Story", "Precious Moments"

Good titles feel like:
- a mood
- a thread
- a world
- a quiet emotional lens

CHAPTER TITLE RULES
Chapter titles matter a lot.
They should feel like real book chapter titles, not category labels.

Each chapter title must be:
- 2 to 5 words
- elegant, simple, and specific to the album
- emotionally or narratively suggestive
- not generic labels like Childhood, Family, Career, Lessons, Memories
- not repetitive
- no names
- no relation words
- natural in both English and Hindi
- book-like, but still warm and accessible

Use chapter titles that create curiosity and texture.
They should feel like windows into a part of life, not folders.

DESCRIPTION RULES
Album description must be:
- exactly 2 short lines
- warm, clear, and meaningful
- gift-worthy
- simple, not salesy
- no names
- no relation words
- no fluff
- no overly poetic writing
- no explanatory product language

The description should help someone feel what kind of keepsake this is.

CHAPTER PREMISE RULES
Each chapter premise will be directly used in a WhatsApp flow before recording.
So write it as a soft pre-speaking reminder.

Each premise must be:
- 1 or 2 short sentences
- very easy to understand
- calm and warm
- not literary
- not abstract
- not long
- not a summary of the chapter
- not written like instructions from a teacher
- not repetitive across chapters

It should help the storyteller mentally enter that zone of memory before answering.

Think:
- gentle reminder
- emotional context
- light nudge toward detail

TITLE AND CHAPTER TITLE REJECTION FILTER
Reject and rewrite any title or chapter title that is:
- generic
- overused
- category-like
- relation-based
- name-based
- cliché
- too broad
- too explanatory
- too sentimental in a filmi way

Examples to reject:
- Childhood Days
- Family Memories
- My Journey
- Sweet Memories
- Lessons of Life
- Growing Up
- Our Story
- Precious Moments
- Career Path
- Mother's Love
- Papa's Story
- Nani Ke Kisse

Prefer titles that feel subtler, fresher, and more book-like.

RELATION WORDS TO AVOID IN TITLES
Do not use words like:
Mom, Mother, Dad, Father, Papa, Mummy, Sister, Brother, Dadi, Nani, Nana, Dada, Husband, Wife, Friend, Teacher, Uncle, Aunty
or their Hindi equivalents.

LANGUAGE RULES
English:
- light, conversational, natural
- no stiff or formal translation tone

Hindi:
- write in Devanagari
- keep it conversational
- use very common spoken Hindi
- common English words are allowed when they feel natural in everyday Hindi
- do not make Hindi too formal, literary, Sanskrit-heavy, or textbook-like
- do not transliterate Hindi into Roman script

MATCHING RULE
English and Hindi must match in meaning, order, and emotional intent.
Hindi should not be a literal awkward translation.
It should be the natural spoken equivalent.

PERSONALIZATION RULES
Use theme + personal_hints heavily.
These inputs should influence:
- album title direction
- chapter design
- chapter sequencing
- wording of questions
- emotional center of the album

If personal_hints are rich:
- make the album feel more custom and less universal

If personal_hints are sparse:
- stay warm and specific without becoming vague or generic

STRUCTURE RULES
Build a smooth emotional progression.
The progression should usually feel like:
- easy entry
- lived moments
- richer identity/history
- values/reflection
- meaningful close

But do not force a rigid template if the theme suggests a better flow.

QUALITY BAR FOR QUESTIONS
A good Kahani question should make someone want to say:
"Arre, this reminds me of something..."
or
"Achha, let me tell you properly..."

A bad Kahani question sounds like:
- a school assignment
- a podcast interview
- a counseling worksheet
- a factual form field

FINAL SELF-CHECK BEFORE OUTPUT
Before returning output, verify all of this:
- order_id is present
- album title follows all rules
- album description has exactly 2 short lines in both languages
- exactly 5 chapters
- each chapter has a title in English and Hindi
- each chapter has a premise in English and Hindi
- each chapter has exactly 3 questions
- each question has English and Hindi
- exactly 15 questions total
- no empty Hindi anywhere
- no names or relation words in title
- no names or relation words in chapter titles
- no names or relation labels inside questions
- no question is double-barrelled
- no question exceeds 18 words
- tone is reflected in both structure and phrasing
- selected goals are reflected in question balance
- output is valid JSON only

OUTPUT FORMAT
Return valid JSON only in exactly this structure:

{
  "order_id": "",
  "album": {
    "title": { "en": "", "hn": "" },
    "description": { "en": "", "hn": "" },
    "chapters": [
      {
        "title": { "en": "", "hn": "" },
        "premise": { "en": "", "hn": "" },
        "questions": [
          { "en": "", "hn": "" },
          { "en": "", "hn": "" },
          { "en": "", "hn": "" }
        ]
      },
      (4 more chapters with same structure, 5 chapters total)
    ]
  }
}`;

      const prompt = `You are the Kahani Album Designer.

Your job is to turn form inputs into a deeply personal, beautifully structured, WhatsApp-first story album.

You are not writing a survey.
You are not writing an interview.
You are not writing therapy prompts.
You are not writing generic journaling questions.
You are designing a gentle storytelling journey that helps someone remember, speak, and preserve real life through easy voice notes.

Do not optimize for elegant writing.
Optimize for questions that make the storyteller start speaking immediately.

KAHANI’S CORE TRUTH
Kahani is a memory-preservation product first.

So your job is not to generate “thoughtful questions.”
Your job is to generate memory triggers.

The best Kahani questions make someone say:
- “Arre, this reminds me…”
- “Haan, ek minute…”
- “Achha, let me tell you properly…”
- “There was this one time…”
- “This I still remember clearly…”

The final output must feel like Kahani:
- warm
- personal
- respectful
- clear
- easy to answer
- emotionally real, never dramatic
- simple enough for WhatsApp
- thoughtful enough to become a keepsake book

IMPORTANT BRAND BEHAVIOR
Everything must feel comfort-first.
Use familiar, everyday language.
Keep emotional depth understated and natural.
Nothing should feel pushy, literary, preachy, clinical, or over-written.
Questions should feel like caring nudges.
Premises should fit naturally inside Kahani’s WhatsApp reminder message format.
The output should feel human, intimate, and easy to enter.

WHAT YOU ARE REALLY DESIGNING
You are designing:
1. A memory journey
2. A speaking experience
3. A keepsake structure

This means the album should:
- be easy to start
- get richer naturally
- feel emotionally safe
- unlock real details
- preserve voice, memory, and meaning
- read beautifully later as a book

INPUTS
- order_id: ${orderId}
- relation: ${safeRelation}
- who_is_this_for: ${recipientName}
- language_preference: ${langPref}
- theme: ${theme}
- personal_hints: ${personalHints || "None"}
- tone: ${toneValue}
- album_goal: ${albumGoalsText}
${topicsToAvoid ? `- topics_to_avoid: ${topicsToAvoid}` : ""}
${makeItPersonal ? `- make_it_more_personal: true` : ""}
${customQuestionsText !== "None" ? `- must_include_questions:\n  - ${customQuestionsText}` : ""}

HOW TO THINK BEFORE WRITING
Before writing anything, silently decide:

1. What kind of memories this album should preserve
2. What the storyteller is most likely to enjoy talking about
3. What the receiver is most likely scared of losing
4. What emotional territory suits this relation
5. What should feel easy at the beginning
6. What should feel richer in the middle
7. What should feel meaningful at the end
8. How the selected goals should change the balance of memory, family history, values, and future voice
9. What kind of questions will make this particular person actually start recording
10. Which prompts would feel too generic, too polished, too abstract, or too formal for Kahani

Do not write the output until this is clear.

PRIMARY OBJECTIVE
Create an album that feels specific, intimate, and easy to answer.
It should unlock real memories, not generic responses.

SECONDARY OBJECTIVE
Make the album feel gift-worthy even before the stories are recorded.
That means the album title, chapter titles, and description must feel elegant, simple, emotionally right, and distinct.

TERTIARY OBJECTIVE
Make the album easy to complete on WhatsApp.
The questions should sound natural aloud and should invite voice-note storytelling, not overthinking.

NON-NEGOTIABLE STRUCTURE RULES
1. Return exactly 5 chapters.
2. Return exactly 3 questions per chapter.
3. Return exactly 15 questions total.
4. Every chapter must have:
   - one title in English
   - one title in Hindi
   - one premise in English
   - one premise in Hindi
   - exactly 3 questions in English and Hindi
5. Output must be valid JSON only.

NON-NEGOTIABLE QUESTION RULES
1. Every question must be open-ended.
2. Every question must be a single ask only.
3. Every question must feel easy to answer in a WhatsApp voice note.
4. Every question must feel human and spoken.
5. Never use buyer name, storyteller name, or relation labels inside any question.
6. Never write questions that sound like a school assignment, counseling worksheet, podcast interview, HR review, or biography form.
7. Never use overly polished language that sounds better on paper than in speech.
8. Never make the storyteller work too hard to understand the question.
9. Never ask count-based, trivia-style, or fact-only questions unless truly necessary.
10. Never use guilt, fear, trauma-bait, regret-bait, or morbid framing unless explicitly requested.
11. Never jump to “what did this teach you?” too early.
12. Never stack two ideas into one question.
13. Never overuse the same opening pattern.
14. If a question could fit many unrelated relations equally well, rewrite it to feel more relation-specific.
15. If must_include_questions are provided, lightly rewrite them so they match Kahani’s style and fit the flow.
16. If topics_to_avoid are provided, exclude them completely.

KAHANI QUESTION PHILOSOPHY
A strong Kahani question should do at least one of these:
- unlock a memory
- open a scene
- bring back a person
- bring back a place
- bring back a routine
- bring back a smell, sound, object, food, or atmosphere
- invite a reflection rooted in lived experience
- preserve a message or advice through memory

A strong Kahani question should feel like a conversation door.

A weak Kahani question usually does one of these:
- asks for a summary too soon
- sounds broad and generic
- sounds like a polished reflection prompt
- sounds more “thoughtful” than answerable
- asks for analysis instead of memory
- sounds emotionally correct but memory-poor

MEMORY BEFORE MEANING
Always start with memory.
Let meaning come later.

Preferred progression:
- recall
- describe
- relive
- reflect
- leave a message

Do not start by asking for values, lessons, or takeaways unless the album clearly demands it.

SCENE-BASED QUESTION RULE
At least 8 of the 15 questions should directly anchor the storyteller in one of the following:
- a moment
- a place
- a person
- a routine
- an object
- a meal
- a season
- a journey
- a festival
- a room
- a school day
- a workday
- a home scene
- a small habit
- a vivid detail

This is mandatory.

DETAIL-TRIGGER RULE
Prefer questions that can naturally bring out:
- what the place felt like
- who was around
- what people said
- what people used to do
- what small things mattered
- what made that time special
- what stayed in memory

RELATION-SPECIFICITY RULE
Questions must sound like they belong to this relation.

Examples:
- A mom album should feel different from a dadi album.
- A partner album should feel different from a sibling album.
- A dad album should feel different from a dadu album.

If the same question could appear unchanged in 4 different relation albums, rewrite it.

RELATION LENSES
Use the relation as a strong design cue.

For mom, often favor:
- home atmosphere
- care in small things
- childhood through her eyes
- her own younger self
- what she noticed quietly
- her hopes, fears, routines, warmth

For dad, often favor:
- effort, work, responsibility
- quiet acts of care
- pressure, pride, sacrifice
- decisions, discipline, protection
- the life he built
- what he may not have said directly

For dadu/nanu, often favor:
- roots
- old places
- family history
- life back then
- work and grit
- social change
- values shaped by real life

For dadi/nani, often favor:
- home-world memory
- girlhood and early life
- festivals, food, rituals
- emotional fabric of family life
- care, resilience, and little details
- the atmosphere of old times

For partner, often favor:
- first impressions
- early awkwardness
- everyday intimacy
- support in ordinary life
- little habits
- comfort
- repair after friction
- the feeling of “us” in real life

For sibling, often favor:
- growing up in the same house
- shared chaos
- school memories
- cousins, holidays, secrets
- fights, alliances, jokes, codes
- how the bond changed with age

These are cues, not rigid templates.

GOAL MAPPING
Use selected goals as weighted priorities.

- Capture stories:
  prioritize vivid memories, scenes, little incidents, people, places, and small details
- Capture family history:
  prioritize roots, background, family context, era, traditions, changes over time
- Capture values & lessons:
  prioritize beliefs, principles, and advice, but always root them in lived examples
- Capture voice for the future:
  prioritize messages, blessings, hopes, identity, emotional essence, and future-facing warmth

If multiple goals are selected, blend them naturally.
Do not make the album feel mechanically segmented by goal type.

TONE MAPPING
The selected tone must affect both phrasing and structure.

- Warm & casual:
  easy entry, familiar language, natural warmth, soft intimacy
- Formal & respectful:
  dignified, polished, gentle, slightly more composed, but still natural
- Funny & light:
  playful, affectionate, teasing in a warm way, easy, lively, but never silly or gimmicky
- Calm & emotional:
  tender, reflective, intimate, soft, emotionally deeper by the end, but still simple

QUESTION LENGTH RULE
- Aim for 8-14 words.
- Never exceed 18 words.

FIRST-PERSON INTIMACY RULE
Use first-person phrasing only where it makes the album feel warmer and more personal.

Examples of allowed styles when appropriate:
- What kind of child was I?
- What do you remember about my early school days?
- When did you first notice my personality?
- What about me worried you when I was small?
- What was I like at home then?

Do not overuse first-person framing.
Use it when it clearly fits the relation and theme.

ABSTRACTION CONTROL RULE
Reject and rewrite questions that lean too much on abstract phrasing such as:
- what kind of feeling...
- what do you value most about...
- how do we...
- what kind of environment...
- what kind of relationship...
- what does home feel like...
- what did this phase teach you...
unless they are clearly grounded in lived experience.

If a question sounds elegant but not immediately answerable aloud, rewrite it.

SUMMARY-MODE CONTROL RULE
Avoid pushing the storyteller into summary mode too early.

Examples of weak early questions:
- What values shaped your life?
- What did childhood teach you?
- What do you value most about family?
- What kind of relationship did you build?

Instead, begin with moments, scenes, people, routines, and memories.
Let summaries come later, if at all.

TITLE RULES
Album title matters a lot.
It should feel like the cover of a keepsake book.

Album title must be:
- 2 to 5 words
- elegant and memorable
- emotionally suggestive, not merely descriptive
- simple enough to feel timeless
- giftable
- distinct
- non-generic
- no names
- no relation words
- no emojis
- no punctuation-heavy styling
- no colons
- no cliché phrases like:
  - Life Journey
  - Sweet Memories
  - My Story
  - Precious Moments
  - Beautiful Bond
  - Journey of Love
  - Family Memories

Good titles feel like:
- a mood
- a thread
- a memory world
- a quiet emotional lens
- something you would be proud to see on a printed keepsake

TITLE REJECTION FILTER
Reject and rewrite any album title that is:
- generic
- too broad
- too descriptive
- too sentimental in a filmi way
- too literary for Kahani
- relation-based
- name-based
- decorative but emotionally vague

Examples to reject:
- A Childhood Tapestry
- Our Shared Sunsets
- Threads of Us
- Childhood Memories
- Family Love
- Papa’s Story
- Nani Ke Kisse
- Life Lessons
- Memories Forever

CHAPTER TITLE RULES
Chapter titles matter a lot.
They should feel like real book chapter titles, not folders or topic labels.

Each chapter title must be:
- 2 to 5 words
- elegant, simple, and emotionally or narratively suggestive
- specific to the album
- distinct from the other chapter titles
- easy to understand
- warm and natural
- no names
- no relation words
- no generic labels like:
  - Childhood
  - Family
  - Career
  - Lessons
  - Memories
  - Love
  - Marriage
  - School Days
  - Routines

Chapter titles should create curiosity and texture.
They should feel like windows into a part of life, not category tabs.

CHAPTER TITLE REJECTION FILTER
Reject and rewrite chapter titles that sound like:
- content buckets
- workbook headings
- corporate labels
- school essay sections
- polished but empty poetic phrases

Examples to reject:
- Early Days at Home
- First Steps in Learning
- Family Routines
- Lessons Carried Forward
- Quiet Support
- Our Shared World
- Life Then and Now
- Words of Wisdom
- Kitchen Memories

DESCRIPTION RULES
Album description must be:
- in exactly 2 short lines for English
- in exactly 2 short lines for Hindi
- warm, clear, and meaningful
- gift-worthy
- emotionally grounded
- simple, not salesy
- not vague
- not generic
- no names
- no relation words
- no fluff
- no over-poetic copy
- no product explanation language

The description should help someone feel what kind of keepsake this is.

CHAPTER PREMISE RULES
Each chapter premise will be inserted into this message format:

English:
Before we start, please take a minute.

Just remember your stories about \${storytellerDescription}.

\${buyerName} will really enjoy the little details. 🙂

Hindi:
शुरू करने से पहले, कृपया एक मिनट लें।

बस \${storytellerDescription} के बारे में अपनी कहानियों को یاد करें।

\${buyerName} छोटी-छोटी बातों का बहुत आनंद लेंगे। 🙂

So the premise you generate is not a full message.
It is only the storytellerDescription part that gets inserted into this template.

This means every premise must:
- read naturally after the words “your stories about”
- work as a short memory zone or chapter cue
- feel natural in both English and Hindi
- be concise and speakable
- usually be a noun phrase or short descriptive phrase, not a full instruction
- avoid sounding like a chapter title pasted awkwardly into a sentence
- avoid sounding too abstract, literary, or backend-like
- help the storyteller instantly know what part of life to remember

Good premise examples:
- the little things that made home feel warm
- my early school days and what you noticed then
- the fun, fights, and secrets we shared growing up
- the early days of us becoming comfortable together

Bad premise examples:
- This chapter is about childhood memories
- Think about your values and lessons from family life
- a reflective exploration of emotional support
- Early Days at Home

PREMISE QUALITY TEST
A good premise should fit smoothly into:
“Just remember your stories about \${storytellerDescription}.”

If it sounds awkward in that sentence, rewrite it.

LANGUAGE RULES
English:
- light, conversational, natural
- slightly Indian in rhythm is okay if it feels more human
- should sound good when read aloud
- no stiff or formal translation tone

Hindi:
- write in Devanagari
- keep it conversational
- use very common spoken Hindi
- common English words are allowed when they feel natural in daily speech
- do not make Hindi too formal, literary, Sanskrit-heavy, or textbook-like
- do not transliterate Hindi into Roman script

MATCHING RULE
English and Hindi must match in:
- meaning
- order
- emotional intent
- specificity

Hindi should not be a literal awkward translation.
It should be the natural spoken equivalent.

PERSONALIZATION RULES
Use relation + theme + personal_hints heavily.
These inputs should shape:
- the album’s emotional center
- the title direction
- the chapter identity
- the sequence
- the level of intimacy
- the language texture
- the likely memories being unlocked

If personal_hints are rich:
- make the album more custom and less universal

If personal_hints are sparse:
- stay warm and specific without becoming generic

If theme is too broad:
- infer the most emotionally useful angle from the relation + hints + goals

If theme is already emotionally clear:
- commit to that direction strongly

QUESTION BALANCE RULE
Across the 15 questions, aim for this balance:
- many memory and scene questions
- some relationship and feeling questions
- a small number of reflection questions
- one or two meaningful future-facing or message-based closing questions

Do not overload the album with lesson questions.

DIVERSITY RULE
Across the 15 questions:
- vary openings
- vary emotional texture
- vary memory triggers
- vary the type of detail being unlocked

Do not make every question sound structurally similar.

Examples of repetitive weak openings:
- What was...
- What kind of...
- What do you...
- When did you...
used too many times in a row

Prefer rhythm and variation.

FINAL SELF-CHECK BEFORE OUTPUT
Before returning output, verify all of this:

STRUCTURE
- order_id is present
- exactly 5 chapters
- each chapter has title, premise, and 3 questions
- exactly 15 questions total
- valid JSON only

TITLE
- album title follows all rules
- album title does not use names or relation words
- album title is not generic, vague, or cliché

DESCRIPTION
- English description is exactly 2 short lines
- Hindi description is exactly 2 short lines
- both feel gift-worthy and clear

CHAPTER TITLES
- every chapter title follows all rules
- no chapter title is generic or category-like
- no names or relation words appear
- chapter titles feel distinct and book-like

PREMISES
- every premise fits naturally into the WhatsApp template line:
  “Just remember your stories about \${storytellerDescription}.”
- no premise sounds like a backend label
- no premise is too abstract or repetitive
- premises are concise and natural in both languages

QUESTIONS
- every question is open-ended
- every question is single-ask
- every question feels easy to answer aloud
- no question exceeds 18 words
- at least 8 questions are scene-based or detail-anchored
- no question sounds like generic journaling
- no question sounds too abstract
- no question is too broad or summary-driven
- no names or relation labels appear inside questions
- the set feels relation-specific
- the set feels memory-first
- the set feels warm and Indian in rhythm
- the selected tone is visible
- the selected goals are reflected

LANGUAGE
- no empty Hindi fields
- Hindi is natural and spoken
- English and Hindi match in meaning and order

OUTPUT FORMAT
Return valid JSON only in exactly this structure:

{
  "order_id": "",
  "album": {
    "title": {
      "en": "",
      "hn": ""
    },
    "description": {
      "en": "",
      "hn": ""
    },
    "chapters": [
      {
        "title": {
          "en": "",
          "hn": ""
        },
        "premise": {
          "en": "",
          "hn": ""
        },
        "questions": [
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          }
        ]
      },
      {
        "title": {
          "en": "",
          "hn": ""
        },
        "premise": {
          "en": "",
          "hn": ""
        },
        "questions": [
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          }
        ]
      },
      {
        "title": {
          "en": "",
          "hn": ""
        },
        "premise": {
          "en": "",
          "hn": ""
        },
        "questions": [
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          }
        ]
      },
      {
        "title": {
          "en": "",
          "hn": ""
        },
        "premise": {
          "en": "",
          "hn": ""
        },
        "questions": [
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          }
        ]
      },
      {
        "title": {
          "en": "",
          "hn": ""
        },
        "premise": {
          "en": "",
          "hn": ""
        },
        "questions": [
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          },
          {
            "en": "",
            "hn": ""
          }
        ]
      }
    ]
  }
}`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      const parsed = JSON.parse(text);
      const validated = generatedAlbumSchema.safeParse(parsed);
      if (!validated.success) {
        console.error("Gemini response validation failed:", validated.error);
        throw new Error("Invalid album structure from Gemini");
      }

      // Normalize from new album format to the shape downstream code expects.
      // questionSetTitles / questionSetPremise: exactly 5 items each; .en = English, .hn = Hindi (Devanagari).
      const { album: albumData } = validated.data;
      const chapters = albumData.chapters;
      const titlesEn = chapters.map((ch) => ch.title.en);
      const titlesHn = chapters.map((ch) => ch.title.hn);
      const premisesEn = chapters.map((ch) => ch.premise.en);
      const premisesHn = chapters.map((ch) => ch.premise.hn);
      if (
        titlesEn.length !== 5 ||
        titlesHn.length !== 5 ||
        premisesEn.length !== 5 ||
        premisesHn.length !== 5
      ) {
        throw new Error(
          "Invalid album: questionSetTitles and questionSetPremise must have exactly 5 items each (en and hn)",
        );
      }
      const questionsEn = chapters.flatMap((ch) =>
        ch.questions.map((q) => q.en),
      );
      const questionsHn = chapters.flatMap((ch) =>
        ch.questions.map((q) => q.hn),
      );
      res.json({
        title: albumData.title.en,
        description: albumData.description.en,
        questions: questionsEn,
        questionsHn,
        questionSetTitles: { en: titlesEn, hn: titlesHn },
        questionSetPremise: { en: premisesEn, hn: premisesHn },
      });
    } catch (error: any) {
      console.error("Error generating album:", error);
      res.status(500).json({
        error: error.message || "Failed to generate album",
      });
    }
  });

  const GENERATED_ALBUM_COVER =
    "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/fallaback_album_cover.png";

  // Request generated album: seed to DB (is_active=false) + send email (reuses custom-album email flow)
  app.post("/api/request-generated-album", async (req, res) => {
    try {
      const { album, formData } = req.body;
      if (!album || !formData) {
        return res.status(400).json({ error: "Missing album or formData" });
      }
      const {
        recipientName,
        theme,
        occasion,
        language,
        personalHints,
        instructions,
      } = formData;
      const themeOrOccasion = theme || occasion;
      if (!recipientName || !themeOrOccasion) {
        return res.status(400).json({
          error: "Missing required formData: recipientName, theme",
        });
      }
      // Normalize album keys (support both camelCase and snake_case from client)
      const title = album.title;
      const description = album.description;
      const questions = album.questions;
      const questionsHn =
        album.questionsHn ??
        (album as { questions_hn?: string[] }).questions_hn;
      const questionSetTitles =
        album.questionSetTitles ??
        (album as { question_set_titles?: { en?: string[]; hn?: string[] } })
          .question_set_titles;
      const questionSetPremise =
        album.questionSetPremise ??
        (album as { question_set_premise?: { en?: string[]; hn?: string[] } })
          .question_set_premise;
      if (!title || !description || !Array.isArray(questions)) {
        return res.status(400).json({
          error: "Invalid album: title, description, and questions required",
        });
      }

      let finalTitle = title;
      const allAlbums = await storage.getAllAlbumsAdmin();
      if (
        allAlbums.some(
          (a) => a.title.toLowerCase() === finalTitle.toLowerCase(),
        )
      ) {
        finalTitle = `${finalTitle} (Custom ${crypto.randomUUID().slice(0, 8)})`;
      }

      const newAlbum = await storage.createAlbum({
        title: finalTitle,
        description,
        questions,
        questionsHn: Array.isArray(questionsHn) ? questionsHn : null,
        coverImage: GENERATED_ALBUM_COVER,
        bestFitFor: null,
        isActive: false,
        isConversationalAlbum: true,
        questionSetTitles: questionSetTitles
          ? { en: questionSetTitles.en || [], hn: questionSetTitles.hn || [] }
          : { en: [], hn: [] },
        questionSetPremise: questionSetPremise
          ? {
              en: questionSetPremise.en || [],
              hn: questionSetPremise.hn || [],
            }
          : null,
      });

      // Validate album creation succeeded and returned a valid ID
      if (!newAlbum || !newAlbum.id) {
        console.error(
          "[RequestGeneratedAlbum] Failed to create album - no ID returned",
        );
        throw new Error("Failed to create album in database");
      }

      const albumId = newAlbum.id;
      console.log("[RequestGeneratedAlbum] Album created successfully:", {
        albumId,
        title: finalTitle,
        isActive: false,
      });

      const { sendCustomAlbumRequestEmail } = await import("./email");
      const emailSent = await sendCustomAlbumRequestEmail({
        title: finalTitle,
        yourName: formData.yourName,
        recipientName,
        occasion: themeOrOccasion,
        language: language || formData.language || "en",
        instructions: personalHints || instructions || "",
        email: formData.email,
        phone: formData.phone,
        questions: questions.map((q: string) => ({ text: q })),
      });
      if (!emailSent) {
        throw new Error(
          "Failed to send email. Check RESEND_API_KEY and verified sender/receiver addresses.",
        );
      }

      res.json({
        success: true,
        message: "Request received successfully",
        albumId,
      });
    } catch (error: any) {
      console.error("Error requesting generated album:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to submit request" });
    }
  });

  // Premium package order email notification
  app.post("/api/premium-order-email", async (req, res) => {
    try {
      const {
        packageType,
        buyerName,
        customerPhone,
        storytellerName,
        languagePreference,
        albumId,
        albumTitle,
      } = req.body;

      // Validate required fields
      if (!packageType || !buyerName || !customerPhone || !storytellerName) {
        console.error("Missing required fields");
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Only send email for premium packages (ebook and printed)
      if (packageType !== "ebook" && packageType !== "printed") {
        console.log("Not a premium package, skipping email");
        return res.json({
          success: true,
          message: "No email needed for this package",
        });
      }

      console.log("Premium package confirmed, preparing email...");
      const { sendEmail } = await import("./email");

      // Map package types to display names and prices
      const packageDetails: Record<string, { name: string; price: string }> = {
        ebook: { name: "Voice Album + E-Book", price: "₹599" },
        printed: { name: "Voice Album + E-Book + Printed Book", price: "₹999" },
      };

      const selectedPackage = packageDetails[packageType];
      console.log("Selected package details:", selectedPackage);

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #A35139;">New Premium Package Order</h1>
          <p>You have received a new order for a premium Kahani package!</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Package</td><td style="padding: 10px;">${selectedPackage.name}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold;">Price</td><td style="padding: 10px;">${selectedPackage.price}</td></tr>
            <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Buyer Name</td><td style="padding: 10px;">${buyerName}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold;">WhatsApp Number</td><td style="padding: 10px;">${customerPhone}</td></tr>
            <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Storyteller Name</td><td style="padding: 10px;">${storytellerName}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold;">Language Preference</td><td style="padding: 10px;">${languagePreference === "hn" ? "हिंदी (Hindi)" : "English"}</td></tr>
            <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Album</td><td style="padding: 10px;">${albumTitle || albumId || "N/A"}</td></tr>
          </table>

          <div style="margin-top: 30px; font-size: 12px; color: #888;">
            Sent from Kahani Web Platform
          </div>
        </div>
      `;

      // Send to Admin
      const emailSent = await sendEmail({
        to: "sarthakseth021@gmail.com",
        subject: `New Premium Order: ${selectedPackage.name} - ${buyerName}`,
        html: emailHtml,
      });

      if (!emailSent) {
        console.error("sendEmail returned false");
        throw new Error(
          "Failed to send email. Check RESEND_API_KEY and verified sender/receiver addresses.",
        );
      }

      console.log("Email sent successfully!");
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("Error sending premium order email:", error);
      console.error("Error stack:", error.stack);
      res
        .status(500)
        .json({ error: "Failed to send email", details: error.message });
    }
  });

  // Traffic source tracking endpoint
  app.post("/api/tracking/source", async (req, res) => {
    try {
      const { source } = req.body;

      if (!source || typeof source !== "string") {
        return res.status(400).json({ error: "Source parameter is required" });
      }

      // Validate source is a safe string (alphanumeric and hyphens/underscores only)
      if (!/^[a-zA-Z0-9_-]+$/.test(source)) {
        return res.status(400).json({ error: "Invalid source format" });
      }

      const { pool } = await import("./db");

      // Update the existing record (assumes record exists)
      const result = await pool.query(
        `
        UPDATE traffic_sources 
        SET 
          count = count + 1,
          updated_at = NOW()
        WHERE source = $1
        RETURNING source, count
        `,
        [source],
      );

      // If no rows were updated, the record doesn't exist - insert it
      if (result.rowCount === 0) {
        const insertResult = await pool.query(
          `
          INSERT INTO traffic_sources (source, count, created_at, updated_at)
          VALUES ($1, 1, NOW(), NOW())
          RETURNING source, count
          `,
          [source],
        );
        return res.json({
          success: true,
          source: insertResult.rows[0].source,
          count: insertResult.rows[0].count,
        });
      }

      res.json({
        success: true,
        source: result.rows[0].source,
        count: result.rows[0].count,
      });
    } catch (error) {
      console.error("[Tracking] Error tracking traffic source:", error);
      // Don't break user experience - return success even if tracking fails
      res.status(500).json({ error: "Failed to track source" });
    }
  });

  // Optional: Endpoint for Render Cron Jobs or external schedulers
  app.post("/api/internal/process-scheduled", async (req, res) => {
    // Optional: Add auth check
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers["authorization"] !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { processScheduledTasks } = await import("./scheduler");
      await processScheduledTasks();
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: "Scheduled tasks processed",
      });
    } catch (error) {
      console.error("Error in scheduled tasks endpoint:", error);
      res.status(500).json({ error: "Failed to process scheduled tasks" });
    }
  });

  // ─── Testimonial videos (served from R2 site-assets bucket) ────────
  app.get("/api/testimonial-videos", async (_req, res) => {
    try {
      const { listSiteAssets } = await import("./r2");
      const assets = await listSiteAssets("testimonials/");

      const videos = assets
        .filter((a) => /\.(mp4|webm|mov)$/i.test(a.key))
        .map((a) => {
          const fileName = a.key.split("/").pop() || a.key;
          const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");
          const label = nameWithoutExt
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          return { key: a.key, url: a.url, label };
        });

      res.set({
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200",
      });
      res.json(videos);
    } catch (error) {
      console.error("Error fetching testimonial videos:", error);
      res.status(500).json({ error: "Failed to fetch testimonial videos" });
    }
  });

  // ─── Route guard: /order-details requires verified payment ─────────
  // Runs before the SPA catch-all. On full page loads (direct URL, back
  // button, refresh) this checks the DB and redirects away if there is
  // no completed payment for the given paymentOrderId.
  app.get("/order-details", async (req, res, next) => {
    try {
      const paymentOrderId = req.query.paymentOrderId as string | undefined;

      if (!paymentOrderId) {
        const albumId = (req.query.albumId as string) || "";
        return res.redirect(
          `/free-trial${albumId ? `?albumId=${albumId}` : ""}`,
        );
      }

      const txn = await storage.getTransactionByPaymentOrderId(paymentOrderId);

      if (!txn || txn.paymentStatus !== "success") {
        const albumId = (req.query.albumId as string) || "";
        return res.redirect(
          `/free-trial${albumId ? `?albumId=${albumId}` : ""}`,
        );
      }

      next();
    } catch (error) {
      console.error("Error verifying payment:", error);
      next();
    }
  });

  // ── Blog endpoints ──

  app.get("/api/blogs", async (req: Request, res: Response) => {
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        `SELECT id, title, slug, meta_description, featured_image, excerpt, published_at, created_at
         FROM blogs
         WHERE published = true
         ORDER BY published_at DESC NULLS LAST, created_at DESC`,
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      res.status(500).json({ error: "Failed to fetch blogs" });
    }
  });

  app.get("/api/blogs/:slug", async (req: Request, res: Response) => {
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        `SELECT * FROM blogs WHERE slug = $1 AND published = true LIMIT 1`,
        [req.params.slug],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Blog not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching blog:", error);
      res.status(500).json({ error: "Failed to fetch blog" });
    }
  });

  // ─── User Order Details ─────────────────────────────────────────────
  //
  // Step 1 of 2 — save form fields to Supabase (JSON body, no files).
  //   orderId is passed as "<trialId>-<transactionId>" from the client.
  //   image_url is initialised as an empty JSON array; filled by step 2.

  app.post("/api/user-order-details", async (req: Request, res: Response) => {
    try {
      const { pool } = await import("./db");

      const {
        trialId,
        transactionId,
        orderId,
        buyerFullName,
        authorName,
        additionalCopies,
        recipientName,
        recipientPhone,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        detailsConfirmed,
      } = req.body as Record<string, unknown>;

      // transaction_id is uuid in the DB – guard against non-uuid strings
      const txId =
        typeof transactionId === "string" && transactionId.trim()
          ? transactionId.trim()
          : null;

      const result = await pool.query(
        `INSERT INTO user_order_details (
           trial_id, transaction_id, order_id,
           buyer_full_name, author_name,
           additional_copies,
           recipient_name, recipient_phone,
           address_line1, address_line2,
           city, state, pincode,
           details_confirmed, image_url
         ) VALUES (
           $1, $2::uuid, $3,
           $4, $5,
           $6,
           $7, $8,
           $9, $10,
           $11, $12, $13,
           $14, '[]'::jsonb
         )
         RETURNING id`,
        [
          trialId || null,
          txId,
          orderId || null,
          buyerFullName,
          authorName,
          parseInt(String(additionalCopies ?? "0"), 10),
          recipientName,
          recipientPhone,
          addressLine1,
          addressLine2 || null,
          city,
          state,
          pincode,
          detailsConfirmed === true || detailsConfirmed === "true",
        ],
      );

      res.json({ success: true, id: result.rows[0].id as string });
    } catch (error) {
      console.error("Error saving user order details:", error);
      res.status(500).json({ error: "Failed to save order details" });
    }
  });

  // ─── User Order Images ───────────────────────────────────────────────
  //
  // Step 2 of 2 — upload photos to Cloudflare R2, then write the public
  //   URLs back to the image_url column of the row saved in step 1.
  //
  //   Bucket : album-cover-images-user
  //   Key    : userOrderUploads/<rowId>-<timestamp>-<safeName>
  //   URL    : https://profile.kahani.xyz/userOrderUploads/<rowId>-<timestamp>-<safeName>

  app.post(
    "/api/user-order-images/:rowId",
    upload.array("photos", 5),
    async (req: Request, res: Response) => {
      try {
        const { pool } = await import("./db");
        const { uploadToR2, R2_ALBUM_COVERS_BUCKET } = await import("./r2");

        const { rowId } = req.params;
        const files = (req.files ?? []) as Express.Multer.File[];

        // Upload all photos in parallel
        // Key  : userOrderUploads/<rowId>-<timestamp>-<safeName>
        // URL  : https://profile.kahani.xyz/<key>  (via R2_ALBUM_COVERS_PUBLIC_BUCKET_BASE_URL)
        const uploadResults = await Promise.all(
          files.map(async (file) => {
            const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
            const key = `userOrderUploads/${rowId}-${Date.now()}-${safeName}`;
            return uploadToR2(
              R2_ALBUM_COVERS_BUCKET,
              key,
              file.buffer,
              file.mimetype,
            );
          }),
        );

        const imageUrls = uploadResults.filter((u): u is string => u !== null);

        // Persist URLs to Supabase
        await pool.query(
          `UPDATE user_order_details SET image_url = $1::jsonb WHERE id = $2`,
          [JSON.stringify(imageUrls), rowId],
        );

        res.json({ success: true, imageUrls });
      } catch (error) {
        console.error("Error uploading order images:", error);
        res.status(500).json({ error: "Failed to upload images" });
      }
    },
  );

  // ─── Extra-copies PhonePe payment ───────────────────────────────────
  //
  // Creates a PhonePe order for the surcharge on additional book copies.
  // Amount is computed SERVER-SIDE from the saved user_order_details row
  // (₹300 per copy beyond the first, × 100 to convert to paise).
  // Returns the PhonePe redirect URL for the client to navigate to directly.

  app.post("/api/phonepe/create-extra-copies-order", async (req, res) => {
    try {
      const { orderDetailsId, promoCode } = req.body as {
        orderDetailsId?: string;
        promoCode?: string | null;
      };
      if (!orderDetailsId) {
        return res.status(400).json({ error: "Missing orderDetailsId" });
      }

      const { pool } = await import("./db");
      const { rows } = await pool.query(
        `SELECT id, additional_copies
         FROM user_order_details WHERE id = $1`,
        [orderDetailsId],
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const order = rows[0] as { additional_copies?: number };
      const extraCopies = Math.max(order.additional_copies || 0, 0);

      if (extraCopies <= 0) {
        return res.status(400).json({ error: "No extra copies to charge for" });
      }

      // ₹400 per extra copy → paise
      const baseAmountPaise = extraCopies * 400 * 100;

      // Apply book-order promo code if provided
      let finalAmountPaise = baseAmountPaise;
      let discountAmountPaise = 0;
      let appliedPromoCode: string | null = null;

      if (promoCode) {
        const normalizedCode = promoCode.trim().toUpperCase();
        const { rows: dRows } = await pool.query(
          `SELECT id, code, discount_type, discount_value, book_order
           FROM discounts WHERE code = $1 AND is_active = true LIMIT 1`,
          [normalizedCode],
        );
        const dRow = dRows[0];

        if (dRow && dRow.book_order) {
          if (dRow.discount_type === "percentage") {
            discountAmountPaise = Math.floor(
              (baseAmountPaise * dRow.discount_value) / 100,
            );
          } else {
            discountAmountPaise = Math.min(
              dRow.discount_value,
              baseAmountPaise,
            );
          }
          finalAmountPaise = Math.max(
            baseAmountPaise - discountAmountPaise,
            100,
          );
          discountAmountPaise = baseAmountPaise - finalAmountPaise;
          appliedPromoCode = normalizedCode;
        }
      }

      const extraAmountPaise = finalAmountPaise;

      const { randomUUID } = await import("crypto");
      const merchantOrderId = `EXT_${Date.now()}_${randomUUID().slice(0, 8)}`;
      const merchantUserId = randomUUID();

      const { phonePeService } = await import("./phonepe");
      const callbackUrl = `${phonePeCallbackBase()}/payment/callback?merchantOrderId=${merchantOrderId}&flowType=extra-copies&orderDetailsId=${orderDetailsId}`;

      const orderResponse = await phonePeService.createOrder({
        amount: extraAmountPaise,
        merchantOrderId,
        merchantUserId,
        redirectUrl: callbackUrl,
        // metadata only supports albumId/packageType; extra-copies context is in the callback URL
      });

      if (
        !orderResponse.success ||
        !orderResponse.data?.instrumentResponse?.redirectInfo?.url
      ) {
        return res
          .status(500)
          .json({ error: "Failed to create payment order" });
      }

      // Persist pending state so the callback can verify the amount
      await pool.query(
        `UPDATE user_order_details
         SET extra_payment_status = 'pending',
             extra_payment_order_id = $1,
             extra_payment_amount_paise = $2
         WHERE id = $3`,
        [merchantOrderId, extraAmountPaise, orderDetailsId],
      );

      res.json({
        success: true,
        redirectUrl: orderResponse.data.instrumentResponse.redirectInfo.url,
        baseAmountRupees: Math.round(baseAmountPaise / 100),
        discountAmountRupees: Math.round(discountAmountPaise / 100),
        finalAmountRupees: Math.round(finalAmountPaise / 100),
        appliedPromoCode,
      });
    } catch (error) {
      console.error("Error creating extra-copies PhonePe order:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  // ─── Extra-copies payment callback update ───────────────────────────
  // Called by PaymentCallback.tsx after PhonePe confirms the payment.
  // Verifies the paid amount matches what was stored at order-create time.

  app.put(
    "/api/user-order-details/payment/:merchantOrderId",
    async (req, res) => {
      try {
        const { merchantOrderId } = req.params;
        const { paymentStatus, paymentTransactionId, paymentAmount } =
          req.body as {
            paymentStatus: string;
            paymentTransactionId?: string;
            paymentAmount?: number;
          };

        const { pool } = await import("./db");
        const { rows } = await pool.query(
          `SELECT id, extra_payment_amount_paise
           FROM user_order_details WHERE extra_payment_order_id = $1`,
          [merchantOrderId],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Order not found" });
        }

        const order = rows[0];

        // Amount integrity check for successful payments
        if (
          paymentStatus === "success" &&
          typeof paymentAmount === "number" &&
          order.extra_payment_amount_paise !== paymentAmount
        ) {
          console.error("SECURITY: Extra-copies amount mismatch", {
            expected: order.extra_payment_amount_paise,
            received: paymentAmount,
          });
          return res
            .status(400)
            .json({ error: "Payment amount verification failed" });
        }

        await pool.query(
          `UPDATE user_order_details
           SET extra_payment_status = $1
           WHERE extra_payment_order_id = $2`,
          [paymentStatus, merchantOrderId],
        );

        res.json({ success: true, id: order.id });
      } catch (error) {
        console.error("Error updating extra-copies payment status:", error);
        res.status(500).json({ error: "Failed to update payment status" });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
