/**
 * Browsing session ID for rate limiting.
 * Uses localStorage so the ID persists across tab closes/reopens.
 * Used to distinguish multiple users on a shared IP (e.g. office, home).
 */

const STORAGE_KEY = "kahani_browse_session_id";

export function getOrCreateSessionId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
