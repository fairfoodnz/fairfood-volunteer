import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const dynamic = "force-dynamic";

// Admin is gated and disallowed in robots.txt; add a noindex meta as a
// belt-and-suspenders against any URL that leaks into an index.
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  // Anonymous → send to sign-in with `next` so they come back here.
  // Signed-in non-admin → 404, so admin paths don't advertise their existence.
  if (!user) redirect("/auth/sign-in?next=/admin");
  if (user.role !== "ADMIN") notFound();

  const unreviewedCount = await db.user.count({
    where: {
      flagReviewedAt: null,
      OR: [{ arrestHistory: true }, { healthConditions: true }],
    },
  });

  return (
    <SidebarProvider>
      <AdminSidebar
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        }}
        unreviewedCount={unreviewedCount}
      />
      {/* min-w-0: without it this flex child grows to its widest table and
          the page clips the overflow, hiding the right-hand columns on
          phones instead of letting each table scroll. */}
      <SidebarInset id="main" className="min-w-0 bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/85 px-2 backdrop-blur md:hidden">
          <SidebarTrigger className="size-11" />
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/70">
            Admin
          </span>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
