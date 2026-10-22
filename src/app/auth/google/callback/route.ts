import "server-only";
import { redirect } from "next/navigation";
import { createSession, currentUser, postAuthDestination } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { isImpersonating } from "@/lib/impersonation";
import {
  GOOGLE_PROVIDER,
  OAuthError,
  completeGoogleAuthorization,
  type GoogleIdentity,
} from "@/lib/oauth";
import { getPostHogClient } from "@/lib/posthog-server";

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
    // An admin impersonating a volunteer must not be able to attach their own
    // Google account and keep signing in as the volunteer afterwards.
    if (await isImpersonating()) return "/me/security?error=impersonating";
    if (linked && linked.userId !== sessionUser.id) {
      return "/me/security?error=google_taken";
    }
    if (!linked) {
      // Same reasoning as passkeys: an unverified account may belong to
      // someone squatting on another person's email, and a Google link would
      // let them keep a way in after the real owner claims the address.
      if (!sessionUser.emailVerifiedAt) {
        return "/me/security?error=google_verify_email";
      }
      const hasGoogle = await db.oAuthAccount.count({
        where: { userId: sessionUser.id, provider: GOOGLE_PROVIDER },
      });
      if (hasGoogle > 0) return "/me/security?error=google_exists";
      try {
        await db.oAuthAccount.create({
          data: {
            userId: sessionUser.id,
            provider: GOOGLE_PROVIDER,
            providerAccountId: identity.sub,
          },
        });
      } catch (err) {
        // Lost a concurrent connect race — the @@unique constraints are the
        // backstop. Re-derive the right message instead of 500ing.
        if (!(err instanceof Error && err.message.includes("Unique"))) throw err;
        const now = await db.oAuthAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: GOOGLE_PROVIDER,
              providerAccountId: identity.sub,
            },
          },
        });
        if (now && now.userId !== sessionUser.id) {
          return "/me/security?error=google_taken";
        }
        return "/me/security?error=google_exists";
      }
    }
    return "/me/security?connected=google";
  }

  // ---- Returning Google user: deterministic match on the subject id. ----
  if (linked) {
    const user = await db.user.findUnique({ where: { id: linked.userId } });
    if (!user) throw new OAuthError("orphaned_link");
    await createSession(user.id);
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "google_sign_in",
      properties: { is_new_user: false },
    });
    await posthog.flush();
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
    // Link + (if needed) mark the email verified in one atomic step so an
    // interruption can't leave the account half-linked. A verified Google
    // email also proves inbox control, hence the emailVerifiedAt backfill.
    //
    // If the account was never verified, whoever created it never proved they
    // own this inbox — it may be someone who signed up with this address ahead
    // of the real owner. The Google user has just proved ownership, so drop
    // every sign-in method and session the earlier registrant could have set
    // up before handing the account over.
    const unverified = !byEmail.emailVerifiedAt;
    await db.$transaction([
      ...(unverified
        ? [
            db.session.deleteMany({ where: { userId: byEmail.id } }),
            db.passkey.deleteMany({ where: { userId: byEmail.id } }),
            db.oAuthAccount.deleteMany({ where: { userId: byEmail.id } }),
            db.user.update({
              where: { id: byEmail.id },
              data: { passwordHash: null, emailVerifiedAt: new Date() },
            }),
          ]
        : []),
      db.oAuthAccount.create({
        data: {
          userId: byEmail.id,
          provider: GOOGLE_PROVIDER,
          providerAccountId: identity.sub,
        },
      }),
    ]);
    await createSession(byEmail.id);
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: byEmail.id,
      event: "google_sign_in",
      properties: { is_new_user: false },
    });
    await posthog.flush();
    return postAuthDestination(byEmail, next);
  }

  // Brand-new account. No password — they can add one later via reset.
  const created = await db.user.create({
    data: {
      email: identity.email,
      firstName: identity.firstName || identity.email.split("@")[0],
      lastName: identity.lastName || null,
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
        userId: created.id,
        userName: created.firstName || undefined,
      });
    } catch (err) {
      console.error("[google-oauth] welcome email failed", err);
    }
  }
  await createSession(created.id);
  const posthogNew = getPostHogClient();
  posthogNew.capture({
    distinctId: created.id,
    event: "google_sign_in",
    properties: { is_new_user: true },
  });
  await posthogNew.flush();
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
