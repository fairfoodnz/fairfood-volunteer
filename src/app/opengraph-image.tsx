import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";

// File-based OpenGraph image for the whole site: Next applies this to every
// route that doesn't ship its own opengraph-image. Generated at the edge with
// Satori (no binary asset to keep in sync), using the Fair Food palette from
// globals.css / emails/brand.ts.
export const alt = "Fair Food — volunteer to turn leftovers into lifelines";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f8f2eb";
const CHARCOAL = "#0f130e";
const LEAF = "#3d9e34";
const LEAF_DEEP = "#17780f";

// Satori has no access to next/font, so the brand typeface (Poppins) must be
// loaded explicitly from the colocated TTFs (Satori supports ttf/woff, not
// woff2). Read from disk via fs — Node's fetch() can't read file:// URLs — but
// resolve the path through `new URL(..., import.meta.url)` so Next traces and
// bundles the fonts into the standalone build. Weights 600 and 800 cover every
// label below.
const fontPath = (file: string) =>
  fileURLToPath(new URL(`./og-fonts/${file}`, import.meta.url));

async function loadFonts() {
  const [semibold, extrabold] = await Promise.all([
    readFile(fontPath("Poppins-SemiBold.ttf")),
    readFile(fontPath("Poppins-ExtraBold.ttf")),
  ]);
  return [
    { name: "Poppins", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Poppins", data: extrabold, weight: 800 as const, style: "normal" as const },
  ];
}

export default async function OpengraphImage() {
  const fonts = await loadFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: CREAM,
          color: CHARCOAL,
          fontFamily: "Poppins",
        }}
      >
        {/* Brand spine */}
        <div style={{ display: "flex", width: 24, background: LEAF_DEEP }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "72px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: LEAF_DEEP,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 18,
                height: 18,
                borderRadius: 9,
                background: LEAF,
              }}
            />
            Volunteer with Fair Food
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 920,
            }}
          >
            Turn leftovers into lifelines for whānau.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 28,
              fontWeight: 600,
              color: "#5b5f57",
            }}
          >
            <div style={{ display: "flex" }}>volunteer.fairfood.org.nz</div>
            <div style={{ display: "flex" }}>Tāmaki Makaurau · Auckland</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
