import { ProgramsGrid } from "@/components/site/programs-grid";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { CtaBand } from "@/components/site/cta-band";
import { InclusiveBand } from "@/components/site/inclusive-band";

export const metadata = { title: "Programmes · Fair Food Volunteer" };

export default function ProgramsPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-cream-deep">
          <div className="container-x py-16 md:py-20">
            <p className="eyebrow">Tūmahi · Programmes</p>
            <h1 className="display mt-3 text-balance text-4xl font-bold leading-[1.05] md:text-6xl">
              Five ways to roll up your sleeves with us.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-foreground/75">
              From sorting kai boxes to cooking nourishing meals, here&rsquo;s
              everything we&rsquo;re running this season.
            </p>
          </div>
        </section>
        <ProgramsGrid />
        <InclusiveBand />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
