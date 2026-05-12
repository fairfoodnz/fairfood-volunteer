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
        user={{ name: user.name, email: user.email }}
        unreviewedCount={unreviewedCount}
      />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:hidden">
          <SidebarTrigger />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/55">
            Admin
          </span>
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
