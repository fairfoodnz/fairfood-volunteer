import "server-only";
import { redirect } from "next/navigation";
import { createSession, currentUser, postAuthDestination } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import {
  GOOGLE_PROVIDER,
  OAuthError,
  completeGoogleAuthorization,
  type GoogleIdentity,
} from "@/lib/oauth";

export const dynamic = "force-dynamic";

/** Stable `?error=` codes the sign-in / security pages know how to render. */
function signInError(reason: string) {
  if (reason === "access_denied") return "google_cancelled";
  if (reason === "email_unverified") return "google_unverified";
  return "google_failed";
}

/**
 * Resolve the Google identity to a session and return where to send the
 * browser. Two modes, decided by whether a session already exists:
 *
 *  - **Connect** (signed in): link this Google identity to the current
 *    account, unless that identity already belongs to someone else.
 *  - **Sign in / sign up** (anonymous): match on the stable Google `sub`;
 *    else auto-link to an existing account *iff* Google has verified the
 *    email (per product decision); else create a fresh account.
 */
async function resolveDestination(
  identity: GoogleIdentity,
  next: string | null,
): Promise<string> {
  const linked = await db.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: GOOGLE_PROVIDER,
        providerAccountId: identity.sub,
      },
    },
  });

  const sessionUser = await currentUser();

  // ---- Connect flow: someone already signed in is linking Google. ----
  if (sessionUser) {
    if (linked && linked.userId !== sessionUser.id) {
      return "/me/security?error=google_taken";
    }
    if (!linked) {
      const hasGoogle = await db.oAuthAccount.count({
        where: { userId: sessionUser.id, provider: GOOGLE_PROVIDER },
      });
      if (hasGoogle > 0) return "/me/security?error=google_exists";
      await db.oAuthAccount.create({
        data: {
          userId: sessionUser.id,
          provider: GOOGLE_PROVIDER,
          providerAccountId: identity.sub,
        },
      });
    }
    return "/me/security?connected=google";
  }

  // ---- Returning Google user: deterministic match on the subject id. ----
  if (linked) {
    const user = await db.user.findUnique({ where: { id: linked.userId } });
    if (!user) throw new OAuthError("orphaned_link");
    await createSession(user.id);
    return postAuthDestination(user, next);
  }

  // ---- First time we've seen this Google identity. ----
  const byEmail = await db.user.findUnique({
    where: { email: identity.email },
  });
  if (byEmail) {
    // Only auto-link when Google vouches for the email — otherwise a Google
    // account with an unverified address could seize a password account.
    if (!identity.emailVerified) throw new OAuthError("email_unverified");
    await db.oAuthAccount.create({
      data: {
        userId: byEmail.id,
        provider: GOOGLE_PROVIDER,
        providerAccountId: identity.sub,
      },
    });
    // A verified Google email also proves inbox control — verify if it wasn't.
    if (!byEmail.emailVerifiedAt) {
      await db.user.update({
        where: { id: byEmail.id },
        data: { emailVerifiedAt: new Date() },
      });
    }
    await createSession(byEmail.id);
    return postAuthDestination(byEmail, next);
  }

  // Brand-new account. No password — they can add one later via reset.
  const created = await db.user.create({
    data: {
      email: identity.email,
      name: identity.name ?? identity.email.split("@")[0],
      emailVerifiedAt: identity.emailVerified ? new Date() : null,
      oauthAccounts: {
        create: {
          provider: GOOGLE_PROVIDER,
          providerAccountId: identity.sub,
        },
      },
    },
  });
  if (identity.emailVerified) {
    try {
      await sendWelcomeEmail({
        to: created.email,
        userName: created.name.split(" ")[0] || undefined,
      });
    } catch (err) {
      console.error("[google-oauth] welcome email failed", err);
    }
  }
  await createSession(created.id);
  // New account has no profileCompletedAt → routed to the questionnaire.
  return postAuthDestination(created, next);
}

export async function GET(req: Request) {
  let destination: string;
  try {
    const { identity, next } = await completeGoogleAuthorization(
      new URL(req.url).searchParams,
    );
    destination = await resolveDestination(identity, next);
  } catch (err) {
    const reason = err instanceof OAuthError ? err.reason : "unknown";
    console.error("[google-oauth] callback failed", reason, err);
    redirect(`/auth/sign-in?error=${signInError(reason)}`);
  }
  redirect(destination);
}
