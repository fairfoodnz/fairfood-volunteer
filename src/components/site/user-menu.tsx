"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/auth/actions";
import { fullName, initials, type PersonName } from "@/lib/users";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string; external?: boolean };

export function UserMenu({
  user,
}: {
  user: PersonName & { email: string; role: string };
}) {
  const [pending, start] = useTransition();
  const displayName = fullName(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-transparent bg-transparent px-1 text-sm font-medium text-foreground/85 outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:pr-3"
      >
        <span className="grid size-9 place-items-center rounded-full bg-leaf-deep text-xs font-semibold text-cream">
          {initials(user)}
        </span>
        <span className="hidden md:inline">{user.firstName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5">
            <div className="text-sm font-semibold">{displayName}</div>
            <div className="text-xs font-normal text-muted-foreground">
              {user.email}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/shifts" />}>
          Browse shifts
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/me" />}>
          My shifts
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/me/profile" />}>
          Profile
        </DropdownMenuItem>
        {user.role === "ADMIN" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/admin" />}>
              Admin
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onClick={() => start(() => signOutAction())}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const rowClass =
  "flex min-h-12 items-center gap-1.5 rounded-md px-3 text-base font-medium text-foreground/85 transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-leaf/10 aria-[current=page]:text-leaf-deep";

/**
 * Below md the header links collapse into this slide-over. Lives here (not in
 * nav.tsx) because SiteNav is a Server Component and the sheet needs state.
 */
export function MobileNav({
  links,
  user,
}: {
  links: NavLink[];
  user: { role: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const pathname = usePathname();
  const close = () => setOpen(false);
  const current = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
          />
        }
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 bg-background p-0"
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <SheetTitle className="eyebrow">Menu</SheetTitle>
          <SheetClose
            render={
              <Button variant="ghost" size="icon" aria-label="Close menu" />
            }
          >
            <X className="size-5" aria-hidden />
          </SheetClose>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-1 p-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={close}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noopener noreferrer" : undefined}
              aria-current={l.external ? undefined : current(l.href)}
              className={rowClass}
            >
              {l.label}
              {l.external && <ArrowUpRight className="size-4" aria-hidden />}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-border p-3">
          {user ? (
            <div className="flex flex-col gap-1">
              <Link
                href="/me"
                onClick={close}
                aria-current={pathname === "/me" ? "page" : undefined}
                className={rowClass}
              >
                My shifts
              </Link>
              <Link
                href="/me/profile"
                onClick={close}
                aria-current={current("/me/profile")}
                className={rowClass}
              >
                Profile
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={close}
                  aria-current={current("/admin")}
                  className={rowClass}
                >
                  Admin
                </Link>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => start(() => signOutAction())}
                className={cn(rowClass, "w-full text-left disabled:opacity-65")}
              >
                {pending ? "Signing out…" : "Sign out"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button asChild size="lg" className="bg-leaf-deep hover:bg-leaf-ink">
                <Link href="/auth/sign-up" onClick={close}>
                  Sign up to volunteer
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/sign-in" onClick={close}>
                  Sign in
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
