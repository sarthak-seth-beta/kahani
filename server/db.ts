import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

let databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Handle double-encoded URLs (common when copying from Supabase dashboard)
// If the URL starts with encoded characters, decode it once
if (databaseUrl.includes("%3A%2F%2F")) {
  try {
    databaseUrl = decodeURIComponent(databaseUrl);
  } catch (e) {
    // If decoding fails, URL is already in correct format
  }
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  // Connection pool settings to handle Supabase connection terminations
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
});

// Handle pool errors gracefully - don't crash the server
pool.on("error", (err) => {
  console.error("[Database] Unexpected error on idle client:", err);
  // Don't throw - just log the error
  // The pool will automatically create a new client if needed
});

// Handle connection errors
pool.on("connect", () => {
  if (process.env.NODE_ENV === "development") {
    console.log("[Database] New client connected to pool");
  }
});

export const db = drizzle(pool, { schema });
