/**
 * Export free_trials from Supabase to CSV and upload to Slack.
 *
 * Run via GitHub Actions (daily at 9 AM UTC) or manually:
 *   npx tsx .github/scripts/export-free-trials.ts
 *
 * Required env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   SLACK_BOT_TOKEN, SLACK_CHANNEL_ID
 */

import { createClient } from "@supabase/supabase-js";
import { WebClient } from "@slack/web-api";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

function assertEnv(
  name: string,
  value: string | undefined,
): asserts value is string {
  if (!value?.trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "No data";
  }

  const columns = Object.keys(rows[0]!);
  const phoneColumns = ["customer_phone", "storyteller_phone", "phone"];
  const csvRows = [columns.join(",")];

  for (const row of rows) {
    const values = columns.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) {
        return "";
      }
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

  return csvRows.join("\n");
}

async function main() {
  assertEnv("SUPABASE_URL", SUPABASE_URL);
  assertEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
  assertEnv("SLACK_BOT_TOKEN", SLACK_BOT_TOKEN);
  assertEnv("SLACK_CHANNEL_ID", SLACK_CHANNEL_ID);

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from("free_trials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  const csv = rowsToCsv(rows ?? []);
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `free_trials_${dateStr}.csv`;
  const rowCount = rows?.length ?? 0;

  const slack = new WebClient(SLACK_BOT_TOKEN!);

  // Use files.uploadV2 (files.upload is deprecated)
  const { ok, error: uploadError } = await slack.files.uploadV2({
    content: csv,
    filename,
    channel_id: SLACK_CHANNEL_ID!,
    initial_comment: `Free trials export (${rowCount} rows) — ${dateStr}`,
  });

  if (!ok || uploadError) {
    throw new Error(`Slack upload failed: ${uploadError ?? "unknown"}`);
  }

  console.log(`Uploaded ${filename} to Slack (${rowCount} rows)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
