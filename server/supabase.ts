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
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: isPublic,
      fileSizeLimit: bucketName === VOICE_NOTES_BUCKET ? 10485760 : 5242880, // 10MB for voice notes, 5MB for images
      allowedMimeTypes:
        bucketName === VOICE_NOTES_BUCKET
          ? ["audio/ogg", "audio/mp3", "audio/m4a"]
          : ["image/jpeg", "image/png", "image/gif", "image/webp"],
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
