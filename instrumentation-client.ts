import posthog from "posthog-js";

import { filterThirdPartyExceptions } from "@/lib/posthog-exception-filter";
import { scrubAuthTokens } from "@/lib/posthog-url-scrub";
import {
  installTranslationSafeDom,
  type TranslationRecovery,
} from "@/lib/translation-safe-dom";

// Must run synchronously before hydration: keeps a translated page (Chrome /
// Safari "Translate this page") from crashing React's next commit. See the
// header of src/lib/translation-safe-dom.ts. Each kind of recovery is
// reported once per page load (each would otherwise have been a crash), so
// PostHog shows how often the guard is doing real work. Recoveries only
// happen once React commits, after posthog.init below has run.
const reportedRecoveries = new Set<TranslationRecovery>();
installTranslationSafeDom(Node.prototype, (kind) => {
  if (reportedRecoveries.has(kind)) return;
  reportedRecoveries.add(kind);
  posthog.capture("dom_translation_recovered", { kind });
});

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  // Drop exceptions thrown by browser extensions / injected scripts before
  // they pollute error tracking (see fairfoodnz/fairfood-volunteer#123).
  // Then strip reset / verify / invite tokens from every URL the event carries
  // (see src/lib/posthog-url-scrub.ts).
  before_send: [filterThirdPartyExceptions, scrubAuthTokens],
  debug: process.env.NODE_ENV === "development",
  // Off by default: the onboarding questionnaire captures sensitive free-text
  // (health conditions, arrest history) and session recording masks
  // <input type="password"> but not textareas. Disabling outright avoids the
  // need to hand-mark every sensitive surface and is easier to keep right as
  // new forms are added. Re-enable per-feature with explicit `ph-no-capture`
  // markers on every sensitive input before flipping this back on.
  disable_session_recording: true,
});
