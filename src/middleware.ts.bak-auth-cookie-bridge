import { NextResponse, NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";

// Paths allowed without auth
const PUBLIC_ADMIN_PATHS = new Set<string>([
  "/admin/password",
  "/admin/login",
]);

function isPublicAdminPath(url: URL) {
  const p = url.pathname;
  if (p === "/admin" || p === "/admin/") return false; // gate the index
  // Exact public pages
  if (PUBLIC_ADMIN_PATHS.has(p)) return true;
  // Allow static (_next) and assets
  if (p.startsWith("/_next/")) return true;
  if (p.startsWith("/favicon")) return true;
  if (p.startsWith("/assets/")) return true;
  return false;
}

function hasAdminCookie(req: NextRequest) {
  const v = req.cookies.get(COOKIE_NAME)?.value;
  return !!v;
}

function hasBearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  return /^Bearers+.+/i.test(h);
}

export function middleware(req: NextRequest) {

  const { nextUrl } = req;
  const p = nextUrl.pathname;

  const isAdminPage = p.startsWith("/admin/");
  const isAdminApi  = p.startsWith("/api/admin/");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Public exceptions for pages
  if (isAdminPage && isPublicAdminPath(nextUrl)) {
    return NextResponse.next();
  }

  // Auth checks
  const cookieOk = hasAdminCookie(req);
  const bearerOk = hasBearer(req); // APIs also accept magic-link token

  if (isAdminApi) {
    if (cookieOk || bearerOk) return NextResponse.next();
    // API: respond 401 JSON
    return new NextResponse(JSON.stringify({ ok:false, error:"UNAUTHORIZED" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  } else {
    // Admin page: require cookie
    if (cookieOk) return NextResponse.next();
    // Redirect to password gate
    const url = req.nextUrl.clone();
    url.pathname = "/admin/password";
    url.search = ""; // drop query on redirect
    return NextResponse.redirect(url);
  }
}

// Limit middleware to these paths for performance
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
