import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Buckets – default to existing Supabase bucket names for smooth migration
export const R2_VOICE_NOTES_BUCKET =
  process.env.R2_VOICE_NOTES_BUCKET || "voice-notes";
export const R2_ALBUM_COVERS_BUCKET =
  process.env.R2_ALBUM_COVERS_BUCKET || "album-cover-images-user";

export const R2_WEBHOOK_AUDIO_BUCKET =
  process.env.R2_WEBHOOK_AUDIO_BUCKET || "webhook_audio";
export const R2_WEBHOOK_VIDEO_BUCKET =
  process.env.R2_WEBHOOK_VIDEO_BUCKET || "webhook_video";
export const R2_WEBHOOK_IMAGE_BUCKET =
  process.env.R2_WEBHOOK_IMAGE_BUCKET || "webhook_image";
export const R2_WEBHOOK_DOCUMENT_BUCKET =
  process.env.R2_WEBHOOK_DOCUMENT_BUCKET || "webhook_document";

const R2_VOICE_NOTE_PUBLIC_BUCKET_BASE_URL =
  process.env.R2_VOICE_NOTE_PUBLIC_BUCKET_BASE_URL || null;
const R2_ALBUM_COVERS_PUBLIC_BUCKET_BASE_URL =
  process.env.R2_ALBUM_COVERS_PUBLIC_BUCKET_BASE_URL || null;

let r2Client: S3Client | null = null;

function getR2Client(): S3Client | null {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error(
      "Cloudflare R2 is not fully configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
    return null;
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }

  return r2Client;
}

export function buildPublicUrl(key: string, contentType: string): string {
  if (contentType === "audio/mp3") {
    return `${R2_VOICE_NOTE_PUBLIC_BUCKET_BASE_URL}/${key}`;
  } else {
    return `${R2_ALBUM_COVERS_PUBLIC_BUCKET_BASE_URL}/${key}`;
  }
}

export async function uploadToR2(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string | null> {
  const client = getR2Client();
  if (!client) return null;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: "public-read", // allow public access via URL
      }),
    );

    const publicUrl = buildPublicUrl(key, contentType);
    console.log("Uploaded object to R2:", {
      bucket,
      key,
      publicUrl,
    });
    return publicUrl;
  } catch (error) {
    console.error("Error uploading object to R2:", {
      bucket,
      key,
      error,
    });
    return null;
  }
}

async function deleteFromR2(bucket: string, key: string): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    console.log("Deleted object from R2:", { bucket, key });
    return true;
  } catch (error) {
    console.error("Error deleting object from R2:", {
      bucket,
      key,
      error,
    });
    return false;
  }
}

/**
 * Upload a voice note file to Cloudflare R2.
 * All voice notes are already converted to MP3 by the caller.
 */
export async function uploadVoiceNoteToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string | null> {
  // Preserve previous naming convention: append .mp3
  const extension = "mp3";
  const finalMimeType = "audio/mp3";
  const fullFileName = `${fileName}.${extension}`;
  const key = fullFileName;

  return uploadToR2(R2_VOICE_NOTES_BUCKET, key, fileBuffer, finalMimeType);
}

/**
 * Upload an image file (album cover / custom cover) to Cloudflare R2.
 */
export async function uploadImageToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string | null> {
  // Mirror extension logic from Supabase helper
  const extension =
    mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? "jpg"
      : mimeType.includes("png")
        ? "png"
        : mimeType.includes("gif")
          ? "gif"
          : mimeType.includes("webp")
            ? "webp"
            : "jpg";

  const fullFileName = `${fileName}.${extension}`;
  const key = fullFileName;

  return uploadToR2(R2_ALBUM_COVERS_BUCKET, key, fileBuffer, mimeType);
}

/**
 * Upload webhook media (audio / video / image / document) to Cloudflare R2.
 * This mirrors the behavior of the previous Supabase-based helper.
 */
export async function uploadWebhookMediaToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  mediaType: "audio" | "video" | "image" | "document",
): Promise<string | null> {
  let bucketName: string;
  switch (mediaType) {
    case "audio":
      bucketName = R2_WEBHOOK_AUDIO_BUCKET;
      break;
    case "video":
      bucketName = R2_WEBHOOK_VIDEO_BUCKET;
      break;
    case "image":
      bucketName = R2_WEBHOOK_IMAGE_BUCKET;
      break;
    case "document":
      bucketName = R2_WEBHOOK_DOCUMENT_BUCKET;
      break;
    default:
      console.error(`Unknown media type for R2 upload: ${mediaType}`);
      return null;
  }

  // Determine file extension from mimeType (same mapping as Supabase helper)
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
  else if (mimeType.includes("powerpoint") || mimeType.includes("presentation"))
    extension = "pptx";
  else if (mimeType.includes("word") || mimeType.includes("document"))
    extension = "docx";
  else if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
    extension = "xlsx";

  const fullFileName = `${fileName}.${extension}`;
  const key = fullFileName;

  return uploadToR2(bucketName, key, fileBuffer, mimeType);
}

/**
 * Delete an album cover image from Cloudflare R2.
 * Used by admin album endpoints for cleanup and deletion.
 */
export async function deleteImageFromR2(fileName: string): Promise<boolean> {
  const key = fileName;
  return deleteFromR2(R2_ALBUM_COVERS_BUCKET, key);
}
