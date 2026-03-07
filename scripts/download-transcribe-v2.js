import "dotenv/config";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import fetch from "node-fetch";
import speech from "@google-cloud/speech";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// cmd- node scripts/download-transcribe-v2.js 7d4f4d64-c1bd-46ab-874c-0103d9370c2d ./my-transcripts sarthakseth021@gmail.com
//
// Auth: GOOGLE_APPLICATION_CREDENTIALS_JSON_B64 in .env (base64 of service account JSON),
//       or GOOGLE_APPLICATION_CREDENTIALS = path to key file.
//
// Uses Google Cloud Speech-to-Text V2 API with the chirp_3 model.
// Chirp 3 provides better multilingual accuracy, auto language detection,
// and auto audio decoding (no need to specify encoding/sample rate).
//
// Audio is downloaded from R2 into memory (STT v2 only accepts GCS URIs for
// the uri field, so we must fetch from R2 and send as inline content).
// Short audio (≤ 60s) → recognize();  longer → streamingRecognize().

let gcpProjectId;

(function applyCredentialsFromEnv() {
  const b64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_B64;
  if (!b64) return;
  const raw = Buffer.from(b64, "base64").toString("utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      "Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON_B64: " + e.message,
    );
  }
  gcpProjectId = parsed.project_id;
  const tmpPath = path.join(os.tmpdir(), `gcp-sa-${process.pid}.json`);
  fs.writeFileSync(tmpPath, raw, "utf8");
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
})();

function getGcpProjectId() {
  if (gcpProjectId) return gcpProjectId;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && fs.existsSync(credPath)) {
    return JSON.parse(fs.readFileSync(credPath, "utf8")).project_id;
  }
  const fromEnv =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
  if (fromEnv) return fromEnv;
  throw new Error(
    "Cannot determine GCP project ID. Set GOOGLE_APPLICATION_CREDENTIALS_JSON_B64, " +
      "GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_CLOUD_PROJECT.",
  );
}

const GCP_REGION = "us";
const speechClient = new speech.v2.SpeechClient({
  apiEndpoint: `${GCP_REGION}-speech.googleapis.com`,
});

const SUPABASE_URL = process.env.SUPABASE_URL_REAL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_REAL;

const TRANSCRIPT_SEPARATOR = "\n\n---\n\n";
const CONCURRENCY = 5;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (e.g. in .env)",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ── Language helpers ──────────────────────────────────────────────────
// Chirp 3 uses a language_codes array and supports "auto" for auto-detection.

const LANGUAGE_MAP = {
  en: ["en-IN"],
  hn: ["hi-IN"],
  other: ["hi-IN", "en-IN"],
};

/**
 * @typedef {{ languageCodes: string[], transcribeBothHindiAndEnglish?: boolean }} LanguageConfig
 */

/**
 * Fetch language preference for a trial from free_trials table.
 * Maps preference → chirp_3 language_codes array.
 * @param {string} trialId
 * @returns {Promise<LanguageConfig>}
 */
async function getTrialLanguagePreference(trialId) {
  console.log("Fetching trial language preference from Supabase...");
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("free_trials")
    .select("storyteller_language_preference")
    .eq("id", trialId)
    .single();

  if (error) {
    const isMissingColumn = /column .* does not exist/i.test(error.message);
    if (isMissingColumn) {
      console.log("  No language preference in DB; using chirp_3 auto-detect.");
      return { languageCodes: ["hi-IN", "en-IN"] };
    }
    throw new Error(`Failed to fetch trial: ${error.message}`);
  }
  if (!data) {
    throw new Error(`Trial not found: ${trialId}`);
  }

  const pref = data.storyteller_language_preference || "other";
  console.log(
    `  Trial language preference: ${pref} → always transcribing both en-IN and hi-IN`,
  );
  return { languageCodes: ["hi-IN", "en-IN"], transcribeBothHindiAndEnglish: true };
}

// ── Supabase fetchers (same as v1) ──────────────────────────────────

async function getVoiceNotesByTrialId(trialId) {
  console.log("Fetching voice notes from Supabase...");
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("voice_notes")
    .select("question_index, question_text, media_url")
    .eq("free_trial_id", trialId)
    .order("question_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch voice notes: ${error.message}`);
  }
  if (!data?.length) {
    throw new Error(`No voice notes found for trial: ${trialId}`);
  }

  const notes = data.map((row) => ({
    questionIndex: row.question_index,
    questionText: row.question_text ?? "",
    mediaUrl: row.media_url,
  }));
  console.log(`  Found ${notes.length} voice note(s)`);
  return notes;
}

async function getTrialAndAlbum(trialId) {
  const supabase = getSupabase();
  const { data: trialRow, error: trialError } = await supabase
    .from("free_trials")
    .select(
      "buyer_name, storyteller_name, customer_phone, storyteller_phone, album_id, storyteller_language_preference",
    )
    .eq("id", trialId)
    .single();

  if (trialError || !trialRow) {
    throw new Error(
      `Failed to fetch trial: ${trialError?.message ?? "not found"}`,
    );
  }

  const { data: albumRow, error: albumError } = await supabase
    .from("albums")
    .select("title, questions, questions_hn, question_set_titles")
    .eq("id", trialRow.album_id)
    .single();

  if (albumError || !albumRow) {
    throw new Error(
      `Failed to fetch album: ${albumError?.message ?? "not found"}`,
    );
  }

  return {
    trial: {
      buyer_name: trialRow.buyer_name ?? "",
      storyteller_name: trialRow.storyteller_name ?? "",
      customer_phone: trialRow.customer_phone ?? "",
      storyteller_phone: trialRow.storyteller_phone ?? "",
      album_id: trialRow.album_id,
      storyteller_language_preference:
        trialRow.storyteller_language_preference ?? "en",
    },
    album: {
      title: albumRow.title ?? "",
      questions: albumRow.questions ?? [],
      questions_hn: albumRow.questions_hn ?? [],
      question_set_titles: albumRow.question_set_titles ?? { en: [], hn: [] },
    },
  };
}

// ── Email ─────────────────────────────────────────────────────────────

const KAHANI_PLAYLIST_BASE = "https://kahani.xyz/playlist-albums";

async function sendTranscriptEmail({ to, trialId, trial, album, mergedPath }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) {
    console.warn(
      "Skipping email: set RESEND_API_KEY and TRANSCRIPT_EMAIL_TO (or pass email as 4th arg) to send transcript email.",
    );
    return false;
  }

  const pref = trial.storyteller_language_preference || "en";
  const questionsEn = Array.isArray(album.questions) ? album.questions : [];
  const questionsHn = Array.isArray(album.questions_hn)
    ? album.questions_hn
    : [];
  const setTitlesEn = album.question_set_titles?.en ?? [];
  const setTitlesHn = album.question_set_titles?.hn ?? [];
  const titlesEnList = Array.isArray(setTitlesEn) ? setTitlesEn : [];
  const titlesHnList = Array.isArray(setTitlesHn) ? setTitlesHn : [];

  const bodyParts = [
    `Storyteller Name: ${trial.storyteller_name}`,
    `Storyteller Phone: ${trial.storyteller_phone || "(none)"}`,
    `Buyer Name: ${trial.buyer_name}`,
    `Buyer Phone: ${trial.customer_phone}`,
    `Album Name: ${album.title}`,
    `Language Preference: ${pref}`,
    "\n\n",
    "Questions (English):",
    ...questionsEn.map((q, i) => `  ${i + 1}. ${q}`),
    "\n\n",
    "Questions (Hindi):",
    ...questionsHn.map((q, i) => `  ${i + 1}. ${q}`),
    "\n\n",
    "Question set titles (English):",
    ...titlesEnList.map((t, i) => `  ${i + 1}. ${t}`),
    "\n\n",
    "Question set titles (Hindi):",
    ...titlesHnList.map((t, i) => `  ${i + 1}. ${t}`),
  ];

  const body = [
    ...bodyParts,
    "\n\n ",
    `Link: ${KAHANI_PLAYLIST_BASE}/${trialId}`,
    "\n\n ",
    mergedPath && fs.existsSync(mergedPath)
      ? `The full transcript is attached as transcript_${trialId}.txt.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const attachments = [];
  if (mergedPath && fs.existsSync(mergedPath)) {
    const content = fs.readFileSync(mergedPath, "utf8");
    attachments.push({
      filename: `transcript_${trialId}.txt`,
      content: Buffer.from(content, "utf8"),
    });
  }

  try {
    const resend = new Resend(apiKey);
    const payload = {
      from: "Kahani Alerts <onboarding@resend.dev>",
      to: [to],
      subject: `AI Generated Transcripts for trialId: ${trialId}`,
      text: body,
    };
    if (attachments.length > 0) {
      payload.attachments = attachments;
    }
    const { data, error } = await resend.emails.send(payload);
    if (error) {
      console.error("Resend error:", error.message, error);
      return false;
    }
    console.log(
      "Transcript email sent to",
      to,
      data?.id ? `(id: ${data.id})` : "",
    );
    return true;
  } catch (err) {
    console.error("Failed to send transcript email:", err.message, err);
    return false;
  }
}

// ── Transcription (STT V2 + chirp_3) ─────────────────────────────────

/**
 * Download audio from a URL into a Buffer (no temp file needed).
 * @param {string} url
 * @param {string} [logPrefix]
 * @returns {Promise<Buffer>}
 */
async function downloadAudioBuffer(url, logPrefix = "") {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(
    `${logPrefix} Downloaded ${(buffer.byteLength / 1024).toFixed(1)} KB`,
  );
  return buffer;
}

const PCM_SAMPLE_RATE = 16000;
const PCM_BYTES_PER_SAMPLE = 2;
const CHUNK_SECONDS = 50;
const CHUNK_BYTE_SIZE = CHUNK_SECONDS * PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE;

/**
 * Convert audio buffer (any format ffmpeg supports) to raw LINEAR16 PCM.
 * @param {Buffer} audioBuffer
 * @returns {Promise<Buffer>} - Raw PCM s16le mono 16kHz
 */
function convertToLinear16(audioBuffer) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const proc = spawn(
      "ffmpeg",
      [
        "-i",
        "pipe:0",
        "-f",
        "s16le",
        "-acodec",
        "pcm_s16le",
        "-ar",
        String(PCM_SAMPLE_RATE),
        "-ac",
        "1",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    proc.stdout.on("data", (chunk) => chunks.push(chunk));
    proc.stderr.on("data", () => {});
    proc.on("error", (err) =>
      reject(new Error(`ffmpeg not found: ${err.message}`)),
    );
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`ffmpeg exited with code ${code}`));
      else resolve(Buffer.concat(chunks));
    });

    proc.stdin.write(audioBuffer);
    proc.stdin.end();
  });
}

/**
 * Recognize a single PCM chunk (must be ≤ 60s) via synchronous recognize().
 */
async function recognizePcmChunk(pcmChunk, languageCodes, recognizer) {
  const [response] = await speechClient.recognize({
    recognizer,
    config: {
      explicitDecodingConfig: {
        encoding: "LINEAR16",
        sampleRateHertz: PCM_SAMPLE_RATE,
        audioChannelCount: 1,
      },
      languageCodes,
      model: "chirp_3",
    },
    content: pcmChunk,
  });

  if (!response?.results?.length) return "";
  return response.results
    .map((r) => r.alternatives?.[0]?.transcript)
    .filter(Boolean)
    .join("\n");
}

/**
 * Transcribe audio using Google STT V2 with chirp_3.
 * For audio ≤ 60s: single recognize() call with autoDecodingConfig.
 * For audio > 60s: convert to PCM via ffmpeg, split into 50s chunks,
 *   call recognize() on each chunk, concatenate results.
 *
 * @param {Buffer} audioBuffer - Raw audio bytes (MP3 or any format)
 * @param {string[]} languageCodes - e.g. ["en-IN"], ["hi-IN"], or ["auto"]
 * @param {string} [logPrefix]
 * @returns {Promise<string>}
 */
async function transcribeAudio(audioBuffer, languageCodes, logPrefix = "") {
  const projectId = getGcpProjectId();
  const recognizer = `projects/${projectId}/locations/${GCP_REGION}/recognizers/_`;

  const config = {
    autoDecodingConfig: {},
    languageCodes,
    model: "chirp_3",
  };

  try {
    const [response] = await speechClient.recognize({
      recognizer,
      config,
      content: audioBuffer,
    });

    if (!response?.results?.length) {
      console.log(`${logPrefix} No speech detected in audio`);
      return "";
    }

    const transcript = response.results
      .map((r) => r.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join("\n");
    console.log(`${logPrefix} Transcribed ${transcript.length} character(s)`);
    return transcript;
  } catch (err) {
    if (
      /maximum.*(?:60|seconds)|too long|duration|exceeded/i.test(err.message)
    ) {
      console.log(`${logPrefix} Audio > 60s, splitting into chunks...`);
      return transcribeAudioChunked(
        audioBuffer,
        languageCodes,
        recognizer,
        logPrefix,
      );
    }
    throw err;
  }
}

/**
 * Fallback for audio > 60s: convert to PCM, split into 50s chunks,
 * recognize each chunk via synchronous API, and concatenate.
 */
async function transcribeAudioChunked(
  audioBuffer,
  languageCodes,
  recognizer,
  logPrefix = "",
) {
  const pcmBuffer = await convertToLinear16(audioBuffer);
  const totalSeconds =
    pcmBuffer.byteLength / (PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE);
  const numChunks = Math.ceil(pcmBuffer.byteLength / CHUNK_BYTE_SIZE);
  console.log(
    `${logPrefix} PCM: ${totalSeconds.toFixed(1)}s → ${numChunks} chunk(s) of ≤${CHUNK_SECONDS}s`,
  );

  const transcripts = [];
  for (let i = 0; i < numChunks; i++) {
    const start = i * CHUNK_BYTE_SIZE;
    const end = Math.min(start + CHUNK_BYTE_SIZE, pcmBuffer.byteLength);
    const chunk = pcmBuffer.slice(start, end);
    const chunkSec = (
      (end - start) /
      (PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE)
    ).toFixed(1);
    console.log(`${logPrefix}   chunk ${i + 1}/${numChunks} (${chunkSec}s)...`);
    const text = await recognizePcmChunk(chunk, languageCodes, recognizer);
    if (text) transcripts.push(text);
  }

  const transcript = transcripts.join("\n");
  console.log(
    `${logPrefix} Chunked transcription: ${transcript.length} character(s)`,
  );
  return transcript;
}

// ── File I/O helpers ──────────────────────────────────────────────────

const BILINGUAL_EN_LABEL = "English:";
const BILINGUAL_HI_LABEL = "Hindi (हिंदी):";
const QUESTION_EN_LABEL = "Question (English):";
const QUESTION_HN_LABEL = "Question (Hindi):";

function writeTranscriptFile(
  filePath,
  questionText,
  transcript,
  transcriptHindi,
  questionTextHindi,
) {
  let questionPart = (questionText || "").trim();
  if (questionTextHindi !== undefined && transcriptHindi != null) {
    const enQ = (questionText || "").trim() || "(none)";
    const hnQ = (questionTextHindi || "").trim() || "(none)";
    questionPart = [
      `${QUESTION_EN_LABEL}\n${enQ}`,
      `${QUESTION_HN_LABEL}\n${hnQ}`,
    ].join("\n\n");
  }

  let transcriptPart;
  if (transcriptHindi != null && String(transcriptHindi).trim() !== "") {
    const enPart = (transcript || "").trim() || "(no speech detected)";
    const hiPart = (transcriptHindi || "").trim() || "(no speech detected)";
    transcriptPart = [
      `${BILINGUAL_EN_LABEL}\n${enPart}`,
      `${BILINGUAL_HI_LABEL}\n${hiPart}`,
    ].join("\n\n");
  } else {
    transcriptPart = (transcript || "").trim() || "(no speech detected)";
  }
  const content = [questionPart, transcriptPart].join(TRANSCRIPT_SEPARATOR);
  fs.writeFileSync(filePath, content, "utf8");
}

const MERGED_QUESTION_SEP = "\n\n--------------\n\n\n";

function mergeTranscripts(trialId, outDir, voiceNotes) {
  const parts = [];
  for (const note of voiceNotes) {
    const baseName = `${note.questionIndex}_${trialId}`;
    const txtPath = path.join(outDir, `${baseName}.txt`);
    if (!fs.existsSync(txtPath)) continue;
    const raw = fs.readFileSync(txtPath, "utf8");
    const sepIdx = raw.indexOf(TRANSCRIPT_SEPARATOR);
    const questionText =
      sepIdx === -1 ? raw.trim() : raw.slice(0, sepIdx).trim();
    const transcript =
      sepIdx === -1
        ? ""
        : raw.slice(sepIdx + TRANSCRIPT_SEPARATOR.length).trim();
    parts.push(
      `Question: ${note.questionIndex}\n${questionText}\n--\n${transcript}${MERGED_QUESTION_SEP}`,
    );
  }
  const mergedPath = path.join(outDir, `transcript_${trialId}.txt`);
  fs.writeFileSync(mergedPath, parts.join(""), "utf8");
  return mergedPath;
}

function deleteTranscriptTxtFiles(trialId, outDir, voiceNotes, mergedPath) {
  for (const note of voiceNotes) {
    const txtPath = path.join(outDir, `${note.questionIndex}_${trialId}.txt`);
    if (fs.existsSync(txtPath)) {
      try {
        fs.unlinkSync(txtPath);
        console.log(`Deleted ${path.basename(txtPath)}`);
      } catch (err) {
        console.warn(`Could not delete ${txtPath}:`, err.message);
      }
    }
  }
  if (fs.existsSync(mergedPath)) {
    try {
      fs.unlinkSync(mergedPath);
      console.log(`Deleted ${path.basename(mergedPath)}`);
    } catch (err) {
      console.warn(`Could not delete ${mergedPath}:`, err.message);
    }
  }
}

function ensureOutputDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created output directory: ${dirPath}`);
  }
}

// ── Concurrency helper ────────────────────────────────────────────────

async function runWithConcurrency(items, concurrency, fn) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      await fn(items[i], i);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
}

// ── Per-note processing ───────────────────────────────────────────────

async function processOneVoiceNote(
  note,
  languageConfig,
  album,
  outDir,
  trialId,
) {
  const { questionIndex, questionText, mediaUrl } = note;
  const prefix = () => `[Q${questionIndex}]`;

  const baseName = `${questionIndex}_${trialId}`;
  const txtPath = path.join(outDir, `${baseName}.txt`);

  const questionsEn = Array.isArray(album.questions) ? album.questions : [];
  const questionsHn = Array.isArray(album.questions_hn)
    ? album.questions_hn
    : [];
  const questionTextEn =
    questionsEn[questionIndex] ??
    questionsEn[questionIndex - 1] ??
    questionText;
  const questionTextHn =
    questionsHn[questionIndex] ?? questionsHn[questionIndex - 1] ?? "";

  console.log(`${prefix()} Downloading from R2...`);
  const audioBuffer = await downloadAudioBuffer(mediaUrl, prefix());

  let transcript = "";
  let transcriptHindi = undefined;

  if (languageConfig.transcribeBothHindiAndEnglish) {
    console.log(`${prefix()} Transcribing (en-IN) with chirp_3...`);
    transcript = await transcribeAudio(audioBuffer, ["en-IN"], prefix());
    console.log(`${prefix()} Transcribing (hi-IN) with chirp_3...`);
    transcriptHindi = await transcribeAudio(audioBuffer, ["hi-IN"], prefix());
  } else {
    const langLabel = languageConfig.languageCodes.join(", ");
    console.log(`${prefix()} Transcribing (${langLabel}) with chirp_3...`);
    transcript = await transcribeAudio(
      audioBuffer,
      languageConfig.languageCodes,
      prefix(),
    );
  }

  writeTranscriptFile(
    txtPath,
    questionTextEn,
    transcript,
    transcriptHindi,
    languageConfig.transcribeBothHindiAndEnglish ? questionTextHn : undefined,
  );
  console.log(`${prefix()} Wrote ${baseName}.txt`);
}

// ── Main pipeline ─────────────────────────────────────────────────────

async function run(trialId, outputDir, emailTo) {
  console.log("========================================");
  console.log("  Download & Transcribe V2 — chirp_3");
  console.log("========================================\n");

  const outDir = outputDir ?? path.join(process.cwd(), "output", trialId);
  ensureOutputDir(outDir);
  console.log(`Trial ID:  ${trialId}`);
  console.log(`Output:    ${outDir}`);
  console.log(
    `GCP:       project=${getGcpProjectId()}  region=${GCP_REGION}  model=chirp_3\n`,
  );

  console.log("--- Supabase ---");
  const languageConfig = await getTrialLanguagePreference(trialId);
  const voiceNotes = await getVoiceNotesByTrialId(trialId);
  const { trial, album } = await getTrialAndAlbum(trialId);
  console.log("");

  const total = voiceNotes.length;
  const toProcess = voiceNotes.filter((n) => n.mediaUrl);
  const skipped = total - toProcess.length;

  for (const note of voiceNotes) {
    if (!note.mediaUrl) {
      console.warn(`[Q${note.questionIndex}] skipped (no media_url)`);
    }
  }

  if (toProcess.length > 0) {
    console.log(
      `Processing ${toProcess.length} voice note(s) with concurrency ${CONCURRENCY}...\n`,
    );
    await runWithConcurrency(toProcess, CONCURRENCY, (note) =>
      processOneVoiceNote(note, languageConfig, album, outDir, trialId),
    );
  }

  const mergedPath = mergeTranscripts(trialId, outDir, voiceNotes);
  console.log(`Merged transcript: ${mergedPath}`);

  const recipient = emailTo || process.env.TRANSCRIPT_EMAIL_TO;
  let emailSent = false;
  if (recipient) {
    emailSent = await sendTranscriptEmail({
      to: recipient,
      trialId,
      trial,
      album,
      mergedPath,
    });
  } else {
    console.warn(
      "No email sent: set TRANSCRIPT_EMAIL_TO or pass email as 4th argument.",
    );
  }

  if (emailSent) {
    deleteTranscriptTxtFiles(trialId, outDir, voiceNotes, mergedPath);
  }

  console.log("========================================");
  console.log(
    `  Done. Processed: ${toProcess.length}, skipped: ${skipped}, total: ${total}`,
  );
  console.log(`  Output: ${outDir}`);
  console.log("========================================");
}

const trialId = process.argv[2];
if (!trialId) {
  console.error(
    "Usage: node scripts/download-transcribe-v2.js <trialId> [outputDir] [emailTo]",
  );
  console.error("  trialId   - UUID of the free trial");
  console.error("  outputDir - optional; default: ./output/<trialId>");
  console.error(
    "  emailTo   - optional; transcript summary email (default: TRANSCRIPT_EMAIL_TO)",
  );
  process.exit(1);
}
const outputDir = process.argv[3];
const emailTo = process.argv[4];

run(trialId, outputDir, emailTo).catch((err) => {
  console.error("\nFatal error:", err.message);
  if (
    /Could not load the default credentials|credentials|authentication/i.test(
      err.message,
    )
  ) {
    console.error(
      "\nGoogle Cloud Speech-to-Text V2 needs credentials. Use one of:",
    );
    console.error(
      "  1. Service account: set GOOGLE_APPLICATION_CREDENTIALS to the path of a JSON key file",
    );
    console.error(
      "     (Create key in GCP Console → IAM → Service Accounts → Keys.)",
    );
    console.error("  2. gcloud: run  gcloud auth application-default login");
  }
  process.exit(1);
});
