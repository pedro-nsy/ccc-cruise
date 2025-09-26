import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { ADMIN_COOKIE_NAME, verify as verifyAdminCookie } from "@/lib/adminSession";

export type AdminUser = { id: string; email: string };

export async function requireAdmin(req: NextRequest): Promise<{ user: AdminUser } | { error: NextResponse }> {
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  const supabase = supabaseServer();

  // --- 1) Try Supabase Bearer first (current behavior) ---
  if (m) {
    const accessToken = m[1];
    const { data: userRes, error: uErr } = await supabase.auth.getUser(accessToken);
    if (!uErr && userRes?.user?.email) {
      const email = userRes.user.email.toLowerCase();
      // Allow if app_metadata.role === 'admin'
      const role = (userRes.user.app_metadata as any)?.role;
      if (role === "admin") return { user: { id: userRes.user.id, email } };

      // Or if email is on the admins allowlist
      const { data: row, error: aErr } = await supabase
        .from("admins")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (!aErr && row) return { user: { id: userRes.user.id, email } };
      // fallthrough to cookie check below
    }
    // If Bearer provided but invalid/not admin → we still attempt cookie next
  }

  // --- 2) Cookie-based admin (Option 1) ---
  try {
    const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const sessionId = verifyAdminCookie(cookieVal || "");
    if (sessionId) {
      // Treat signed cookie as admin proof (you gate issuance elsewhere)
      return { user: { id: `cookie:${sessionId}`, email: "admin@local" } };
    }
  } catch (e) {
    // ignore and fall through
  }

  // No valid bearer and no valid cookie
  return { error: NextResponse.json({ ok: false, error: "NO_TOKEN" }, { status: 401 }) };
}
