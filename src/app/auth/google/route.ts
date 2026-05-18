import "server-only";
import { redirect } from "next/navigation";
import { googleConfigured, startGoogleAuthorization } from "@/lib/oauth";

// The state/PKCE cookies are set per request — never prerender or cache.
export const dynamic = "force-dynamic";

/**
 * Entry point for "Continue with Google" (sign-in/up) and "Connect Google"
 * (/me/security). Both land here; the callback decides login vs. link based on
 * whether there's already a session. `next` is carried through a cookie.
 */
export async function GET(req: Request) {
  if (!googleConfigured()) {
    redirect("/auth/sign-in?error=google_unavailable");
  }
  const next = new URL(req.url).searchParams.get("next");
  const authUrl = await startGoogleAuthorization(next);
  redirect(authUrl.toString());
}
