import { FileText, Image as ImageIcon, Map as MapIcon } from "lucide-react";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatBytes,
} from "@/lib/documents";
import { DocumentCategory } from "@/generated/prisma";

export const metadata = {
  title: "Volunteer kete · Fair Food",
  description:
    "Handbooks, health & safety, and what to know before your first Fair Food shift.",
};
export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

type ResourceCard = {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  mimeType: string;
  sizeBytes: number;
  updatedAt: Date;
  downloadUrl: string;
};

function CategoryGlyph({
  category,
  mimeType,
  className,
}: {
  category: DocumentCategory;
  mimeType: string;
  className?: string;
}) {
  if (category === "GETTING_HERE")
    return <MapIcon className={className} aria-hidden />;
  if (mimeType.startsWith("image/"))
    return <ImageIcon className={className} aria-hidden />;
  return <FileText className={className} aria-hidden />;
}

function shortType(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return mime.slice(6).toUpperCase();
  if (mime.includes("wordprocessingml")) return "DOCX";
  if (mime === "application/msword") return "DOC";
  if (mime.includes("spreadsheetml")) return "XLSX";
  if (mime === "application/vnd.ms-excel") return "XLS";
  if (mime === "text/plain") return "TXT";
  return mime.split("/").pop()?.toUpperCase() ?? "FILE";
}

export default async function ResourcesPage() {
  // /resources is a public/volunteer-facing surface. Anonymous visitors see
  // only PUBLIC documents — VOLUNTEER titles and descriptions stay behind
  // sign-in (the metadata can be informative on its own, not just the
  // download URL). Signed-in users see PUBLIC + VOLUNTEER. ADMIN docs never
  // appear here regardless of role; admins manage those at /admin/documents.
  // The /api/documents/[id] route is the authoritative ACL — this is the
  // listing surface only.
  const user = await currentUser();
  const documents = await db.document.findMany({
    where: {
      deletedAt: null,
      visibility: user ? { in: ["PUBLIC", "VOLUNTEER"] } : "PUBLIC",
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  const cards: ResourceCard[] = documents.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    updatedAt: d.updatedAt,
    downloadUrl: `/api/documents/${d.id}`,
  }));

  const grouped = new Map<DocumentCategory, ResourceCard[]>();
  for (const c of cards) {
    const list = grouped.get(c.category) ?? [];
    list.push(c);
    grouped.set(c.category, list);
  }

  return (
    <>
      <SiteNav />
      <main className="container-x flex-1 py-16 md:py-20">
        <header className="max-w-2xl">
        <p className="eyebrow">Volunteer kete</p>
        <h1 className="display mt-3 text-4xl font-bold leading-tight md:text-5xl">
          Things to read before you come in.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground/75">
          A small library to help you settle into a shift — what to wear, where
          the kitchen is, how we keep each other safe. Updated whenever the
          coordinators have something new to share.
        </p>
      </header>

      {documents.length === 0 ? (
        <div className="mt-12 rounded-md border border-dashed border-border bg-cream-deep/50 p-12 text-center">
          <p className="text-sm text-foreground/65">
            The team is still putting the kete together — check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-12 space-y-12">
          {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((c) => (
            <section key={c}>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-8 bg-foreground/25" />
                <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/65">
                  {CATEGORY_LABELS[c]}
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {grouped.get(c)!.map((card) => (
                  <ResourceCardArticle key={card.id} card={card} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      </main>
      <SiteFooter />
    </>
  );
}

function ResourceCardArticle({ card }: { card: ResourceCard }) {
  const sizeMb = (card.sizeBytes / (1024 * 1024)).toFixed(1);
  const ariaLabel = `Download ${card.title}, ${shortType(card.mimeType)}, ${sizeMb} megabytes`;
  return (
    <article className="group flex gap-4 rounded-md border border-border bg-card p-5 transition-colors hover:border-leaf/40">
      <CategoryGlyph
        category={card.category}
        mimeType={card.mimeType}
        className="mt-0.5 size-8 shrink-0 text-leaf-deep"
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold leading-snug">{card.title}</h3>
        <p className="mt-1 font-mono text-xs text-foreground/55">
          {shortType(card.mimeType)} · {formatBytes(card.sizeBytes)} · Updated{" "}
          {NZ_DATE.format(card.updatedAt)}
        </p>
        {card.description && (
          <p className="mt-2 text-sm leading-relaxed text-foreground/75">
            {card.description}
          </p>
        )}
        <a
          href={card.downloadUrl}
          target="_blank"
          rel="noopener"
          aria-label={ariaLabel}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-leaf-deep transition-colors hover:text-leaf"
        >
          Download {shortType(card.mimeType)}
          <span aria-hidden>→</span>
        </a>
      </div>
    </article>
  );
}
