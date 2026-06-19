import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";

// File-based OpenGraph image for the whole site: Next applies this to every
// route that doesn't ship its own opengraph-image. A split card — Fair Food
// logo + headline on a cream panel, a real food-rescue photo on the right —
// generated at request time with Satori, using the brand palette and Poppins.
export const alt =
  "Fair Food — volunteer to turn leftovers into lifelines for whānau";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f8f2eb";
const CHARCOAL = "#0f130e";
const MUTED = "#5b5f57";
const LEAF = "#3d9e34";
const LEAF_DEEP = "#17780f";

// Read sibling assets via static `new URL(..., import.meta.url)` literals so
// Next/Turbopack can statically trace and bundle each one (a dynamic
// `./dir/${file}` template collapses multiple assets to one). Satori can't
// fetch file:// URLs, so we read with fs; the photo is a pre-cropped 1200×630
// PNG (resvg decodes PNG most reliably — webp is unsupported, progressive JPEG
// fails) and the fonts are TTF (no woff2 support).
const read = (url: URL) => readFile(fileURLToPath(url));

const dataUri = (buf: Buffer, mime: string) =>
  `data:${mime};base64,${buf.toString("base64")}`;

export default async function OpengraphImage() {
  const [semibold, extrabold, bg, logo] = await Promise.all([
    read(new URL("./og-fonts/Poppins-SemiBold.ttf", import.meta.url)),
    read(new URL("./og-fonts/Poppins-ExtraBold.ttf", import.meta.url)),
    read(new URL("./og-assets/og-bg.png", import.meta.url)),
    read(new URL("./og-assets/logo.png", import.meta.url)),
  ]);

  const fonts = [
    { name: "Poppins", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Poppins", data: extrabold, weight: 800 as const, style: "normal" as const },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "Poppins",
        }}
      >
        {/* Full-bleed photo behind everything */}
        <img
          alt=""
          src={dataUri(bg, "image/png")}
          width={1200}
          height={630}
          style={{ position: "absolute", top: 0, left: 0 }}
        />

        {/* Cream content panel over the left ~half */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 588,
            height: "100%",
            background: CREAM,
            borderRight: `16px solid ${LEAF_DEEP}`,
            padding: "64px 64px 56px",
            boxShadow: "10px 0 40px rgba(15,19,14,0.28)",
          }}
        >
          <img
            alt=""
            src={dataUri(logo, "image/png")}
            width={96}
            height={96}
            style={{ borderRadius: 48 }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 23,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: LEAF_DEEP,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: LEAF,
                }}
              />
              Volunteer with us
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 60,
                fontWeight: 800,
                lineHeight: 1.04,
                color: CHARCOAL,
              }}
            >
              Turn leftovers into lifelines for whānau.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 25,
              fontWeight: 600,
              color: MUTED,
            }}
          >
            {/* Canonical production domain by design — a social card should
                always show the real domain, never a staging origin. */}
            volunteer.fairfood.org.nz · Tāmaki Makaurau
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
