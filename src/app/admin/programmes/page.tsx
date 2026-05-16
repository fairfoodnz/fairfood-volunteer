import Link from "next/link";
import { db } from "@/lib/db";
import { programmeTheme } from "@/lib/programme-theme";

export const metadata = { title: "Programmes · Admin" };
export const dynamic = "force-dynamic";

export default async function ProgrammesPage() {
  const programmes = await db.program.findMany({
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: { _count: { select: { shifts: true } } },
  });

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Programmes</p>
            <h1 className="display mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Manage volunteer programmes
            </h1>
          </div>
          <Link
            href="/admin/programmes/new"
            className="inline-flex h-11 items-center gap-2 rounded bg-leaf px-5 text-sm font-semibold text-cream hover:bg-leaf-deep"
          >
            + New programme
          </Link>
        </header>

        {programmes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
            <h2 className="display text-2xl font-semibold">No programmes yet</h2>
            <p className="mt-2 text-foreground/70">
              Add your first programme to start scheduling shifts.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-cream-deep text-left text-foreground/65">
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
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest" />
                </tr>
              </thead>
              <tbody>
                {programmes.map((p) => {
                  const theme = programmeTheme(p.theme);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.title}</div>
                        <div className="font-mono text-[11px] text-foreground/55">
                          /programs/{p.slug}
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
                        {p.active ? (
                          <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-leaf-deep">
                            Live
                          </span>
                        ) : (
                          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
                            Hidden
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground/80">
                        {p._count.shifts}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/programmes/${p.id}`}
                          className="font-semibold text-leaf-deep hover:underline"
                        >
                          Edit →
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
