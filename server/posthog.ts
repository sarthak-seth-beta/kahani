import { PostHog } from "posthog-node";

// PostHog configuration
// Server-side: Use POSTHOG_API_KEY (no VITE_ prefix needed on server)
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_ENABLED = process.env.POSTHOG_ENABLED !== "false"; // Enabled by default

let posthogClient: PostHog | null = null;

/**
 * Initialize PostHog client for server-side tracking
 */
export function initPostHog(): PostHog | null {
  if (posthogClient) {
    return posthogClient;
  }

  if (!POSTHOG_ENABLED || !POSTHOG_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[PostHog] POSTHOG_API_KEY is not set. Server-side tracking is disabled.",
      );
    }
    return null;
  }

  try {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[PostHog] Server-side client initialized successfully");
    }

    return posthogClient;
  } catch (error) {
    console.error("[PostHog] Failed to initialize server client:", error);
    return null;
  }
}

/**
 * Get PostHog client instance
 */
export function getPostHog(): PostHog | null {
  if (!posthogClient) {
    return initPostHog();
  }
  return posthogClient;
}

/**
 * Track a server-side event
 */
export function trackServerEvent(
  distinctId: string,
  eventName: string,
  properties?: Record<string, any>,
): void {
  const client = getPostHog();
  if (!client) {
    return;
  }

  // Sanitize properties to remove PII
  const sanitizedProperties = sanitizeProperties(properties || {});

  try {
    client.capture({
      distinctId,
      event: eventName,
      properties: {
        ...sanitizedProperties,
        $lib: "posthog-node",
        $lib_version: "3.x",
      },
    });
  } catch (error) {
    console.error("[PostHog] Failed to track server event:", error);
  }
}

/**
 * Identify a user on the server side
 */
export function identifyServerUser(
  distinctId: string,
  properties?: Record<string, any>,
): void {
  const client = getPostHog();
  if (!client) {
    return;
  }

  const sanitizedProperties = sanitizeProperties(properties || {});

  try {
    client.identify({
      distinctId,
      properties: sanitizedProperties,
    });
  } catch (error) {
    console.error("[PostHog] Failed to identify server user:", error);
  }
}

/**
 * Helper: Sanitize properties to remove PII
 */
function sanitizeProperties(
  properties: Record<string, any>,
): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = [
    "phone",
    "email",
    "name",
    "customerPhone",
    "buyerName",
    "storytellerName",
    "fullName",
    "firstName",
    "lastName",
  ];

  for (const [key, value] of Object.entries(properties)) {
    const lowerKey = key.toLowerCase();

    // Skip sensitive keys
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      continue;
    }

    // Skip values that look like phone numbers or emails
    if (typeof value === "string") {
      // Skip phone numbers (contains + and digits)
      if (/\+?\d{10,}/.test(value)) {
        continue;
      }
      // Skip emails
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        continue;
      }
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Shutdown PostHog client gracefully
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}

