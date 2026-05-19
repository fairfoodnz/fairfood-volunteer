"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { HeardAbout } from "@/generated/prisma";
import { getPostHogClient } from "@/lib/posthog-server";

const HeardAboutValues = [
  HeardAbout.FRIEND,
  HeardAbout.SOCIAL,
  HeardAbout.SEARCH,
  HeardAbout.WORKPLACE,
  HeardAbout.EVENT,
  HeardAbout.OTHER,
] as const;

// Birthdays in the last 120 years and at least 13 years ago (we don't roster <13s).
const MIN_AGE_YEARS = 13;
const MAX_AGE_YEARS = 120;
const today = () => new Date();
const earliestBirthday = () => {
  const d = today();
  d.setFullYear(d.getFullYear() - MAX_AGE_YEARS);
  return d;
};
const latestBirthday = () => {
  const d = today();
  d.setFullYear(d.getFullYear() - MIN_AGE_YEARS);
  return d;
};

const QuestionnaireSchema = z
  .object({
    phone: z.string().trim().min(6, "Please add a phone we can reach you on.").max(40),
    birthday: z.coerce
      .date({ message: "Pick the date you were born." })
      .refine((d) => d >= earliestBirthday(), "That birthday looks too far back.")
      .refine((d) => d <= latestBirthday(), "Volunteers need to be at least 13."),
    heardAbout: z.enum(HeardAboutValues, {
      message: "Pick one so we know how you found us.",
    }),
    heardAboutOther: z.string().trim().max(200).optional(),
    whyInterested: z
      .string()
      .trim()
      .min(4, "A sentence or two is plenty.")
      .max(2000),
    arrestHistory: z.enum(["yes", "no"], { message: "Please answer this question." }),
    arrestDetails: z.string().trim().max(2000).optional(),
    healthConditions: z.enum(["yes", "no"], { message: "Please answer this question." }),
    healthDetails: z.string().trim().max(2000).optional(),
    next: z.string().optional(),
  })
  .refine(
    (d) => d.heardAbout !== HeardAbout.OTHER || (d.heardAboutOther ?? "").length > 0,
    {
      message: "Tell us how you heard about us.",
      path: ["heardAboutOther"],
    },
  );

export type QuestionnaireState = {
  error?: string;
  fieldErrors?: Partial<
    Record<
      | "phone"
      | "birthday"
      | "heardAbout"
      | "heardAboutOther"
      | "whyInterested"
      | "arrestHistory"
      | "arrestDetails"
      | "healthConditions"
      | "healthDetails",
      string
    >
  >;
};

function safeNext(next: string | undefined, fallback = "/me") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function completeProfileAction(
  _prev: QuestionnaireState,
  formData: FormData,
): Promise<QuestionnaireState> {
  const user = await requireUser();

  const parsed = QuestionnaireSchema.safeParse({
    phone: formData.get("phone"),
    birthday: formData.get("birthday"),
    heardAbout: formData.get("heardAbout"),
    heardAboutOther: formData.get("heardAboutOther") || undefined,
    whyInterested: formData.get("whyInterested"),
    arrestHistory: formData.get("arrestHistory"),
    arrestDetails: formData.get("arrestDetails") || undefined,
    healthConditions: formData.get("healthConditions"),
    healthDetails: formData.get("healthDetails") || undefined,
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: QuestionnaireState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        typeof key === "string" &&
        !fieldErrors[key as keyof typeof fieldErrors]
      ) {
        fieldErrors[key as keyof typeof fieldErrors] = issue.message;
      }
    }
    return { fieldErrors };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      phone: parsed.data.phone,
      birthday: parsed.data.birthday,
      heardAbout: parsed.data.heardAbout,
      heardAboutOther:
        parsed.data.heardAbout === HeardAbout.OTHER
          ? parsed.data.heardAboutOther
          : null,
      whyInterested: parsed.data.whyInterested,
      arrestHistory: parsed.data.arrestHistory === "yes",
      arrestDetails:
        parsed.data.arrestHistory === "yes"
          ? parsed.data.arrestDetails ?? null
          : null,
      healthConditions: parsed.data.healthConditions === "yes",
      healthDetails:
        parsed.data.healthConditions === "yes"
          ? parsed.data.healthDetails ?? null
          : null,
      profileCompletedAt: new Date(),
      // Reset any prior admin "reviewed" mark since they've just changed their answers.
      flagReviewedAt: null,
    },
  });

  const posthog = getPostHogClient();
  // Google sign-ups create a passwordless account but never fire
  // `sign_up_completed` (email sign-ups fire it at the sign-up form). Treat
  // finishing the onboarding questionnaire as their sign-up completion so a
  // single `sign_up_completed → profile_completed → shift_booked` funnel
  // covers every channel. `user` is the pre-update session row, so a null
  // `profileCompletedAt` means this is the first completion (profile edits
  // don't re-fire it); a null `passwordHash` means a passwordless account —
  // only the Google callback creates those (passkeys require an existing
  // logged-in account), so email sign-ups are never double-counted.
  if (!user.profileCompletedAt && user.passwordHash === null) {
    posthog.capture({
      distinctId: user.id,
      event: "sign_up_completed",
      properties: { method: "google", name: user.name, email: user.email },
    });
  }
  posthog.capture({
    distinctId: user.id,
    event: "profile_completed",
    properties: { heard_about: parsed.data.heardAbout },
  });
  await posthog.flush();

  revalidatePath("/me");
  revalidatePath("/admin/flagged");
  redirect(safeNext(parsed.data.next));
}
