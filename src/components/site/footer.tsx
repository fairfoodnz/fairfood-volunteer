import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-charcoal text-cream">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo variant="light" size={88} />
          <p className="max-w-sm text-sm leading-relaxed text-cream/70">
            Rescuing surplus food from across Tāmaki Makaurau and turning it
            into 2,400+ kilos of kai every day. Mā tātou anō tātou e manaaki.
          </p>
          <p className="text-sm text-cream/60">
            624 Rosebank Road
            <br />
            Avondale, Tāmaki Makaurau
          </p>
          <p className="text-xs text-cream/50">
            Registered charity{" "}
            <a
              href="https://register.charities.govt.nz/Charity/CC48507"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:text-cream hover:underline"
            >
              CC48507
            </a>
          </p>
        </div>

        <FooterCol
          title="Volunteer"
          items={[
            { label: "All programmes", href: "/programs" },
            { label: "Browse shifts", href: "/shifts" },
            { label: "Resources", href: "/resources" },
            {
              label: "Corporate volunteering",
              href: "mailto:volunteering@fairfood.org.nz?subject=Corporate%20volunteering",
            },
            { label: "My shifts", href: "/me" },
          ]}
        />
        <FooterCol
          title="About"
          items={[
            { label: "Our mission", href: "https://www.fairfood.org.nz/our-mission" },
            { label: "Partnerships", href: "https://www.fairfood.org.nz/partnerships" },
            { label: "Newsroom", href: "https://www.fairfood.org.nz/newsroom" },
            { label: "Donate", href: "https://www.fairfood.org.nz/donate" },
          ]}
        />
        <FooterCol
          title="Get in touch"
          items={[
            { label: "kiaora@fairfood.org.nz", href: "mailto:kiaora@fairfood.org.nz" },
            { label: "Instagram", href: "https://instagram.com/fairfoodnz" },
            { label: "Facebook", href: "https://facebook.com/fairfoodnz" },
          ]}
        />
      </div>
      <div className="border-t border-cream/10">
        <div className="container-x flex flex-col items-start justify-between gap-2 py-6 text-xs text-cream/50 md:flex-row md:items-center">
          <span>
            © {new Date().getFullYear()} Fair Food Aotearoa. Built with aroha.
          </span>
          <span>Thank you to all our volunteers.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cream/50">
        {title}
      </div>
      <ul className="space-y-2.5 text-sm">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              href={i.href}
              className="text-cream/85 underline-offset-4 hover:text-cream hover:underline"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
