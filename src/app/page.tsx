import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { Hero } from "@/components/site/hero";
import { StatsBand } from "@/components/site/stats-band";
import { Marquee } from "@/components/site/marquee";
import { ProgramsGrid } from "@/components/site/programs-grid";
import { InclusiveBand } from "@/components/site/inclusive-band";
import { Faq } from "@/components/site/faq";
import { CtaBand } from "@/components/site/cta-band";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <Marquee />
        <ProgramsGrid />
        <StatsBand />
        <InclusiveBand />
        <Faq />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
