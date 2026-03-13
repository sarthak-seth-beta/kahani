let _posthog: any = null;

function getPostHog(): any {
  if (_posthog) return _posthog;
  try {
    // posthog-js exposes itself on window after init
    if ((window as any).posthog?.__loaded) {
      _posthog = (window as any).posthog;
      return _posthog;
    }
  } catch {}
  return null;
}

function isPostHogReady(): boolean {
  return getPostHog() !== null;
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

  // Blind-spot events (custom capture for pricing/attribution)
  PACKAGE_SELECTED: "package_selected",
  CUSTOM_ALBUM_CLICKED: "custom_album_clicked",
  DISCOUNT_CODE_APPLIED: "discount_code_applied",
  NARRATOR_TYPE_SELECTED: "narrator_type_selected",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

interface BaseEventProperties {
  page_path?: string;
  page_title?: string;
  device_type?: "mobile" | "tablet" | "desktop";
  browser?: string;
  timestamp?: number;
}

export function trackEvent(
  eventName: AnalyticsEventName,
  properties?: Record<string, any>,
): void {
  const ph = getPostHog();
  if (!ph) return;

  const baseProperties: BaseEventProperties = {
    page_path: window.location.pathname,
    page_title: document.title,
    device_type: getDeviceType(),
    timestamp: Date.now(),
  };

  const sanitizedProperties = sanitizeProperties({
    ...baseProperties,
    ...properties,
  });

  try {
    ph.capture(eventName, sanitizedProperties);
  } catch (error) {
    console.error("[Analytics] Failed to track event:", error);
  }
}

export function trackPageView(path?: string, title?: string): void {
  const ph = getPostHog();
  if (!ph) return;

  const pagePath = path || window.location.pathname;
  const pageTitle = title || document.title;

  try {
    ph.capture("$pageview", {
      $current_url: window.location.href,
      page_path: pagePath,
      page_title: pageTitle,
      device_type: getDeviceType(),
    });
  } catch (error) {
    console.error("[Analytics] Failed to track pageview:", error);
  }
}

export function identifyUser(
  userId: string,
  properties?: Record<string, any>,
): void {
  const ph = getPostHog();
  if (!ph) return;

  const sanitizedProperties = sanitizeProperties(properties || {});

  try {
    ph.identify(userId, sanitizedProperties);
  } catch (error) {
    console.error("[Analytics] Failed to identify user:", error);
  }
}

export function setUserProperties(properties: Record<string, any>): void {
  const ph = getPostHog();
  if (!ph) return;

  const sanitizedProperties = sanitizeProperties(properties);

  try {
    ph.setPersonProperties(sanitizedProperties);
  } catch (error) {
    console.error("[Analytics] Failed to set user properties:", error);
  }
}

export function resetUser(): void {
  const ph = getPostHog();
  if (!ph) return;

  try {
    ph.reset();
  } catch (error) {
    console.error("[Analytics] Failed to reset user:", error);
  }
}

/**
 * Capture UTM parameters from the URL and register them as super properties.
 * Ensures offline links (QR codes, flyers, WhatsApp) with UTM params are
 * attributed to all subsequent events.
 * Example: kahani.xyz?utm_source=holi-event&utm_medium=offline&utm_campaign=delhi-mar26
 */
export function captureUtmParams(): void {
  const ph = getPostHog();
  if (!ph) return;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmTerm = params.get("utm_term");
  const utmContent = params.get("utm_content");

  const utm: Record<string, string> = {};
  if (utmSource) utm.utm_source = utmSource;
  if (utmMedium) utm.utm_medium = utmMedium;
  if (utmCampaign) utm.utm_campaign = utmCampaign;
  if (utmTerm) utm.utm_term = utmTerm;
  if (utmContent) utm.utm_content = utmContent;

  if (Object.keys(utm).length > 0) {
    try {
      ph.register(utm);
    } catch (error) {
      console.error("[Analytics] Failed to register UTM params:", error);
    }
  }
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

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

    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      continue;
    }

    if (typeof value === "string") {
      if (/\+?\d{10,}/.test(value)) {
        continue;
      }
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        continue;
      }
    }

    sanitized[key] = value;
  }

  return sanitized;
}
