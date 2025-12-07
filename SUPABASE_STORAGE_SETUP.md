# Supabase Storage Setup Guide

This guide will help you set up Supabase Storage for voice note and album cover image file storage.

## What Was Implemented

✅ Voice notes are now automatically:

1. Downloaded from WhatsApp when received
2. Uploaded to Supabase Storage
3. Stored with permanent URLs (no expiration)
4. Saved in the database with Supabase URLs

✅ Album cover images are now automatically:

1. Downloaded from WhatsApp when received from buyers
2. Uploaded to Supabase Storage
3. Stored with permanent URLs (no expiration)
4. Saved in the database with Supabase URLs

## Setup Steps

### 1. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project (or create a new one if needed)
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (the secret key, not the anon key)

### 2. Create the Storage Buckets

You need to create **two buckets**:

#### Bucket 1: Voice Notes

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. Click **New bucket**
3. Configure the bucket:
   - **Name:** `voice-notes` (must match exactly)
   - **Public bucket:** ✅ **Enable this** (so files can be accessed via public URLs)
   - **File size limit:** Set appropriate limit (e.g., 10MB for voice notes)
   - **Allowed MIME types:** Leave empty or add: `audio/ogg`, `audio/mp3`, `audio/m4a`
4. Click **Create bucket**

#### Bucket 2: Album Cover Images

**Note:** This bucket will be created automatically when the first image is uploaded. However, you can also create it manually:

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. Click **New bucket**
3. Configure the bucket:
   - **Name:** `album-cover-images-user` (must match exactly)
   - **Public bucket:** ✅ **Enable this** (so files can be accessed via public URLs)
   - **File size limit:** Set appropriate limit (e.g., 5MB for images)
   - **Allowed MIME types:** Leave empty or add: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
4. Click **Create bucket**

**Alternatively:** The bucket will be automatically created on the first image upload attempt if it doesn't exist.

### 3. Set Up Environment Variables

Add these to your `.env` file or environment variables:

```bash
# Supabase Storage Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Important:**

- Never commit the Service Role Key to version control
- The Service Role Key has admin privileges - keep it secret
- Use environment variables or secrets management in your deployment platform

### 4. Verify the Setup

After setting up:

1. **Check logs:** When a voice note is received, you should see:

   ```
   Voice note downloaded and uploaded to Supabase: {
     voiceNoteId: '...',
     mediaId: '...',
     supabaseUrl: 'https://xxxxx.supabase.co/storage/v1/object/public/voice-notes/...',
     sizeBytes: ...
   }
   ```

   When an image is received, you should see:

   ```
   Creating bucket album-cover-images-user...
   ✓ Bucket album-cover-images-user created successfully
   Image uploaded to Supabase Storage: {
     fileName: '...',
     publicUrl: 'https://xxxxx.supabase.co/storage/v1/object/public/album-cover-images-user/...'
   }
   ```

2. **Check Supabase Storage:**
   - Go to Storage → voice-notes bucket
   - You should see uploaded files with names like `{voiceNoteId}.ogg`
   - Go to Storage → album-cover-images-user bucket
   - You should see uploaded files with names like `{trialId}.jpg`

3. **Check Database:**
   - The `voice_notes` table should have `mediaUrl` pointing to Supabase URLs
   - The `localFilePath` field should contain the file path
   - The `free_trials` table should have `customCoverImageUrl` pointing to Supabase URLs

## How It Works

### Flow Diagram

```
WhatsApp Voice Note Received
    ↓
Webhook → handleVoiceNote()
    ↓
Save metadata to database (status: "pending")
    ↓
downloadAndStoreVoiceNote() [async]
    ↓
1. Get media URL from WhatsApp API
    ↓
2. Download file from WhatsApp (temporary URL)
    ↓
3. Upload file to Supabase Storage
    ↓
4. Get public URL from Supabase
    ↓
5. Update database with Supabase URL (status: "completed")
```

### File Naming

**Voice Notes:**
- Format: `{voiceNoteId}.{extension}`
- Example: `550e8400-e29b-41d4-a716-446655440000.ogg`
- Extension is determined from MIME type (ogg, mp3, or m4a)

**Album Cover Images:**
- Format: `{trialId}.{extension}`
- Example: `ba7897b5-419c-4842-9040-8f50d7f37fc4.jpg`
- Extension is determined from MIME type (jpg, png, gif, or webp)

### Public URLs

Voice notes are accessible via public URLs like:

```
https://{project-ref}.supabase.co/storage/v1/object/public/voice-notes/{voiceNoteId}.ogg
```

Album cover images are accessible via public URLs like:

```
https://{project-ref}.supabase.co/storage/v1/object/public/album-cover-images-user/{trialId}.jpg
```

These URLs are:

- ✅ Permanent (don't expire)
- ✅ Publicly accessible (no authentication needed)
- ✅ CDN-backed (fast delivery)
- ✅ Directly usable in HTML (`<audio>` tags for voice notes, `<img>` tags for images)

## Troubleshooting

### Error: "Supabase client not initialized"

**Cause:** Missing environment variables

**Solution:**

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check that they're loaded in your environment (restart server if needed)

### Error: "Bucket not found" or "Permission denied"

**Cause:** Bucket doesn't exist or wrong permissions

**Solution:**

1. Verify bucket names are exactly:
   - `voice-notes` for voice notes
   - `album-cover-images-user` for album cover images
2. Ensure both buckets are set to **Public**
3. Check that Service Role Key has correct permissions

### Files not uploading

**Check:**

1. Server logs for error messages
2. Supabase Storage dashboard for files
3. Database `voice_notes` table - check `downloadStatus` field:
   - `pending` = still processing
   - `completed` = successfully uploaded
   - `failed` = upload failed (check logs)

### Files upload but URLs don't work

**Cause:** Bucket might not be public

**Solution:**

1. Go to Storage → voice-notes bucket (or album-cover-images-user bucket)
2. Click **Settings** (gear icon)
3. Ensure **Public bucket** is enabled for both buckets

## Testing

To test the voice note implementation:

1. Send a voice note via WhatsApp to your business number
2. Check server logs for upload confirmation
3. Verify file appears in Supabase Storage → voice-notes bucket
4. Check database `voice_notes` table for Supabase URL
5. Try accessing the URL directly in a browser (should download/play audio)

To test the image upload implementation:

1. Send an image via WhatsApp to your business number (as a buyer)
2. Check server logs for upload confirmation (bucket will be created automatically if it doesn't exist)
3. Verify file appears in Supabase Storage → album-cover-images-user bucket
4. Check database `free_trials` table for `customCoverImageUrl`
5. Try accessing the URL directly in a browser (should display the image)

## Cost Considerations

Supabase Free Tier includes:

- 1 GB storage
- 2 GB bandwidth/month

For production:

- Monitor storage usage in Supabase Dashboard
- Consider upgrading if you exceed free tier limits
- Voice notes are typically 30-60 seconds, ~100-500KB each

## Security Notes

1. **Service Role Key:**
   - Only use on server-side
   - Never expose in client code
   - Rotate if compromised

2. **Public Bucket:**
   - Files are publicly accessible via URL
   - URLs are hard to guess (UUID-based)
   - Consider adding authentication layer if needed

3. **File Validation:**
   - Currently accepts any audio MIME type
   - Consider adding file size limits
   - Could add virus scanning in future

## Next Steps (Optional Enhancements)

- [ ] Add file size validation before upload
- [ ] Implement retry logic for failed uploads
- [ ] Add cleanup job for old voice notes
- [ ] Add authentication for file access
- [ ] Implement file compression
- [ ] Add CDN caching headers
