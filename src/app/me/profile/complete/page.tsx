import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, safeNextPath } from "@/lib/auth";
import { SiteNav } from "@/components/site/nav";
import { PageHeader } from "@/components/patterns/page-header";
import { SiteFooter } from "@/components/site/footer";
import { hasEnglishName, isEnglishName } from "@/lib/users";
import { getSiteCopy } from "@/lib/site-copy";
import { EnglishRequirementNote } from "@/components/site/english-requirement-note";
import { QuestionnaireForm } from "./form";

export const metadata = { title: "Welcome · Fair Food Volunteer" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function CompleteProfilePage({ searchParams }: Props) {
  const user = await requireUser();
  const { next } = await searchParams;

  // Already done — let them edit details on the proper profile page instead.
  if (user.profileCompletedAt) {
    redirect(safeNextPath(next, "/me/profile"));
  }

  const [fresh, copy] = await Promise.all([
    db.user.findUnique({ where: { id: user.id } }),
    getSiteCopy(),
  ]);
  const needsName = !hasEnglishName(user);

  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1 py-12 md:py-16">
        <div className="container-x mx-auto max-w-2xl">
          <PageHeader
            eyebrow={needsName ? "Kia ora" : `Kia ora, ${user.firstName}`}
            title="Let’s get you sorted before your first shift."
            lead="Three minutes of paperwork. We use these answers to roster you safely and so we know who’s coming next time."
          />

          <EnglishRequirementNote
            className="mb-8"
            title={copy.englishRequirementTitle}
            body={copy.englishRequirementBody}
          />

          <div className="rounded-md border border-border bg-card p-6 shadow-sm md:p-8">
            <QuestionnaireForm
              copy={{
                firstTimeQuestion: copy.firstTimeQuestion,
                firstTimeHelper: copy.firstTimeHelper,
              }}
              defaults={{
                phone: fresh?.phone ?? "",
                volunteeredBefore:
                  fresh?.volunteeredBefore === true
                    ? "yes"
                    : fresh?.volunteeredBefore === false
                      ? "no"
                      : "",
                birthday: fresh?.birthday
                  ? fresh.birthday.toISOString().slice(0, 10)
                  : "",
                heardAbout: fresh?.heardAbout ?? "",
                heardAboutOther: fresh?.heardAboutOther ?? "",
                whyInterested: fresh?.whyInterested ?? "",
                arrestHistory:
                  fresh?.arrestHistory === true
                    ? "yes"
                    : fresh?.arrestHistory === false
                      ? "no"
                      : "",
                arrestDetails: fresh?.arrestDetails ?? "",
                healthConditions:
                  fresh?.healthConditions === true
                    ? "yes"
                    : fresh?.healthConditions === false
                      ? "no"
                      : "",
                healthDetails: fresh?.healthDetails ?? "",
              }}
              name={
                needsName
                  ? {
                      // Keep whichever part already passes; blank the rest.
                      firstName: isEnglishName(user.firstName) ? user.firstName : "",
                      lastName:
                        user.lastName && isEnglishName(user.lastName)
                          ? user.lastName
                          : "",
                    }
                  : undefined
              }
              next={next}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
