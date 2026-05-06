import Link from "next/link";
import { Logo } from "./logo";
import { currentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";

const links = [
  { href: "/programs", label: "Programmes" },
  { href: "/shifts", label: "Shifts" },
  { href: "/about", label: "About" },
];

export async function SiteNav() {
  const user = await currentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Logo size={42} />
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu user={{ name: user.name, email: user.email, role: user.role }} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-leaf hover:bg-leaf-deep">
                <Link href="/shifts">Sign up to volunteer</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
