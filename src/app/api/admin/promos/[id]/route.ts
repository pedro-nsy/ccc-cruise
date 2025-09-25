import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * Admin PATCH — only allow toggling "active" <-> "archived".
 * Business rule: a "consumed" code cannot be archived.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Admin gate
  const gate = await requireAdmin(req);
  if ("error" in gate) return gate.error;

  // Parse body safely
  let body: any = {};
  try { body = await req.json(); } catch {}
  const next = String(body?.status ?? "").toLowerCase();

  if (!["active", "archived"].includes(next)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_STATUS", message: 'Status must be "active" or "archived".' },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  // Read current row EXACTLY by id (string works for uuid or bigint)
  const { data: row, error: fetchErr } = await supabase
    .from("promo_codes")
    .select("id, status")
    .eq("id", params.id)
    .single();

  if (fetchErr) {
    return NextResponse.json(
      { ok: false, error: "FETCH_FAILED", message: fetchErr.message },
      { status: 500 }
    );
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // Guard: consumed cannot be archived
  if (next === "archived" && row.status === "consumed") {
    return NextResponse.json(
      { ok: false, error: "CANNOT_ARCHIVE_CONSUMED", message: "This code has been consumed and cannot be archived." },
      { status: 409 }
    );
  }

  // Update and return 404 if nothing changed (id mismatch)
  const { data: upd, error: updErr } = await supabase
    .from("promo_codes")
    .update({ status: next })
    .eq("id", params.id)
    .select("id")
    .single();

  if (updErr) {
    return NextResponse.json(
      { ok: false, error: "UPDATE_FAILED", message: updErr.message },
      { status: 500 }
    );
  }

  if (!upd) {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND", message: "No row updated (id mismatch)." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
