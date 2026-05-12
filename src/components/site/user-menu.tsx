"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/auth/actions";

export function UserMenu({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  const initials =
    user.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "K";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="inline-flex items-center gap-2 rounded-full border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-foreground/80 outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-leaf text-cream text-xs font-semibold">
          {initials}
        </span>
        <span className="hidden md:inline">{user.name.split(" ")[0]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5">
            <div className="text-sm font-semibold">{user.name}</div>
            <div className="text-xs font-normal text-muted-foreground">
              {user.email}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
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
        <form action={signOutAction}>
          <DropdownMenuItem
            nativeButton
            render={(props) => (
              <button type="submit" {...props}>
                Sign out
              </button>
            )}
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
