import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import {
  insertOrderSchema,
  insertFreeTrialSchema,
  insertFeedbackSchema,
  PACKAGE_PRICES,
} from "@shared/schema";
import { logWebhookEvent, correlateWebhookToMessage } from "./whatsappLogger";
import { sendErrorAlertEmail } from "./email";
import { trackServerEvent, initPostHog } from "./posthog";

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

  // Transaction Management Endpoints
  // Create transaction record (one per payment attempt)
  app.post("/api/transactions", async (req, res) => {
    try {
      const { name, phone, phoneE164, albumId, packageType } = req.body;

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
      const { albumId, packageType, transactionId, discountCode } = req.body;

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
      const redirectUrl = `${process.env.APP_BASE_URL}/payment/callback?merchantOrderId=${merchantOrderId}&albumId=${albumId}&packageType=${packageType}${transactionId ? `&transactionId=${transactionId}` : ""}`;

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

  // PhonePe: Payment callback (fallback - client-side routing handles this)
  // This route is kept as a backup in case client-side routing fails
  app.get("/payment/callback", async (req, res) => {
    try {
      const { merchantOrderId, albumId, packageType, transactionId } =
        req.query;

      if (!merchantOrderId) {
        return res.redirect(
          `${process.env.APP_BASE_URL}/free-trial?error=missing_order_id`,
        );
      }

      // Verify payment with PhonePe
      const { phonePeService } = await import("./phonepe");
      const statusResponse = await phonePeService.checkPaymentStatus(
        merchantOrderId as string,
      );
      const isSuccess =
        statusResponse.success && statusResponse.data?.state === "COMPLETED";

      // Redirect based on payment status
      const baseUrl = process.env.APP_BASE_URL || "";
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

      const {
        yourName,
        phone,
        recipientName,
        occasion,
        instructions,
        title,
        email,
        language,
        questions,
      } = req.body;

      // Validate required fields (everything except advanced customization)
      if (!yourName || !phone || !recipientName || !occasion) {
        return res.status(400).json({
          error:
            "Missing required fields: yourName, phone, recipientName, occasion",
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

      const generatedAlbumSchema = z.object({
        title: z.string(),
        description: z.string(),
        questions: z.array(z.string()).min(15).max(15),
        questionsHn: z.array(z.string()).min(15).max(15),
        questionSetTitles: z.object({
          en: z.array(z.string()).length(5),
          hn: z.array(z.string()).length(5),
        }),
        questionSetPremise: z.object({
          en: z.array(z.string()).length(5),
          hn: z.array(z.string()).length(5),
        }),
      });

      const responseJsonSchema = {
        type: "object",
        properties: {
          title: { type: "string", description: "Album title" },
          description: { type: "string", description: "Album description" },
          questions: {
            type: "array",
            items: { type: "string" },
            minItems: 15,
            maxItems: 15,
            description:
              "Exactly 15 thoughtful prompts for voice recording in English, 3 per section",
          },
          questionsHn: {
            type: "array",
            items: { type: "string" },
            minItems: 15,
            maxItems: 15,
            description:
              "Exactly 15 Hindi translations of the questions, matching the order of the English questions",
          },
          questionSetTitles: {
            type: "object",
            properties: {
              en: {
                type: "array",
                items: { type: "string" },
                minItems: 5,
                maxItems: 5,
                description:
                  "Exactly 5 chapter names in English, one per section",
              },
              hn: {
                type: "array",
                items: { type: "string" },
                minItems: 5,
                maxItems: 5,
                description:
                  "Exactly 5 chapter names in Hindi, matching the English chapter names. Use natural, conversational Hindi.",
              },
            },
            required: ["en", "hn"],
            description:
              "Chapter titles for the 5 question sections in both English and Hindi",
          },
          questionSetPremise: {
            type: "object",
            properties: {
              en: {
                type: "array",
                items: { type: "string" },
                minItems: 5,
                maxItems: 5,
                description:
                  "Exactly 5 premises in English, one per question set, describing the theme/purpose of each section",
              },
              hn: {
                type: "array",
                items: { type: "string" },
                minItems: 5,
                maxItems: 5,
                description:
                  "Exactly 5 premises in Hindi, matching the English premises",
              },
            },
            required: ["en", "hn"],
            description:
              "Premises explaining the theme/purpose of each question set section",
          },
        },
        required: [
          "title",
          "description",
          "questions",
          "questionsHn",
          "questionSetTitles",
          "questionSetPremise",
        ],
      };

      const customQuestionsText =
        questions
          ?.filter((q: { text?: string }) => q?.text?.trim())
          .map((q: { text: string }) => q.text)
          .join("\n- ") || "None";

      const prompt = `Generate a Kahani album (audio story collection) for the following request.

Recipient: ${recipientName}
Occasion/Theme: ${occasion}
Sender name: ${yourName}
${instructions ? `Special instructions: ${instructions}` : ""}
${customQuestionsText !== "None" ? `Custom questions to incorporate or inspire from:\n- ${customQuestionsText}` : ""}
${title ? `Preferred title (use or adapt): ${title}` : ""}
${language ? `Preferred language: ${language}` : ""}

Return a JSON object with:
- title: A warm, personalized album title
- description: 2-3 sentences describing what this album captures
- questions: Exactly 15 thoughtful, open-ended prompts in English suitable for voice recording (stories, memories, wisdom), organized in 5 sections of 3 questions each
- questionsHn: Exactly 15 Hindi translations of the questions, matching the exact order of the English questions. Use natural, conversational Hindi suitable for voice recording.
- questionSetTitles: { en: [exactly 5 chapter names in English], hn: [exactly 5 chapter names in Hindi] } - one name per section (e.g. en: "Childhood Memories", hn: "बचपन की यादें"). The Hindi titles should be natural, conversational Hindi translations of the English titles.
- questionSetPremise: { en: [exactly 5 premises], hn: [exactly 5 premises] } - Each premise is a brief description (1-2 sentences) explaining the theme/purpose of each question set section. The Hindi premises should be natural translations of the English ones. These premises help guide the conversation flow in WhatsApp.`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
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

      res.json(validated.data);
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
      const { yourName, phone, recipientName, occasion } = formData;
      if (!yourName || !phone || !recipientName || !occasion) {
        return res.status(400).json({
          error:
            "Missing required formData: yourName, phone, recipientName, occasion",
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
        yourName,
        recipientName,
        occasion,
        language: formData.language || "en",
        instructions: formData.instructions || "",
        email: formData.email || "",
        phone,
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

  const httpServer = createServer(app);
  return httpServer;
}
