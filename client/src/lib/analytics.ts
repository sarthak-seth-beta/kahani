import posthog from "posthog-js";

/**
 * Check if PostHog is ready
 */
function isPostHogReady(): boolean {
  try {
    // Check if PostHog is loaded
    return (
      typeof posthog !== "undefined" && (posthog as any).__loaded !== false
    );
  } catch {
    return false;
  }
}

/**
 * Type-safe event names for tracking
 * Add new events here to maintain consistency
 */
export const AnalyticsEvents = {
  // Page navigation
  PAGE_VIEW: "page_view",

  // Hero section
  HERO_CTA_CLICKED: "hero_cta_clicked",

  // Album interactions
  ALBUM_CARD_CLICKED: "album_card_clicked",
  ALBUM_CARD_SHARE: "album_card_share",
  ALBUM_SELECTED: "album_selected",
  ALBUM_VIEW_DETAILS: "album_view_details",
  ALBUM_QUESTIONS_EXPANDED: "album_questions_expanded",
  VIEW_ALL_ALBUMS_CLICKED: "view_all_albums_clicked",

  // Checkout flow
  CHECKOUT_PAGE_VIEWED: "checkout_page_viewed",
  FREE_TRIAL_CHECKOUT_PAGE_VIEWED: "free_trial_checkout_page_viewed",
  BUY_NOW_CLICKED: "buy_now_clicked",
  FREE_TRIAL_BUTTON_CLICKED: "free_trial_button_clicked",
  QUANTITY_CHANGED: "quantity_changed",

  // Free trial flow
  FREE_TRIAL_FORM_STARTED: "free_trial_form_started",
  FREE_TRIAL_FORM_SUBMITTED: "free_trial_form_submitted",
  FREE_TRIAL_FORM_ERROR: "free_trial_form_error",

  // Filter and search
  FILTER_DIALOG_OPENED: "filter_dialog_opened",
  FILTER_APPLIED: "filter_applied",
  FILTER_CLEARED: "filter_cleared",
  SEARCH_PERFORMED: "search_performed",

  // Playlist/Audio interactions
  PLAYLIST_PLAY_CLICKED: "playlist_play_clicked",
  PLAYLIST_PAUSE_CLICKED: "playlist_pause_clicked",
  PLAYLIST_SHUFFLE_CLICKED: "playlist_shuffle_clicked",
  TRACK_PLAYED: "track_played",
  TRACK_PAUSED: "track_paused",
  TRACK_CLICKED: "track_clicked",
  MINI_PLAYER_PLAY_PAUSE: "mini_player_play_pause",
  LANGUAGE_CHANGED: "language_changed",
  ALBUM_SHARED: "album_shared",

  // FAQ interactions
  FAQ_EXPANDED: "faq_expanded",
  FAQ_COLLAPSED: "faq_collapsed",

  // Form interactions (non-PII)
  PHONE_INPUT_FOCUSED: "phone_input_focused",
  PHONE_INPUT_BLURRED: "phone_input_blurred",
  FORM_FIELD_FOCUSED: "form_field_focused",

  // Navigation
  BACK_BUTTON_CLICKED: "back_button_clicked",
  NAVIGATION_CLICKED: "navigation_clicked",

  // Demo/Trial
  TRY_DEMO_CLICKED: "try_demo_clicked",
  START_RECORDING_CLICKED: "start_recording_clicked",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/**
 * Base properties that should be included with every event
 */
interface BaseEventProperties {
  // Page/route information
  page_path?: string;
  page_title?: string;

  // User agent info (non-PII)
  device_type?: "mobile" | "tablet" | "desktop";
  browser?: string;

  // Timestamp
  timestamp?: number;
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  properties?: Record<string, any>,
): void {
  if (!isPostHogReady()) {
    return;
  }

  try {
    if (!posthog) {
      return;
    }
  } catch {
    return;
  }

  // Add base properties
  const baseProperties: BaseEventProperties = {
    page_path: window.location.pathname,
    page_title: document.title,
    device_type: getDeviceType(),
    timestamp: Date.now(),
  };

  // Merge with custom properties
  const eventProperties = {
    ...baseProperties,
    ...properties,
  };

  // Remove any potential PII (phone numbers, names, etc.)
  const sanitizedProperties = sanitizeProperties(eventProperties);

  try {
    posthog.capture(eventName, sanitizedProperties);
  } catch (error) {
    console.error("[Analytics] Failed to track event:", error);
  }
}

/**
 * Track a page view
 */
export function trackPageView(path?: string, title?: string): void {
  if (!isPostHogReady()) {
    return;
  }

  try {
    if (!posthog) {
      return;
    }
  } catch {
    return;
  }

  const pagePath = path || window.location.pathname;
  const pageTitle = title || document.title;

  try {
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      page_path: pagePath,
      page_title: pageTitle,
      device_type: getDeviceType(),
    });
  } catch (error) {
    console.error("[Analytics] Failed to track pageview:", error);
  }
}

/**
 * Identify a user (without PII)
 * Use a hashed/anonymous identifier
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, any>,
): void {
  if (!isPostHogReady()) {
    return;
  }

  try {
    if (!posthog) {
      return;
    }
  } catch {
    return;
  }

  // Sanitize properties to remove PII
  const sanitizedProperties = sanitizeProperties(properties || {});

  try {
    posthog.identify(userId, sanitizedProperties);
  } catch (error) {
    console.error("[Analytics] Failed to identify user:", error);
  }
}

/**
 * Set user properties (without PII)
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (!isPostHogReady()) {
    return;
  }

  try {
    if (!posthog) {
      return;
    }
  } catch {
    return;
  }

  const sanitizedProperties = sanitizeProperties(properties);

  try {
    posthog.setPersonProperties(sanitizedProperties);
  } catch (error) {
    console.error("[Analytics] Failed to set user properties:", error);
  }
}

/**
 * Reset user identification (on logout)
 */
export function resetUser(): void {
  if (!isPostHogReady()) {
    return;
  }

  try {
    if (!posthog) {
      return;
    }
  } catch {
    return;
  }

  try {
    posthog.reset();
  } catch (error) {
    console.error("[Analytics] Failed to reset user:", error);
  }
}

/**
 * Helper: Get device type from window width
 */
function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * Helper: Sanitize properties to remove PII
 * Removes phone numbers, emails, names, and other sensitive data
 */
function sanitizeProperties(
  properties: Record<string, any> | undefined,
): Record<string, any> {
  if (!properties) {
    return {};
  }

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
