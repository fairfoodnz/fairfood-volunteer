import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Plain Unicode here, not HTML entities — the answers render as text so
// React would escape any `&rsquo;` literally. Keeps the dangerouslySetInnerHTML
// off this component (and out of a future CMS-backed refactor where it would
// turn into stored XSS).
const faqs = [
  {
    q: "Do I need any experience to volunteer?",
    a: "Nope — as long as you’ve got a pair of hands and are willing to do the mahi then we will welcome you at the kai tables.",
  },
  {
    q: "How old do I need to be?",
    a: "Most shifts are for volunteers aged 16+. Anyone under 18 years old must come with a parent or guardian first. For younger rangatahi, get in touch — we run school groups under supervision.",
  },
  {
    q: "What should I wear and bring?",
    a: "Closed-toe shoes and hair tied back. Hi-vis, aprons, gloves and a cuppa on us.",
  },
  {
    q: "Can I come as a walk-in?",
    a: "We can’t always accommodate walk-ins because shifts have a set capacity. Booking ahead through this site is the most reliable way to get a spot.",
  },
  {
    q: "I want to bring my workplace — how does that work?",
    a: "Email volunteering@fairfood.org.nz or use the “Bring your team” page. We’ve hosted 150+ companies and tailor the session around your group’s size and interests.",
  },
  {
    q: "What if I need to cancel?",
    a: "No worries — just open the shift in “My shifts” and tap cancel. Letting us know early helps us offer the spot to someone else.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="container-x py-20 md:py-28">
      <div className="grid gap-12 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <p className="eyebrow">Pātai</p>
          <h2 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
            Things people ask before their first shift.
          </h2>
          <p className="text-foreground/70">
            Still got pātai? Flick us an email at{" "}
            <a
              className="font-semibold text-leaf-deep underline underline-offset-4"
              href="mailto:volunteering@fairfood.org.nz"
            >
              volunteering@fairfood.org.nz
            </a>
            .
          </p>
        </div>
        <Accordion className="rounded-md border border-border bg-background">
          {faqs.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="border-b last:border-b-0"
            >
              <AccordionTrigger className="px-5 py-4 text-left text-base font-semibold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 text-[0.95rem] leading-relaxed text-foreground/75">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
