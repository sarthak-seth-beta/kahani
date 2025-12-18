import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PostHogProvider } from "posthog-js/react";

// PostHog configuration
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_ENABLED = import.meta.env.VITE_POSTHOG_ENABLED !== "false";

const posthogOptions = {
  api_host: POSTHOG_HOST,
  // Enable autocapture for automatic event tracking
  autocapture: true,
  // Enable session recording
  session_recording: {
    recordCrossOriginIframes: false,
    maskAllInputs: true, // Mask all inputs for privacy
    maskTextSelector: "[data-ph-mask]", // Custom selector for masking
  },
  // Capture pageviews automatically
  capture_pageview: false, // We'll handle pageviews manually for better control
  capture_pageleave: true,
  // Privacy settings
  disable_session_recording: false,
  // Advanced settings
  persistence: "localStorage+cookie",
  cross_subdomain_cookie: false,
  secure_cookie: true,
  loaded: (posthog: any) => {
    if (import.meta.env.DEV) {
      console.log("[PostHog] Initialized successfully");
    }
  },
} as const;

// Only initialize PostHog if API key is provided and enabled
if (!POSTHOG_API_KEY && import.meta.env.DEV) {
  console.warn(
    "[PostHog] VITE_POSTHOG_API_KEY is not set. PostHog tracking is disabled.",
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {POSTHOG_ENABLED && POSTHOG_API_KEY ? (
      <PostHogProvider apiKey={POSTHOG_API_KEY} options={posthogOptions}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
