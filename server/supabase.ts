import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "Supabase Storage not configured. Voice notes will not be uploaded to Supabase.",
  );
}

export const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export const VOICE_NOTES_BUCKET = "voice-notes";
export const ALBUM_COVERS_BUCKET = "album-cover-images-user";

// Webhook media buckets
export const WEBHOOK_AUDIO_BUCKET = "webhook_audio";
export const WEBHOOK_VIDEO_BUCKET = "webhook_video";
export const WEBHOOK_IMAGE_BUCKET = "webhook_image";
export const WEBHOOK_DOCUMENT_BUCKET = "webhook_document";

/**
 * Create a storage bucket if it doesn't exist
 * @param bucketName - The name of the bucket to create
 * @param isPublic - Whether the bucket should be public
 * @returns true if bucket exists or was created successfully, false otherwise
 */
export async function ensureBucketExists(
  bucketName: string,
  isPublic: boolean = true,
): Promise<boolean> {
  if (!supabase) {
    console.error("Supabase client not initialized. Cannot create bucket.");
    return false;
  }

  try {
    // First, check if bucket already exists
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      return false;
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);

    if (bucketExists) {
      console.log(`Bucket ${bucketName} already exists`);
      return true;
    }

    // Create the bucket
    console.log(`Creating bucket ${bucketName}...`);

    // Determine file size limit and allowed MIME types based on bucket
    let fileSizeLimit = 5242880; // 5MB default
    let allowedMimeTypes: string[] = [];

    if (bucketName === VOICE_NOTES_BUCKET) {
      fileSizeLimit = 10485760; // 10MB for voice notes
      allowedMimeTypes = ["audio/ogg", "audio/mp3", "audio/m4a"];
    } else if (bucketName === ALBUM_COVERS_BUCKET) {
      fileSizeLimit = 5242880; // 5MB for images
      allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    } else if (bucketName === WEBHOOK_AUDIO_BUCKET) {
      fileSizeLimit = 10485760; // 10MB for audio
      allowedMimeTypes = [
        "audio/ogg",
        "audio/mp3",
        "audio/m4a",
        "audio/aac",
        "audio/amr",
      ];
    } else if (bucketName === WEBHOOK_VIDEO_BUCKET) {
      fileSizeLimit = 52428800; // 50MB for video
      allowedMimeTypes = ["video/mp4", "video/3gpp", "video/quicktime"];
    } else if (bucketName === WEBHOOK_IMAGE_BUCKET) {
      fileSizeLimit = 5242880; // 5MB for images
      allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    } else if (bucketName === WEBHOOK_DOCUMENT_BUCKET) {
      fileSizeLimit = 10485760; // 10MB for documents
      allowedMimeTypes = [
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/msword",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];
    }

    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: isPublic,
      fileSizeLimit,
      allowedMimeTypes:
        allowedMimeTypes.length > 0 ? allowedMimeTypes : undefined,
    });

    if (error) {
      console.error(`Error creating bucket ${bucketName}:`, error);
      return false;
    }

    console.log(`✓ Bucket ${bucketName} created successfully`);
    return true;
  } catch (error) {
    console.error(`Exception creating bucket ${bucketName}:`, error);
    return false;
  }
}

/**
 * Upload a voice note file to Supabase Storage
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The file name (should be unique, e.g., voiceNoteId.ogg)
 * @param mimeType - The MIME type of the file
 * @returns The public URL of the uploaded file, or null if upload fails
 */
export async function uploadVoiceNoteToStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string | null> {
  if (!supabase) {
    console.error("Supabase client not initialized. Cannot upload voice note.");
    return null;
  }

  try {
    // Determine file extension from mimeType
    const extension = mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("mp3")
        ? "mp3"
        : mimeType.includes("m4a")
          ? "m4a"
          : "ogg";

    const fullFileName = `${fileName}.${extension}`;
    const filePath = `${fullFileName}`;

    const { data, error } = await supabase.storage
      .from(VOICE_NOTES_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Error uploading voice note to Supabase Storage:", error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(VOICE_NOTES_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error("Failed to get public URL for uploaded voice note");
      return null;
    }

    console.log("Voice note uploaded to Supabase Storage:", {
      fileName: fullFileName,
      publicUrl: urlData.publicUrl,
    });

    return urlData.publicUrl;
  } catch (error) {
    console.error("Exception uploading voice note to Supabase Storage:", error);
    return null;
  }
}

/**
 * Upload an image file to Supabase Storage
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The file name (should be unique, e.g., trialId)
 * @param mimeType - The MIME type of the file
 * @returns The public URL of the uploaded file, or null if upload fails
 */
export async function uploadImageToStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string | null> {
  if (!supabase) {
    console.error("Supabase client not initialized. Cannot upload image.");
    return null;
  }

  // Ensure bucket exists before uploading
  const bucketExists = await ensureBucketExists(ALBUM_COVERS_BUCKET, true);
  if (!bucketExists) {
    console.error(
      `Bucket ${ALBUM_COVERS_BUCKET} does not exist and could not be created`,
    );
    return null;
  }

  try {
    // Determine file extension from mimeType
    const extension =
      mimeType.includes("jpeg") || mimeType.includes("jpg")
        ? "jpg"
        : mimeType.includes("png")
          ? "png"
          : mimeType.includes("gif")
            ? "gif"
            : mimeType.includes("webp")
              ? "webp"
              : "jpg"; // default

    const fullFileName = `${fileName}.${extension}`;
    const filePath = `${fullFileName}`;

    const { data, error } = await supabase.storage
      .from(ALBUM_COVERS_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true, // Allow overwriting if image already exists
      });

    if (error) {
      console.error("Error uploading image to Supabase Storage:", error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(ALBUM_COVERS_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error("Failed to get public URL for uploaded image");
      return null;
    }

    console.log("Image uploaded to Supabase Storage:", {
      fileName: fullFileName,
      publicUrl: urlData.publicUrl,
    });

    return urlData.publicUrl;
  } catch (error) {
    console.error("Exception uploading image to Supabase Storage:", error);
    return null;
  }
}

/**
 * Delete an image file from Supabase Storage
 * @param filePath - The file path/name in the bucket (e.g., "filename.jpg" or full URL)
 * @returns true if deletion was successful, false otherwise
 */
export async function deleteImageFromStorage(
  filePath: string,
): Promise<boolean> {
  if (!supabase) {
    console.error("Supabase client not initialized. Cannot delete image.");
    return false;
  }

  try {
    // Extract filename from full URL if provided
    let fileName = filePath;
    if (filePath.includes("/")) {
      // If it's a full URL, extract the filename
      const urlParts = filePath.split("/");
      fileName = urlParts[urlParts.length - 1];
    }

    const { error } = await supabase.storage
      .from(ALBUM_COVERS_BUCKET)
      .remove([fileName]);

    if (error) {
      console.error("Error deleting image from Supabase Storage:", error);
      return false;
    }

    console.log("Image deleted from Supabase Storage:", fileName);
    return true;
  } catch (error) {
    console.error("Exception deleting image from Supabase Storage:", error);
    return false;
  }
}

/**
 * Upload webhook media file to appropriate Supabase Storage bucket
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The file name (should be unique, e.g., mediaId)
 * @param mimeType - The MIME type of the file
 * @param mediaType - Type of media: 'audio', 'video', 'image', 'document'
 * @returns The public URL of the uploaded file, or null if upload fails
 */
export async function uploadWebhookMediaToStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  mediaType: "audio" | "video" | "image" | "document",
): Promise<string | null> {
  if (!supabase) {
    console.error(
      "Supabase client not initialized. Cannot upload webhook media.",
    );
    return null;
  }

  // Determine bucket based on media type
  let bucketName: string;
  switch (mediaType) {
    case "audio":
      bucketName = WEBHOOK_AUDIO_BUCKET;
      break;
    case "video":
      bucketName = WEBHOOK_VIDEO_BUCKET;
      break;
    case "image":
      bucketName = WEBHOOK_IMAGE_BUCKET;
      break;
    case "document":
      bucketName = WEBHOOK_DOCUMENT_BUCKET;
      break;
    default:
      console.error(`Unknown media type: ${mediaType}`);
      return null;
  }

  // Ensure bucket exists before uploading
  const bucketExists = await ensureBucketExists(bucketName, true);
  if (!bucketExists) {
    console.error(
      `Bucket ${bucketName} does not exist and could not be created`,
    );
    return null;
  }

  try {
    // Determine file extension from mimeType
    let extension = "bin"; // default
    if (mimeType.includes("ogg")) extension = "ogg";
    else if (mimeType.includes("mp3")) extension = "mp3";
    else if (mimeType.includes("m4a")) extension = "m4a";
    else if (mimeType.includes("aac")) extension = "aac";
    else if (mimeType.includes("amr")) extension = "amr";
    else if (mimeType.includes("mp4")) extension = "mp4";
    else if (mimeType.includes("3gpp")) extension = "3gp";
    else if (mimeType.includes("quicktime")) extension = "mov";
    else if (mimeType.includes("jpeg") || mimeType.includes("jpg"))
      extension = "jpg";
    else if (mimeType.includes("png")) extension = "png";
    else if (mimeType.includes("gif")) extension = "gif";
    else if (mimeType.includes("webp")) extension = "webp";
    else if (mimeType.includes("pdf")) extension = "pdf";
    else if (
      mimeType.includes("powerpoint") ||
      mimeType.includes("presentation")
    )
      extension = "pptx";
    else if (mimeType.includes("word") || mimeType.includes("document"))
      extension = "docx";
    else if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
      extension = "xlsx";

    const fullFileName = `${fileName}.${extension}`;
    const filePath = `${fullFileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error(`Error uploading webhook media to ${bucketName}:`, error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error(
        `Failed to get public URL for uploaded webhook media in ${bucketName}`,
      );
      return null;
    }

    console.log(`Webhook media uploaded to ${bucketName}:`, {
      fileName: fullFileName,
      publicUrl: urlData.publicUrl,
      mediaType,
    });

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Exception uploading webhook media to ${bucketName}:`, error);
    return null;
  }
}
