import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
export type AdminUser = { id: string; email: string };

export async function requireAdmin(req: NextRequest): Promise<{ user: AdminUser } | { error: NextResponse }> {
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return { error: NextResponse.json({ ok: false, error: "NO_TOKEN" }, { status: 401 }) };
  }
  const accessToken = m[1];

  const supabase = supabaseServer();

  // Verify token -> user
  const { data: userRes, error: uErr } = await supabase.auth.getUser(accessToken);
  if (uErr || !userRes?.user?.email) {
    return { error: NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 401 }) };
  }
  const email = userRes.user.email.toLowerCase();

  // Allow if app_metadata.role === 'admin'
  const role = (userRes.user.app_metadata as any)?.role;
  if (role === "admin") {
    return { user: { id: userRes.user.id, email } };
  }

  // Or if email is on the admins allowlist
  const { data: row, error: aErr } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (aErr || !row) {
    return { error: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }) };
  }

  return { user: { id: userRes.user.id, email } };
}
