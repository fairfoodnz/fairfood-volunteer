import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
  // Off by default: the onboarding questionnaire captures sensitive free-text
  // (health conditions, arrest history) and session recording masks
  // <input type="password"> but not textareas. Disabling outright avoids the
  // need to hand-mark every sensitive surface and is easier to keep right as
  // new forms are added. Re-enable per-feature with explicit `ph-no-capture`
  // markers on every sensitive input before flipping this back on.
  disable_session_recording: true,
});
