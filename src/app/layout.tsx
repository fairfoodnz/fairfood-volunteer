import type { Metadata, Viewport } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import {
  jsonLdScript,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  siteJsonLd,
} from "@/lib/seo";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Mono accents (eyebrows, <dt> labels, micro-facts) — see MASTER.md.
// globals.css maps `--font-mono` to this variable.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  // Cream page background, so mobile browser chrome blends into the site.
  themeColor: "#f8f2eb",
};

export const metadata: Metadata = {
  // metadataBase lets Next resolve the relative OG/Twitter/canonical URLs
  // below (and the file-based opengraph-image) to absolute URLs.
  metadataBase: new URL(SITE_URL),
  title: "Fair Food · Volunteer",
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Fair Food · Volunteer",
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_NZ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fair Food · Volunteer",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          // Organization + WebSite graph — see lib/seo.ts. Static today, but
          // jsonLdScript escapes `<` so it stays safe if dynamic data is ever
          // added to the graph.
          dangerouslySetInnerHTML={{ __html: jsonLdScript(siteJsonLd()) }}
        />
        <a
          href="#main"
          className="sr-only z-[60] rounded-md bg-leaf-deep px-4 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <ImpersonationBanner />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors closeButton position="bottom-center" />
      </body>
    </html>
  );
}
