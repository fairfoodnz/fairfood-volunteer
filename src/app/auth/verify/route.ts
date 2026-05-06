import { NextResponse, type NextRequest } from "next/server";
import { verifyLoginToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const next = req.nextUrl.searchParams.get("next") ?? "/me";

  if (token) {
    const userId = await verifyLoginToken(token);
    if (userId) return NextResponse.redirect(new URL(next, req.url));
  }

  const failureUrl = new URL("/auth/sign-in", req.url);
  failureUrl.searchParams.set("error", "expired");
  return NextResponse.redirect(failureUrl);
}
