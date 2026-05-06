import "server-only";
import { cookies } from "next/headers";
import { randomBytes, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "./db";
import type { User } from "@/generated/prisma";

const SESSION_COOKIE = "ff_session";
const SESSION_LENGTH_DAYS = 30;
const LOGIN_TOKEN_LENGTH_MINUTES = 15;

function token() {
  return randomBytes(32).toString("hex");
}

export async function startSignIn(email: string, name?: string) {
  const lower = email.trim().toLowerCase();
  const user = await db.user.upsert({
    where: { email: lower },
    update: name ? { name } : {},
    create: { email: lower, name: name ?? lower.split("@")[0] },
  });

  const t = token();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_LENGTH_MINUTES * 60_000);
  await db.loginToken.create({
    data: { token: t, userId: user.id, expiresAt },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${base}/auth/verify?token=${t}`;
  // In a real deploy, send via Postmark / Resend / SES.
  console.log(`\n🔗 Magic link for ${lower}:\n   ${link}\n`);
  return { link, userId: user.id };
}

export async function verifyLoginToken(rawToken: string) {
  const found = await db.loginToken.findUnique({ where: { token: rawToken } });
  if (!found) return null;
  if (found.usedAt) return null;
  if (found.expiresAt < new Date()) return null;

  await db.loginToken.update({
    where: { id: found.id },
    data: { usedAt: new Date() },
  });

  const sessionToken = token();
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_DAYS * 24 * 60 * 60_000);
  await db.session.create({
    data: { token: sessionToken, userId: found.userId, expiresAt, id: randomUUID() },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  return found.userId;
}

export async function currentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const t = cookieStore.get(SESSION_COOKIE)?.value;
  if (!t) return null;
  const session = await db.session.findUnique({
    where: { token: t },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  return session.user;
}

export async function signOut() {
  const cookieStore = await cookies();
  const t = cookieStore.get(SESSION_COOKIE)?.value;
  if (t) {
    await db.session.deleteMany({ where: { token: t } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireUser(redirectTo: string = "/auth/sign-in") {
  const user = await currentUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/auth/sign-in");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
