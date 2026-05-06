"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { startSignIn, signOut } from "@/lib/auth";

const SignInSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).optional(),
});

export type SignInState = {
  ok?: boolean;
  error?: string;
  link?: string;
};

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please enter a valid email." };
  }
  const { link } = await startSignIn(parsed.data.email, parsed.data.name);
  return {
    ok: true,
    // Surface the dev magic link in the UI so reviewers can click through without email infra.
    link: process.env.NODE_ENV === "production" ? undefined : link,
  };
}

export async function signOutAction() {
  await signOut();
  redirect("/");
}
