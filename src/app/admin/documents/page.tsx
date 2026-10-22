import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "@/lib/documents";
import { DocumentUploadCard } from "@/components/admin/document-upload-card";
import { DocumentRow } from "@/components/admin/document-row";
import { DocumentCategory } from "@/generated/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { countOf } from "@/lib/format";

export const metadata = { title: "Documents · Admin" };
export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

export default async function AdminDocumentsPage() {
  await requireAdmin();
  const documents = await db.document.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  const rows = documents.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    visibility: d.visibility,
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
        <AdminPageHeader
          eyebrow="Resources"
          title="Volunteer library"
          description="Public and volunteer files appear on the resources page; admin-only files stay here. You choose who can see each one when you upload it, and can change it later with Edit. Keep titles descriptive so people can find what they need."
        />

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
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                {countOf(documents.length, "file")} ·{" "}
                {(totalSize / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>

            {documents.length === 0 ? (
              <EmptyState>
                Nothing uploaded yet. Drop the volunteer handbook into the
                upload box to get started.
              </EmptyState>
            ) : (
              <div className="space-y-6">
                {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((c) => (
                  <div key={c}>
                    <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground/70">
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
