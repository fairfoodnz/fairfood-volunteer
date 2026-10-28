import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fullName } from "@/lib/users";
import {
  COPY_SECTIONS,
  SITE_COPY,
  SITE_COPY_KEYS,
  getSiteCopy,
  getSiteCopyOverrides,
} from "@/lib/site-copy";
import { EnglishRequirementNote } from "@/components/site/english-requirement-note";
import { SiteCopyForm, type CopySectionView } from "./form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata = { title: "Volunteer wording · Admin" };
export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [overrides, copy, lastEdit] = await Promise.all([
    getSiteCopyOverrides(),
    getSiteCopy(),
    db.siteSetting.findFirst({
      where: { key: { in: SITE_COPY_KEYS } },
      orderBy: { updatedAt: "desc" },
      select: {
        updatedAt: true,
        updatedBy: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const sections: CopySectionView[] = COPY_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    fields: SITE_COPY_KEYS.filter(
      (key) => SITE_COPY[key].section === section.id,
    ).map((key) => ({
      key,
      label: SITE_COPY[key].label,
      help: SITE_COPY[key].help,
      multiline: SITE_COPY[key].multiline,
      maxLength: SITE_COPY[key].maxLength,
      fallback: SITE_COPY[key].fallback,
      value: overrides[key] ?? "",
    })),
  }));

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <AdminPageHeader
          eyebrow="Settings"
          title="Volunteer wording"
          description={
            <>
              Reword what volunteers read on the sign-up questionnaire, their
              profile, shift pages and booking emails — no developer needed.
              Changes are live as soon as you save.
              {lastEdit && (
                <span className="mt-2 block font-mono text-[11px] uppercase tracking-widest text-foreground/70">
                  Last edited {NZ_DATE.format(lastEdit.updatedAt)}
                  {lastEdit.updatedBy && ` by ${fullName(lastEdit.updatedBy)}`}
                </span>
              )}
            </>
          }
        />

        <SiteCopyForm sections={sections} />

        <section className="mt-12">
          <h2 className="display text-xl font-semibold">
            What volunteers see right now
          </h2>
          <p className="mt-1.5 text-sm text-foreground/70">
            The saved version of the note, exactly as it appears on the
            questionnaire and profile page.
          </p>
          <EnglishRequirementNote
            className="mt-4"
            title={copy.englishRequirementTitle}
            body={copy.englishRequirementBody}
          />
        </section>
      </div>
    </div>
  );
}
