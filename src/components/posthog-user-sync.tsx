"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Identify the current visitor by stable userId only — never name or email.
// PostHog stores person properties on Anthropic-controlled infra (US-region)
// and we don't have a business reason to send PII there; userId is enough to
// stitch a person across sessions, and admins still see real identities in
// the app's own database. Server-side captures follow the same rule.
export function PostHogUserSync({ userId }: { userId: string }) {
  useEffect(() => {
    posthog.identify(userId);
  }, [userId]);

  return null;
}
