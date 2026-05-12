import { db } from "@/lib/db";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "@/lib/documents";
import { DocumentUploadCard } from "@/components/admin/document-upload-card";
import { DocumentRow } from "@/components/admin/document-row";
import { DocumentCategory } from "@/generated/prisma";

export const metadata = { title: "Admin · Documents" };
export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

export default async function AdminDocumentsPage() {
  const documents = await db.document.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  const rows = documents.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    createdAt: NZ_DATE.format(d.createdAt),
    downloadUrl: `/api/documents/${d.id}`,
  }));

  const grouped = new Map<DocumentCategory, typeof rows>();
  for (const r of rows) {
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }

  const totalSize = documents.reduce((s, d) => s + d.sizeBytes, 0);

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="eyebrow">Admin · Resources</p>
          <h1 className="display mt-2 text-3xl font-bold leading-tight md:text-4xl">
            Volunteer library
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-foreground/70">
            Anything you upload here shows up for volunteers on the resources
            page. Keep titles descriptive so people can find what they need.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-1">
            <h2 className="display mb-3 text-lg font-semibold">
              Upload a document
            </h2>
            <DocumentUploadCard />
          </section>

          <section className="lg:col-span-2">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="display text-lg font-semibold">
                Current documents
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                {documents.length} files ·{" "}
                {(totalSize / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-cream-deep/50 p-10 text-center text-sm text-foreground/65">
                Nothing uploaded yet. Drop the volunteer handbook on the left
                to get started.
              </div>
            ) : (
              <div className="space-y-6">
                {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((c) => (
                  <div key={c}>
                    <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                      {CATEGORY_LABELS[c]}
                    </h3>
                    <div className="space-y-2">
                      {grouped.get(c)!.map((d) => (
                        <DocumentRow key={d.id} {...d} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
