import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = { title: "Profile · Fair Food Volunteer" };
export const dynamic = "force-dynamic";

const ProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  pronouns: z.string().trim().max(40).optional(),
  emergencyName: z.string().trim().max(120).optional(),
  emergencyPhone: z.string().trim().max(40).optional(),
  accessNeeds: z.string().trim().max(2000).optional(),
});

async function saveProfile(formData: FormData) {
  "use server";
  const user = await requireUser();
  const data = ProfileSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    phone: formData.get("phone") || undefined,
    pronouns: formData.get("pronouns") || undefined,
    emergencyName: formData.get("emergencyName") || undefined,
    emergencyPhone: formData.get("emergencyPhone") || undefined,
    accessNeeds: formData.get("accessNeeds") || undefined,
  });
  // Empty last name clears the column (mononym) rather than leaving the old value.
  await db.user.update({
    where: { id: user.id },
    data: { ...data, lastName: data.lastName ?? null },
  });
  revalidatePath("/me/profile");
  revalidatePath("/me");
}

export default async function ProfilePage() {
  const user = await requireUser();
  const fresh = await db.user.findUnique({ where: { id: user.id } });

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

          <form action={saveProfile} className="mt-10 space-y-8">
            <Card title="The basics">
              <Field
                label="First name"
                name="firstName"
                defaultValue={fresh?.firstName}
                required
              />
              <Field
                label="Last name"
                name="lastName"
                defaultValue={fresh?.lastName ?? ""}
              />
              <Field label="Email" value={fresh?.email} disabled />
              <Field label="Phone" name="phone" defaultValue={fresh?.phone ?? ""} />
              <Field
                label="Pronouns"
                name="pronouns"
                defaultValue={fresh?.pronouns ?? ""}
                placeholder="e.g. she/they"
              />
            </Card>

            <Card title="Emergency contact">
              <Field
                label="Name"
                name="emergencyName"
                defaultValue={fresh?.emergencyName ?? ""}
              />
              <Field
                label="Phone"
                name="emergencyPhone"
                defaultValue={fresh?.emergencyPhone ?? ""}
              />
            </Card>

            <Card title="Access needs">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="accessNeeds">
                  Anything we can do to make your shifts easier?
                </Label>
                <Textarea
                  id="accessNeeds"
                  name="accessNeeds"
                  rows={4}
                  placeholder="Mobility, sensory, support person, anything else."
                  defaultValue={fresh?.accessNeeds ?? ""}
                />
              </div>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg" className="bg-leaf hover:bg-leaf-deep">
                Save profile
              </Button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card p-6 md:p-8">
      <h2 className="display mb-5 text-xl font-semibold">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  value,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="h-11"
      />
    </div>
  );
}
