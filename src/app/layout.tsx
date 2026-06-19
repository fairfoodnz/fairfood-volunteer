import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, siteJsonLd } from "@/lib/seo";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

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
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          // Organization + WebSite graph — see lib/seo.ts. Static, no user
          // input, so the serialized JSON is safe to inline.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        <ImpersonationBanner />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors closeButton position="bottom-center" />
      </body>
    </html>
  );
}
