"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
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
};

const SECTIONS: { label: string; links: NavLink[] }[] = [
  {
    label: "Rosters",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/shifts/new", label: "New shift", icon: CalendarPlus },
    ],
  },
  {
    label: "Volunteers",
    links: [
      { href: "/admin/flagged", label: "Kōrero needed", icon: AlertCircle },
      { href: "/admin/volunteers", label: "All volunteers", icon: Users, disabled: true },
    ],
  },
  {
    label: "Resources",
    links: [
      { href: "/admin/documents", label: "Documents", icon: FileText, disabled: true },
    ],
  },
];

export function AdminSidebar({
  user,
}: {
  user: { name: string; email: string };
}) {
  const pathname = usePathname();

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
              Whakahaere
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
                  return (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={link.label}
                        render={<Link href={link.href} />}
                      >
                        <Icon className="size-4" />
                        <span>{link.label}</span>
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
