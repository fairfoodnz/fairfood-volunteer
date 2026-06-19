/**
 * Single source of truth for site-wide SEO constants and structured data.
 *
 * The origin mirrors the fallback used in `robots.ts`, `sitemap.ts`,
 * `lib/auth.ts` (`appOrigin`) and `emails/brand.ts` — `NEXT_PUBLIC_APP_URL`
 * is build-time-inlined by Next.js, so this resolves to the real public
 * origin in production and the production origin as a safe fallback.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://volunteer.fairfood.org.nz"
).replace(/\/$/, "");

export const SITE_NAME = "Fair Food Volunteer";

export const SITE_DESCRIPTION =
  "Help turn leftovers into lifelines for whānau who are doing it tough. Volunteer with Fair Food in Tāmaki Makaurau.";

/** Fair Food's main marketing site — the canonical home of the organisation. */
export const ORG_SITE_URL = "https://fairfood.org.nz";

/**
 * Stable schema.org node id for the Fair Food Organization. Every page emits
 * the full Organization node (via `siteJsonLd`), so other structured data on
 * the page (e.g. an Event's `organizer`) can reference it by `@id` and search
 * engines resolve them to the same entity.
 */
export const ORG_ID = `${SITE_URL}/#organization`;

/** Build an absolute URL from a root-relative path (e.g. `/programs`). */
export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Serialize an object for inlining in a `<script type="application/ld+json">`.
 * `JSON.stringify` leaves `<` unescaped, so a value containing `</script>`
 * (e.g. admin-entered programme copy) could otherwise close the block early
 * and inject raw HTML. `<` is valid JSON and parsers handle it fine.
 */
export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * schema.org Organization + WebSite graph for the root layout. Rendered as a
 * single `application/ld+json` block so search engines can attribute the site
 * to Fair Food (knowledge panel / sitelinks eligibility). The address and
 * socials match `emails/brand.ts`'s `org` — keep them in step.
 */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NGO",
        "@id": ORG_ID,
        name: "Fair Food",
        alternateName: "Fair Food NZ",
        url: ORG_SITE_URL,
        logo: absoluteUrl("/icon.png"),
        description:
          "Fair Food rescues good kai that would otherwise go to waste and redistributes it to whānau across Tāmaki Makaurau.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "624 Rosebank Road, Avondale",
          addressLocality: "Auckland",
          postalCode: "1026",
          addressCountry: "NZ",
        },
        areaServed: "Auckland, New Zealand",
        sameAs: [
          "https://www.facebook.com/fairfoodnz",
          "https://www.instagram.com/fairfoodnz",
          "https://www.linkedin.com/company/fairfoodnz/",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": ORG_ID },
        inLanguage: "en-NZ",
      },
    ],
  };
}
