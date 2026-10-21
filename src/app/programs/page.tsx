import { ProgramsGrid } from "@/components/site/programs-grid";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { CtaBand } from "@/components/site/cta-band";
import { InclusiveBand } from "@/components/site/inclusive-band";
import { PageHeader } from "@/components/patterns/page-header";

// Count-agnostic on purpose: coordinators add and retire programmes from
// /admin/programmes, so no copy here should promise "three".
const description =
  "Ways to volunteer with Fair Food in Avondale — sorting kai boxes, cooking in the Conscious Kitchen, inclusive volunteering and more. Find the programme that fits you.";

export const metadata = {
  title: "Programmes · Fair Food Volunteer",
  description,
  alternates: { canonical: "/programs" },
  openGraph: {
    title: "Programmes · Fair Food Volunteer",
    description,
    url: "/programs",
  },
};

export default function ProgramsPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1">
        <PageHeader
          band
          eyebrow="Tūmahi · Programmes"
          title="Find a place that fits the day you’ve got."
          lead="From sorting kai boxes to cooking nourishing meals, here’s everything we’re running this season. Choose a programme to see its open shifts."
        />
        <ProgramsGrid showHeader={false} className="py-12 md:py-16" />
        <InclusiveBand />
        <CtaBand className="pt-12 md:pt-16" />
      </main>
      <SiteFooter />
    </>
  );
}
