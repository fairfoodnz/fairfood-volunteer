import "server-only";
import { getPostHogClient } from "@/lib/posthog-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Two payload shapes show up here depending on which directive the browser
// honoured:
//
//  - `report-uri` (legacy, still most widely supported): one report at a
//    time, `Content-Type: application/csp-report`, kebab-case keys nested
//    under "csp-report".
//  - `report-to` / Reporting-Endpoints (modern): an array of reports,
//    `Content-Type: application/reports+json`, camelCase keys under `body`.
//
// We accept both and normalise to a single flat shape before sending to
// PostHog. Anything we don't recognise is skipped silently — a malformed
// or replayed payload should never 500 the endpoint.

type LegacyReport = {
  "csp-report"?: {
    "document-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "blocked-uri"?: string;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
    "status-code"?: number;
    "script-sample"?: string;
    disposition?: string;
    referrer?: string;
  };
};

type ModernReport = {
  type?: string;
  age?: number;
  url?: string;
  user_agent?: string;
  body?: {
    documentURL?: string;
    referrer?: string;
    blockedURL?: string;
    effectiveDirective?: string;
    originalPolicy?: string;
    sourceFile?: string;
    sample?: string;
    disposition?: string;
    statusCode?: number;
    lineNumber?: number;
    columnNumber?: number;
  };
};

type FlatViolation = {
  document_uri?: string;
  blocked_uri?: string;
  effective_directive?: string;
  source_file?: string;
  line_number?: number;
  column_number?: number;
  disposition?: string;
  sample?: string;
  status_code?: number;
  referrer?: string;
  // Which transport delivered this report. Useful when chasing browser-
  // specific oddities.
  source: "report-uri" | "report-to";
};

function flattenLegacy(r: LegacyReport["csp-report"] = {}): FlatViolation {
  return {
    document_uri: r["document-uri"],
    blocked_uri: r["blocked-uri"],
    effective_directive: r["effective-directive"] ?? r["violated-directive"],
    source_file: r["source-file"],
    line_number: r["line-number"],
    column_number: r["column-number"],
    disposition: r.disposition,
    sample: r["script-sample"],
    status_code: r["status-code"],
    referrer: r.referrer,
    source: "report-uri",
  };
}

function flattenModern(r: ModernReport): FlatViolation {
  const b = r.body ?? {};
  return {
    document_uri: b.documentURL ?? r.url,
    blocked_uri: b.blockedURL,
    effective_directive: b.effectiveDirective,
    source_file: b.sourceFile,
    line_number: b.lineNumber,
    column_number: b.columnNumber,
    disposition: b.disposition,
    sample: b.sample,
    status_code: b.statusCode,
    referrer: b.referrer,
    source: "report-to",
  };
}

// Browser extensions are the single biggest source of CSP-report noise —
// they inject scripts into every page they touch and our policy quite
// reasonably blocks them. Drop these client-side so we don't pay the cost
// of sending them to PostHog.
function isNoise(v: FlatViolation) {
  const uri = v.blocked_uri ?? "";
  return (
    uri.startsWith("chrome-extension://") ||
    uri.startsWith("moz-extension://") ||
    uri.startsWith("safari-extension://") ||
    uri.startsWith("safari-web-extension://")
  );
}

export async function POST(req: Request) {
  // Reject obviously-wrong content-types fast so a misdirected client (a
  // browser fingerprinting us, a probe) can't burn capture quota.
  const ct = req.headers.get("content-type") ?? "";
  if (
    !ct.includes("application/csp-report") &&
    !ct.includes("application/reports+json") &&
    !ct.includes("application/json")
  ) {
    return new Response(null, { status: 415 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const violations: FlatViolation[] = [];
  if (Array.isArray(payload)) {
    for (const r of payload as ModernReport[]) {
      if (r.type && r.type !== "csp-violation") continue;
      violations.push(flattenModern(r));
    }
  } else if (payload && typeof payload === "object") {
    const obj = payload as LegacyReport & ModernReport;
    if (obj["csp-report"]) violations.push(flattenLegacy(obj["csp-report"]));
    else if (obj.body) violations.push(flattenModern(obj));
  }

  if (violations.length === 0) {
    return new Response(null, { status: 204 });
  }

  const posthog = getPostHogClient();
  const userAgent = req.headers.get("user-agent") ?? undefined;
  // Bucket all anonymous CSP reports under a single distinctId. They're not
  // tied to a person; we want them showing up in PostHog as events to chart,
  // not as 'persons'. A separate bucket keeps anon-user counts clean.
  const distinctId = "csp-reporter";

  for (const v of violations) {
    if (isNoise(v)) continue;
    posthog.capture({
      distinctId,
      event: "csp_violation",
      properties: { ...v, user_agent: userAgent },
    });
  }
  // Fire and forget — never block the browser's report POST on PostHog's
  // ingest. Errors are swallowed (the next report will retry the flush).
  posthog.flush().catch(() => {});

  return new Response(null, { status: 204 });
}
