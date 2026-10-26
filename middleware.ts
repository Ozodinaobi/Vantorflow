// Protects /dashboard: no valid session cookie means a redirect to /login.
// Edge middleware cannot reliably read the server-only service key, so this is only a structural
// and expiry check. The signature is verified in every Node route (requireUser) and by the dashboard
// layout's /api/auth/session call, which sends forged or stale cookies back to /login.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, looksLikeSession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const session = looksLikeSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const res = NextResponse.redirect(url);
    if (req.cookies.has(SESSION_COOKIE)) res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
