import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req);
  if ("error" in gate) return gate.error;

  const body = await req.json().catch(() => ({}));
  const status = (body?.status || "").toLowerCase();
  if (!["active","disabled"].includes(status)) {
    return NextResponse.json({ ok: false, error: "INVALID_STATUS" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("promo_codes").update({ status }).eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
