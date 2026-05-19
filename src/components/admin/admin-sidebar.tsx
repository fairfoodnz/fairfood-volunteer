"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarRange,
  ListChecks,
  Boxes,
  AlertCircle,
  Users,
  FileText,
  ExternalLink,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LogoMark } from "@/components/site/logo";
import { signOutAction } from "@/app/auth/actions";

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  disabled?: boolean;
  // Key into the badges map passed by the parent. Lets the route stay decoupled
  // from how its count is computed.
  badge?: "unreviewed";
};

const SECTIONS: { label: string; links: NavLink[] }[] = [
  {
    label: "Rosters",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/programmes", label: "Programmes", icon: Boxes },
      {
        href: "/admin/shifts",
        label: "Manage shifts",
        icon: ListChecks,
        exact: true,
      },
      { href: "/admin/shifts/new", label: "New shift", icon: CalendarPlus },
      {
        href: "/admin/shifts/bulk",
        label: "Bulk schedule",
        icon: CalendarRange,
      },
    ],
  },
  {
    label: "Volunteers",
    links: [
      {
        href: "/admin/flagged",
        label: "Needs review",
        icon: AlertCircle,
        badge: "unreviewed",
      },
      { href: "/admin/volunteers", label: "All volunteers", icon: Users },
    ],
  },
  {
    label: "Resources",
    links: [
      { href: "/admin/documents", label: "Documents", icon: FileText },
    ],
  },
];

export function AdminSidebar({
  user,
  unreviewedCount = 0,
}: {
  user: { name: string; email: string };
  unreviewedCount?: number;
}) {
  const pathname = usePathname();
  const badgeCounts: Record<NonNullable<NavLink["badge"]>, number> = {
    unreviewed: unreviewedCount,
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border/60 px-3 py-3">
        <Link
          href="/admin"
          className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
        >
          <LogoMark size={36} />
          <span className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55">
              Fair Food
            </span>
            <span className="text-sm font-semibold">Admin</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.links.map((link) => {
                  const active = link.exact
                    ? pathname === link.href
                    : pathname === link.href ||
                      pathname.startsWith(`${link.href}/`);
                  const Icon = link.icon;
                  if (link.disabled) {
                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton
                          disabled
                          tooltip={`${link.label} — coming soon`}
                        >
                          <Icon className="size-4" />
                          <span className="flex w-full items-center justify-between gap-2">
                            <span>{link.label}</span>
                            <span className="rounded-full bg-foreground/10 px-1.5 text-[9px] font-semibold uppercase tracking-widest text-foreground/55 group-data-[collapsible=icon]:hidden">
                              Soon
                            </span>
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  const count = link.badge ? badgeCounts[link.badge] : 0;
                  const showBadge = count > 0;
                  return (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={
                          showBadge
                            ? `${link.label} (${count})`
                            : link.label
                        }
                        render={<Link href={link.href} />}
                      >
                        <span className="relative">
                          <Icon className="size-4" />
                          {showBadge ? (
                            <span
                              aria-hidden
                              className="absolute -top-1 -right-1 hidden size-2 rounded-full bg-destructive ring-2 ring-sidebar group-data-[collapsible=icon]:block"
                            />
                          ) : null}
                        </span>
                        <span className="flex w-full items-center justify-between gap-2">
                          <span>{link.label}</span>
                          {showBadge ? (
                            <span
                              className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white tabular-nums group-data-[collapsible=icon]:hidden"
                              aria-label={`${count} awaiting review`}
                            >
                              {count}
                            </span>
                          ) : null}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Visit site"
              render={<Link href="/" target="_blank" rel="noopener" />}
            >
              <ExternalLink className="size-4" />
              <span>Visit site</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOutAction} className="w-full">
              <SidebarMenuButton
                type="submit"
                tooltip={`Sign out ${user.name.split(" ")[0]}`}
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pt-1 pb-2 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-xs font-medium">{user.name}</p>
          <p className="truncate text-[11px] text-foreground/55">{user.email}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
