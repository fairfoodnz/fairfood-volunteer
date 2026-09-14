import { Languages } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser, safeNextPath } from "@/lib/auth";
import { hasEnglishName } from "@/lib/users";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { ProfileForm } from "./form";

export const metadata = { title: "Profile · Fair Food Volunteer" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function ProfilePage({ searchParams }: Props) {
  const user = await requireUser();
  const { next } = await searchParams;
  const fresh = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const needsEnglishName = !hasEnglishName(fresh);

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-12 md:py-16">
        <div className="container-x max-w-3xl">
          <p className="eyebrow">Kaiāwhina profile</p>
          <h1 className="display mt-2 text-balance text-3xl font-bold leading-tight md:text-4xl">
            Help us know who&rsquo;s coming.
          </h1>
          <p className="mt-3 text-foreground/75">
            We use these details only for shift rosters and to look after you on
            the day. Edit anytime.
          </p>

          {needsEnglishName && (
            <div className="mt-8 flex gap-3 rounded-md border border-tomato/30 bg-tomato/5 px-5 py-4">
              <Languages className="mt-0.5 size-5 shrink-0 text-tomato" aria-hidden />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Please write your name using the English alphabet
                </p>
                <p className="text-sm text-foreground/75">
                  It&rsquo;s how coordinators read the roster and how other
                  volunteers see you on a shift. Update it below
                  {next ? " and we’ll take you back to your booking" : ""}.
                </p>
              </div>
            </div>
          )}

          <ProfileForm
            email={fresh.email}
            next={next ? safeNextPath(next) : undefined}
            defaults={{
              firstName: fresh.firstName,
              lastName: fresh.lastName ?? "",
              phone: fresh.phone ?? "",
              pronouns: fresh.pronouns ?? "",
              emergencyName: fresh.emergencyName ?? "",
              emergencyPhone: fresh.emergencyPhone ?? "",
              accessNeeds: fresh.accessNeeds ?? "",
            }}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
