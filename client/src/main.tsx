import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App";
import { flushQueuedEvents } from "./lib/analytics";
import "./index.css";

const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_ENABLED = import.meta.env.VITE_POSTHOG_ENABLED !== "false";

// Initialize PostHog before React mounts so early events (narrator_type_selected, package_selected) are never queued
if (POSTHOG_ENABLED && POSTHOG_API_KEY) {
  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    session_recording: {
      recordCrossOriginIframes: false,
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: true,
    persistence: "localStorage+cookie",
    cross_subdomain_cookie: false,
    secure_cookie: true,
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        console.log("[PostHog] Initialized successfully");
      }
      flushQueuedEvents();
      const startRecording = () => ph.startSessionRecording();
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(startRecording);
      } else {
        setTimeout(startRecording, 1);
      }
    },
  });
}

if (!POSTHOG_API_KEY && import.meta.env.DEV) {
  console.warn(
    "[PostHog] VITE_POSTHOG_API_KEY is not set. PostHog tracking is disabled.",
  );
}

const root = createRoot(document.getElementById("root")!);
startTransition(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
