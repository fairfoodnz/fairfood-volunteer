import Link from "next/link";
import { db } from "@/lib/db";
import { programmeTheme } from "@/lib/programme-theme";
import { programHref } from "@/lib/programs";
import { ProgrammeVisibilityBadge } from "@/components/admin/programme-visibility-badge";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/patterns/empty-state";

export const metadata = { title: "Programmes · Admin" };
export const dynamic = "force-dynamic";

export default async function ProgrammesPage() {
  const programmes = await db.program.findMany({
    orderBy: [{ visibility: "asc" }, { order: "asc" }, { title: "asc" }],
    include: { _count: { select: { shifts: true } } },
  });

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader
          eyebrow="Programmes"
          title="Manage volunteer programmes"
          actions={
            <Link
              href="/admin/programmes/new"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-leaf-deep px-5 text-sm font-semibold text-cream hover:bg-leaf-ink"
            >
              + New programme
            </Link>
          }
        />

        {programmes.length === 0 ? (
          <EmptyState
            action={{ href: "/admin/programmes/new", label: "Create a programme →" }}
          >
            No programmes yet. Add your first one to start scheduling shifts.
          </EmptyState>
        ) : (
          <div className="relative overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">
                Volunteer programmes, with who can see each one
              </caption>
              <thead className="bg-cream-deep text-left text-foreground/70">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                    Programme
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                    Theme
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                    Shifts
                  </th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {programmes.map((p) => {
                  const theme = programmeTheme(p.theme);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.title}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-foreground/70">
                            {programHref(p.slug)}
                          </span>
                          {/* For an unlisted programme the link is the way in,
                              so make it grabbable from the list itself. */}
                          {p.visibility === "UNLISTED" && (
                            <CopyLinkButton
                              path={programHref(p.slug)}
                              label="Copy link"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-foreground/80">
                          <span
                            aria-hidden
                            className="size-4 rounded-full border border-black/10"
                            style={{ background: theme.swatch }}
                          />
                          {theme.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ProgrammeVisibilityBadge visibility={p.visibility} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground/80">
                        {p._count.shifts}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/programmes/${p.id}`}
                          className="inline-flex min-h-9 items-center font-semibold text-leaf-deep hover:underline"
                        >
                          Edit<span className="sr-only"> {p.title}</span> →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
