import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import speech from "@google-cloud/speech";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// cmd- node scripts/download-transcribe.js 302be10b-0f18-44ba-9d67-60de7c5e4488 ./my-transcripts sarthakseth021@gmail.com

// Use v1p1beta1 for MP3 support (MP3 encoding is beta and only in v1p1beta1).
const speechClient = new speech.v1p1beta1.SpeechClient();

const SUPABASE_URL = process.env.SUPABASE_URL_REAL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_REAL;

const TRANSCRIPT_SEPARATOR = "\n\n---\n\n";

/** Max number of voice notes to process at once (download + transcribe). */
const CONCURRENCY = 5;

/**
 * Get Supabase client. Throws if env vars are missing.
 */
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (e.g. in .env)",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

const LANGUAGE_MAP = {
  en: "en-IN",
  hn: "hi-IN",
  other: "en-IN",
};
const DEFAULT_LANGUAGE_CODE = "en-IN";

/** Languages to try when auto-detecting (en + Hindi for Kahani albums). */
const AUTO_DETECT_LANGUAGES = ["en-IN", "hi-IN"];

/**
 * @typedef {{ languageCode: string, alternativeLanguageCodes?: string[], transcribeBothHindiAndEnglish?: boolean }} LanguageConfig
 */

/**
 * Fetch language preference for a trial from free_trials table.
 * When no preference (column missing or "other"), returns config for auto-detect (en + hi).
 * @param {string} trialId - UUID of the trial
 * @returns {Promise<LanguageConfig>} - Config for Speech-to-Text (single language or auto-detect)
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
      console.log(
        "  No language preference in DB; using auto-detect (en-US + hi-IN).",
      );
      return {
        languageCode: AUTO_DETECT_LANGUAGES[0],
        alternativeLanguageCodes: AUTO_DETECT_LANGUAGES.slice(1),
      };
    }
    throw new Error(`Failed to fetch trial: ${error.message}`);
  }
  if (!data) {
    throw new Error(`Trial not found: ${trialId}`);
  }

  const pref = data.storyteller_language_preference || "other";
  const languageCode = LANGUAGE_MAP[pref] ?? DEFAULT_LANGUAGE_CODE;

  if (pref === "other" || !data.storyteller_language_preference) {
    console.log(
      "  Preference is 'other' or empty; using auto-detect (en-US + hi-IN).",
    );
    return {
      languageCode: AUTO_DETECT_LANGUAGES[0],
      alternativeLanguageCodes: AUTO_DETECT_LANGUAGES.slice(1),
    };
  }

  console.log(`  Trial language preference: ${pref} → ${languageCode}`);
  // For Hindi preference: transcribe each voice note in both Hindi and English.
  if (pref === "hn") {
    return { languageCode, transcribeBothHindiAndEnglish: true };
  }
  return { languageCode };
}

/**
 * Fetch all voice notes (URLs and question text) for a trial from Supabase.
 * @param {string} trialId - UUID of the trial
 * @returns {Promise<Array<{ questionIndex: number, questionText: string, mediaUrl: string }>>}
 */
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

/**
 * Fetch trial + album for email (trial metadata and album questions/titles).
 * @param {string} trialId - UUID of the trial
 * @returns {Promise<{ trial: { buyer_name, storyteller_name, customer_phone, storyteller_phone, album_id, storyteller_language_preference }, album: { title, questions, questions_hn, question_set_titles } }>}
 */
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

const KAHANI_PLAYLIST_BASE = "https://kahani.xyz/playlist-albums";

/**
 * Send transcript summary email via Resend, with merged transcript file attached.
 * Skips if RESEND_API_KEY or to is missing (logs once).
 * @param {{ to: string, trialId: string, trial: object, album: object, mergedPath?: string }} opts
 * @returns {Promise<boolean>} - true if email was sent successfully
 */
async function sendTranscriptEmail({ to, trialId, trial, album, mergedPath }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) {
    console.warn(
      "Skipping email: set RESEND_API_KEY and TRANSCRIPT_EMAIL_TO (or pass email as 4th arg) to send transcript email.",
    );
    return false;
  }

  const pref = trial.storyteller_language_preference || "en";
  const isHn = pref === "hn";
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
  ];

  if (isHn) {
    bodyParts.push(
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
    );
  } else {
    bodyParts.push(
      "Questions:",
      ...questionsEn.map((q, i) => `  ${i + 1}. ${q}`),
      "\n\n",
      "Question set titles:",
      ...titlesEnList.map((t, i) => `  ${i + 1}. ${t}`),
    );
  }

  const body = [
    ...bodyParts,
    "\n\n ",
    `Link: ${KAHANI_PLAYLIST_BASE}/${trialId}`,
    "\n\n ",
    mergedPath && fs.existsSync(mergedPath)
      ? "The full transcript is attached as transcript_{trialId}.txt.".replace(
          "{trialId}",
          trialId,
        )
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
      subject: `Transcripts for trialId: ${trialId}`,
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

/**
 * Download audio from URL to a local file.
 * @param {string} url - Public URL of the audio file
 * @param {string} filePath - Local path to save the file
 * @param {string} [logPrefix] - Optional prefix for log line (e.g. "[Q0]")
 */
async function downloadAudio(url, filePath, logPrefix = "") {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  const bytes = buffer.byteLength;
  fs.writeFileSync(filePath, Buffer.from(buffer));
  console.log(
    `${logPrefix} Downloaded ${(bytes / 1024).toFixed(1)} KB → ${path.basename(filePath)}`,
  );
}

/**
 * Transcribe an MP3 file using Google Cloud Speech-to-Text.
 * Supports single language or auto-detect via alternativeLanguageCodes (en + hi).
 * @param {string} filePath - Path to the MP3 file
 * @param {LanguageConfig} languageConfig - { languageCode, alternativeLanguageCodes? }
 * @param {string} [logPrefix] - Optional prefix for log lines (e.g. "[Q0]")
 * @returns {Promise<string>} - Transcript text
 */
// Must match server convertToMp3 (VOICE_NOTE_MP3_SAMPLE_RATE_HZ in conversationHandler.ts).
const SAMPLE_RATE_HZ = 16000;

async function transcribeMp3(filePath, languageConfig, logPrefix = "") {
  const audioBytes = fs.readFileSync(filePath).toString("base64");

  const config = {
    encoding: "MP3",
    sampleRateHertz: SAMPLE_RATE_HZ,
    languageCode: languageConfig.languageCode,
    enableAutomaticPunctuation: true,
  };
  if (languageConfig.alternativeLanguageCodes?.length) {
    config.alternativeLanguageCodes = languageConfig.alternativeLanguageCodes;
  }

  const [response] = await speechClient.recognize({
    audio: { content: audioBytes },
    config,
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
}

const BILINGUAL_EN_LABEL = "English:";
const BILINGUAL_HI_LABEL = "Hindi (हिंदी):";
const QUESTION_EN_LABEL = "Question (English):";
const QUESTION_HN_LABEL = "Question (Hindi):";

/**
 * Write a transcript file: question text, separator, then transcript(s).
 * When transcriptHindi is provided (Hindi preference), writes both English and Hindi.
 * When questionTextHindi is provided (Hindi preference), question header shows both English and Hindi.
 * @param {string} filePath - Path for the .txt file
 * @param {string} questionText - Question text (English) from the album
 * @param {string} transcript - Transcribed audio text (English)
 * @param {string} [transcriptHindi] - Optional Hindi transcript (when preferred language is Hindi)
 * @param {string} [questionTextHindi] - Optional Hindi question text (when preferred language is Hindi)
 */
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

/**
 * Merge all per-question transcript files into one transcript_{trialId}.txt.
 * Only includes indices for which a .txt file exists (i.e. were transcribed).
 * @param {string} trialId - UUID of the trial
 * @param {string} outDir - Output directory
 * @param {Array<{ questionIndex: number, questionText: string, mediaUrl: string | null }>} voiceNotes - Voice notes (ordered by questionIndex)
 * @returns {string} - Path to the merged file
 */
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

/**
 * Delete all transcript txt files (per-question and merged) after successful email.
 * @param {string} trialId - UUID of the trial
 * @param {string} outDir - Output directory
 * @param {Array<{ questionIndex: number }>} voiceNotes - Voice notes (to find per-question files)
 * @param {string} mergedPath - Path to transcript_{trialId}.txt
 */
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

/**
 * Ensure a directory exists; create it if not.
 * @param {string} dirPath
 */
function ensureOutputDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created output directory: ${dirPath}`);
  }
}

/**
 * Run async tasks with limited concurrency.
 * @param {Array<T>} items - Items to process
 * @param {number} concurrency - Max number of tasks in flight
 * @param {(item: T, index: number) => Promise<void>} fn - Async function per item
 */
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

/**
 * Process a single voice note: download, transcribe, write txt, delete mp3.
 * When preferred language is Hindi, transcribes in both English and Hindi and uses both en/hn questions.
 * Logs are prefixed with [Q{questionIndex}] for parallel runs.
 */
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
  const mp3Path = path.join(outDir, `${baseName}.mp3`);
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

  console.log(`${prefix()} Downloading...`);
  await downloadAudio(mediaUrl, mp3Path, prefix());

  let transcript = "";
  let transcriptHindi = undefined;

  if (languageConfig.transcribeBothHindiAndEnglish) {
    console.log(`${prefix()} Transcribing (en-IN)...`);
    transcript = await transcribeMp3(
      mp3Path,
      { languageCode: "en-IN" },
      prefix(),
    );
    console.log(`${prefix()} Transcribing (hi-IN)...`);
    transcriptHindi = await transcribeMp3(
      mp3Path,
      { languageCode: "hi-IN" },
      prefix(),
    );
  } else {
    const langLabel = languageConfig.alternativeLanguageCodes?.length
      ? `auto-detect (${[languageConfig.languageCode, ...languageConfig.alternativeLanguageCodes].join(", ")})`
      : languageConfig.languageCode;
    console.log(`${prefix()} Transcribing (${langLabel})...`);
    transcript = await transcribeMp3(mp3Path, languageConfig, prefix());
  }

  writeTranscriptFile(
    txtPath,
    questionTextEn,
    transcript,
    transcriptHindi,
    languageConfig.transcribeBothHindiAndEnglish ? questionTextHn : undefined,
  );
  console.log(`${prefix()} Wrote ${baseName}.txt`);
  try {
    fs.unlinkSync(mp3Path);
    console.log(`${prefix()} Deleted ${baseName}.mp3`);
  } catch (unlinkErr) {
    console.warn(
      `${prefix()} Could not delete ${baseName}.mp3:`,
      unlinkErr.message,
    );
  }
}

/**
 * Main pipeline: fetch trial + voice notes from Supabase, download audio, transcribe, write txt files, merge, email.
 * @param {string} trialId - UUID of the trial
 * @param {string} [outputDir] - Directory for .mp3 and .txt files (default: ./output/{trialId})
 * @param {string} [emailTo] - Email recipient for transcript summary (default: TRANSCRIPT_EMAIL_TO)
 */
async function run(trialId, outputDir, emailTo) {
  console.log("========================================");
  console.log("  Download & Transcribe — Trial Voice Notes");
  console.log("========================================\n");

  const outDir = outputDir ?? path.join(process.cwd(), "output", trialId);
  ensureOutputDir(outDir);
  console.log(`Trial ID:  ${trialId}`);
  console.log(`Output:    ${outDir}\n`);

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
    "Usage: node scripts/download-transcribe.js <trialId> [outputDir] [emailTo]",
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
      "\nGoogle Cloud Speech-to-Text needs credentials. Use one of:",
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
