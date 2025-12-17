import posthog from "posthog-js";

// PostHog configuration
// Using VITE_ prefix for Vite environment variables
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_ENABLED = import.meta.env.VITE_POSTHOG_ENABLED !== "false"; // Enabled by default, can be disabled

let isInitialized = false;

/**
 * Initialize PostHog with lazy loading
 * Should be called once when the app starts
 */
export function initPostHog() {
  // Don't initialize if already initialized or if disabled
  if (isInitialized || !POSTHOG_ENABLED) {
    if (import.meta.env.DEV) {
      console.log("[PostHog] Already initialized or disabled", {
        isInitialized,
        POSTHOG_ENABLED,
      });
    }
    return;
  }

  // Debug: Log what we're getting from environment
  if (import.meta.env.DEV) {
    console.log("[PostHog] Debug - Environment check:", {
      VITE_POSTHOG_API_KEY: import.meta.env.VITE_POSTHOG_API_KEY
        ? "EXISTS"
        : "MISSING",
      VITE_POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST,
      VITE_POSTHOG_ENABLED: import.meta.env.VITE_POSTHOG_ENABLED,
      POSTHOG_API_KEY: POSTHOG_API_KEY ? "EXISTS" : "MISSING",
      POSTHOG_HOST: POSTHOG_HOST,
    });
  }

  // Don't initialize if API key is missing
  if (!POSTHOG_API_KEY) {
    if (import.meta.env.DEV) {
      console.error(
        "[PostHog] ❌ VITE_POSTHOG_API_KEY is not set. PostHog tracking is disabled.",
        "\nPlease set VITE_POSTHOG_API_KEY in your .env file.",
      );
    }
    return;
  }

  try {
    posthog.init(POSTHOG_API_KEY, {
      api_host: POSTHOG_HOST,
      // Enable autocapture for automatic event tracking
      autocapture: true,
      // Enable session recording (can be configured per user/page later)
      session_recording: {
        recordCrossOriginIframes: false,
        maskAllInputs: true, // Mask all inputs for privacy
        maskTextSelector: "[data-ph-mask]", // Custom selector for masking
      },
      // Capture pageviews automatically
      capture_pageview: false, // We'll handle pageviews manually for better control
      capture_pageleave: true,
      // Disable in development if needed (but user wants it enabled)
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          console.log("[PostHog] Initialized successfully");
        }
      },
      // Privacy settings - don't capture PII
      disable_session_recording: false,
      // Advanced settings
      persistence: "localStorage+cookie",
      cross_subdomain_cookie: false,
      secure_cookie: true,
    });

    isInitialized = true;
  } catch (error) {
    console.error("[PostHog] Failed to initialize:", error);
  }
}

/**
 * Get PostHog instance (returns null if not initialized)
 */
export function getPostHog() {
  if (!isInitialized || !POSTHOG_ENABLED) {
    return null;
  }
  return posthog;
}

/**
 * Check if PostHog is initialized and enabled
 */
export function isPostHogReady(): boolean {
  return isInitialized && POSTHOG_ENABLED && !!POSTHOG_API_KEY;
}

