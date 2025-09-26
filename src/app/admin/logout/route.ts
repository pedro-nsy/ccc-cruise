import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/adminSession";

export async function GET(req: NextRequest) {
  // Build redirect to the password gate
  const url = new URL("/admin/password", req.nextUrl.origin);
  const res = NextResponse.redirect(url, { status: 307 });
  // Clear the admin session cookie
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
