import Link from "next/link";

const tags = [
  "Modified tasks",
  "Bring a support person",
  "Wheelchair accessible",
  "Quiet shift options",
  "Te reo welcome",
  "Group bookings",
  "Sensory-aware",
  "First-timers",
];

export function InclusiveBand() {
  return (
    <section className="border-y border-border/60 bg-cream-deep">
      <div className="container-x grid gap-10 py-16 md:grid-cols-[1fr_1.2fr] md:py-20">
        <div className="space-y-5">
          <p className="eyebrow">Built for every body</p>
          <h2 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
            Inclusive volunteering, in practice — not just on the website.
          </h2>
          <p className="max-w-md text-foreground/75">
            We modify tasks, allow support people to come along, and welcome
            groups like the Young Onset Dementia Collective every Monday. Tell
            us what you need on the form. There&rsquo;s nearly always a way.
          </p>
          <Link
            href="/programs/inclusive"
            className="inline-flex items-center gap-2 text-base font-semibold text-leaf-deep underline-offset-4 hover:underline"
          >
            See inclusive programmes →
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 self-center">
          {tags.map((t, i) => (
            <li
              key={t}
              className="rounded-full border border-foreground/10 bg-background px-4 py-2.5 text-sm font-medium text-foreground/85"
              style={{
                marginLeft: i % 2 === 1 ? "1rem" : 0,
              }}
            >
              <span className="mr-2 text-leaf-deep">✓</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
