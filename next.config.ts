import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Production CSP. We start in report-only — flip the header *key* from
// "Content-Security-Policy-Report-Only" to "Content-Security-Policy" after a
// few days of preview + production monitoring show no violations we don't
// want (the in-browser console logs every block in report-only mode).
//
// Skipped in dev: Turbopack HMR, React DevTools and the `eval`-driven dev
// runtime would all throw violations. Production builds need none of that.
const PROD_CSP = [
  "default-src 'self'",
  // Next.js + React inject inline scripts and styles for hydration. We pay
  // the 'unsafe-inline' cost here until a nonce-based rollout (separate PR).
  // No 'unsafe-eval' — production Next.js doesn't need it.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Programme images and uploaded documents are served same-origin via the
  // /api routes. `data:` covers tiny inline thumbnails and react-day-picker
  // chevrons. `blob:` lets the document upload form preview the chosen file.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // PostHog ingest is rewritten under /ingest/* — same-origin from the
  // browser's perspective. Google OAuth is a top-level navigation, not an
  // XHR, so no third-party connect-src is needed.
  "connect-src 'self'",
  "form-action 'self'",
  // awhinatech.nz embeds the volunteer site from their main domain — the
  // policy must permit them in addition to 'self'. CSP frame-ancestors
  // supersedes X-Frame-Options when both are set, but the latter can't
  // express "self + another origin", so we skip it entirely.
  "frame-ancestors 'self' https://awhinatech.nz https://*.awhinatech.nz",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  // Globalise the nosniff we already set per-file-route. Catches static
  // assets and API responses too — defense in depth alongside the
  // allowlisted Content-Type on /api/documents/[id] and the programme
  // image route.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Tighten the powerful APIs we don't use; allow the two
  // publickey-credentials directives so passkey registration
  // (/me/security) and assertion (/auth/sign-in) keep working.
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "publickey-credentials-get=(self)",
      "publickey-credentials-create=(self)",
    ].join(", "),
  },
  // Coolify/Traefik likely terminates TLS with HSTS already — a duplicate
  // is harmless and means we're never missing it if the edge config drifts.
  // Two-year max-age + includeSubDomains is the modern baseline; no
  // preload yet (deliberately reversible while we're new on this domain).
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
        { key: "Content-Security-Policy-Report-Only", value: PROD_CSP },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Allow 25 MB document uploads plus a little overhead for form fields.
      bodySizeLimit: "27mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
