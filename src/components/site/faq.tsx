import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Do I need any experience to volunteer?",
    a: "Nope — most shifts are unskilled and our team will show you the ropes. The Conscious Kitchen welcomes people who&rsquo;ve never held a chef&rsquo;s knife as well as those who run their own restaurants.",
  },
  {
    q: "How old do I need to be?",
    a: "Most shifts are for volunteers aged 16+. For younger rangatahi, get in touch — we run school groups under supervision, and the Work Skills programme welcomes people from age 18.",
  },
  {
    q: "What should I wear and bring?",
    a: "Closed-toe shoes (the warehouse floor can get slippery), clothes you don&rsquo;t mind getting a little messy, and a refillable water bottle. We&rsquo;ll provide aprons, gloves, hairnets and a cuppa.",
  },
  {
    q: "Can I come as a walk-in?",
    a: "We can&rsquo;t always accommodate walk-ins because shifts have a set capacity. Booking ahead through this site is the most reliable way to get a spot.",
  },
  {
    q: "I want to bring my workplace — how does that work?",
    a: "Email kiaora@fairfood.org.nz or use the &ldquo;Bring your team&rdquo; page. We&rsquo;ve hosted 150+ companies and tailor the half-day around your group&rsquo;s size and interests.",
  },
  {
    q: "What if I need to cancel?",
    a: "No worries — just open the shift in &ldquo;My shifts&rdquo; and tap cancel. Letting us know early helps us offer the spot to someone else.",
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
              href="mailto:kiaora@fairfood.org.nz"
            >
              kiaora@fairfood.org.nz
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
                <span dangerouslySetInnerHTML={{ __html: f.a }} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
