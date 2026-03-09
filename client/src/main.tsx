import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_ENABLED = import.meta.env.VITE_POSTHOG_ENABLED !== "false";

const root = createRoot(document.getElementById("root")!);
startTransition(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

if (POSTHOG_ENABLED && POSTHOG_API_KEY) {
  const initPostHog = () => {
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(POSTHOG_API_KEY!, {
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
        loaded: (ph: typeof posthog) => {
          if (import.meta.env.DEV) {
            console.log("[PostHog] Initialized successfully");
          }
          const startRecording = () => ph.startSessionRecording();
          if ("requestIdleCallback" in window) {
            requestIdleCallback(startRecording);
          } else {
            setTimeout(startRecording, 1);
          }
        },
      });
    });
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(initPostHog);
  } else {
    setTimeout(initPostHog, 1);
  }
} else if (!POSTHOG_API_KEY && import.meta.env.DEV) {
  console.warn(
    "[PostHog] VITE_POSTHOG_API_KEY is not set. PostHog tracking is disabled.",
  );
}
