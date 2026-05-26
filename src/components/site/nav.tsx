import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./logo";
import { currentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import { PostHogUserSync } from "@/components/posthog-user-sync";

const links: { href: string; label: string; external?: boolean }[] = [
  { href: "/programs", label: "Programmes" },
  { href: "/shifts", label: "Shifts" },
  { href: "https://www.fairfood.org.nz", label: "About", external: true },
];

export async function SiteNav() {
  const user = await currentUser();

  return (
    <>
      {user && <PostHogUserSync userId={user.id} />}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-6">
          <Logo size={42} />
          <nav className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
              >
                {l.label}
                {l.external && <ArrowUpRight className="size-3.5" aria-hidden />}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
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
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="bg-leaf hover:bg-leaf-deep">
                  <Link href="/shifts">
                    <span className="sm:hidden">Volunteer</span>
                    <span className="hidden sm:inline">Sign up to volunteer</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
