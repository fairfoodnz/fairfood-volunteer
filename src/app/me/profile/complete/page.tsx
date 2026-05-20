import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, safeNextPath } from "@/lib/auth";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
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

  const fresh = await db.user.findUnique({ where: { id: user.id } });

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-12 md:py-16">
        <div className="container-x mx-auto max-w-2xl">
          <header className="mb-10 space-y-3">
            <p className="eyebrow text-leaf-deep">
              Kia ora, {user.firstName}
            </p>
            <h1 className="display text-balance text-3xl font-bold leading-tight md:text-4xl">
              Let&rsquo;s get you sorted before your first shift.
            </h1>
            <p className="text-foreground/75">
              Three minutes of paperwork. We use these answers to roster you
              safely and so we know who&rsquo;s coming next time.
            </p>
          </header>

          <div className="rounded-md border border-border bg-card p-6 shadow-sm md:p-8">
            <QuestionnaireForm
              defaults={{
                phone: fresh?.phone ?? "",
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
              next={next}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
