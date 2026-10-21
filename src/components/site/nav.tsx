import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./logo";
import { currentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MobileNav, UserMenu, type NavLink } from "./user-menu";
import { PostHogUserSync } from "@/components/posthog-user-sync";

const links: NavLink[] = [
  { href: "/programs", label: "Programmes" },
  { href: "/shifts", label: "Shifts" },
  { href: "/resources", label: "Resources" },
  { href: "https://www.fairfood.org.nz", label: "About", external: true },
];

export async function SiteNav() {
  const user = await currentUser();

  return (
    <>
      {user && <PostHogUserSync userId={user.id} />}
      {/* Sticks below the impersonation banner when one is showing — the
          banner sets --impersonation-offset to its own height. */}
      <header className="sticky top-[var(--impersonation-offset,0px)] z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-4 md:gap-6">
          <Logo size={42} />
          <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noopener noreferrer" : undefined}
                className="inline-flex h-11 items-center gap-1 text-sm font-medium text-foreground/85 transition-colors hover:text-foreground"
              >
                {l.label}
                {l.external && <ArrowUpRight className="size-3.5" aria-hidden />}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 md:gap-2">
            {user ? (
              <UserMenu
                user={{
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  role: user.role,
                }}
              />
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden md:inline-flex">
                  <Link href="/auth/sign-in">Sign in</Link>
                </Button>
                <Button asChild className="bg-leaf-deep hover:bg-leaf-ink">
                  <Link href="/auth/sign-up">Sign up</Link>
                </Button>
              </>
            )}
            <MobileNav links={links} user={user ? { role: user.role } : null} />
          </div>
        </div>
      </header>
    </>
  );
}
