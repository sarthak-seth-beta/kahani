import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Get the project root directory (two levels up from this script)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");

// Load environment variables from project root BEFORE importing r2 module
// This is critical because r2.ts reads env vars at module load time
const envPath = resolve(projectRoot, ".env");
dotenv.config({ path: envPath });

// Debug: Check if R2 env vars are loaded
console.log("Environment check:");
console.log("  .env path:", envPath);
console.log(
  "  R2_ACCOUNT_ID:",
  process.env.R2_ACCOUNT_ID ? "✓ Set" : "✗ Missing",
);
console.log(
  "  R2_ACCESS_KEY_ID:",
  process.env.R2_ACCESS_KEY_ID ? "✓ Set" : "✗ Missing",
);
console.log(
  "  R2_SECRET_ACCESS_KEY:",
  process.env.R2_SECRET_ACCESS_KEY ? "✓ Set" : "✗ Missing",
);
console.log(
  "  R2_PUBLIC_BUCKET_BASE_URL:",
  process.env.R2_PUBLIC_BUCKET_BASE_URL || "Not set",
);

// Main upload function - wrapped in async IIFE to use dynamic import
(async () => {
  // Now import r2 module after env vars are loaded
  const { uploadVoiceNoteToR2 } = await import("../r2.js");

  const filePath = "/Users/sarthakseth/Downloads/bishal_test_audio.mp3";

  try {
    console.log("Reading file from:", filePath);

    // Read the file as a buffer
    const fileBuffer = readFileSync(filePath);
    console.log("File read successfully. Size:", fileBuffer.length, "bytes");

    // Generate a unique filename (or use a simple one)
    const fileName = `bishal_test_audio_${Date.now()}`;
    const mimeType = "audio/mp3";

    console.log("Uploading to R2...");
    console.log("Parameters:", {
      fileName,
      mimeType,
      fileSize: fileBuffer.length,
    });

    // Upload to R2
    const publicUrl = await uploadVoiceNoteToR2(fileBuffer, fileName, mimeType);

    if (publicUrl) {
      console.log("✅ Upload successful!");
      console.log("Public URL:", publicUrl);
      console.log("Script completed successfully");
      process.exit(0);
    } else {
      console.error("❌ Upload failed - returned null");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
})();
