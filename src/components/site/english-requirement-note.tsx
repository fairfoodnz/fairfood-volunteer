import { paragraphs } from "@/lib/site-copy";

/**
 * The conversational-English expectation, worded by the coordinators in
 * /admin/settings and rendered identically on the sign-up questionnaire and on
 * the profile page — one component so the two can never drift apart.
 *
 * It's a health-and-safety note, not a gate: nothing blocks on it, and the
 * default copy leads with the reason (a working warehouse) and ends with a way
 * in rather than a door closing. The "email us" line lives here rather than in
 * the editable body so the address stays a real mailto link however the note is
 * reworded.
 */
export function EnglishRequirementNote({
  title,
  body,
  className,
}: {
  title: string;
  body: string;
  className?: string;
}) {
  const parts = paragraphs(body);
  if (parts.length === 0) return null;

  return (
    <div
      className={`rounded-md border-l-2 border-leaf bg-cream-deep px-5 py-4 text-sm ${className ?? ""}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {title}
      </p>
      {parts.map((p, i) => (
        <p
          key={i}
          className={i === 0 ? "mt-1.5 text-foreground/85" : "mt-2 text-foreground/85"}
        >
          {p}
        </p>
      ))}
      <p className="mt-2 text-foreground/70">
        Not sure that&rsquo;s you?{" "}
        <a
          href="mailto:volunteering@fairfood.org.nz"
          className="font-semibold text-leaf-deep underline underline-offset-4"
        >
          Email the team
        </a>{" "}
        and we&rsquo;ll talk it through.
      </p>
    </div>
  );
}
