import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const ref = req.cookies.get("ccc_ref")?.value;
  if (!ref) return NextResponse.json({ ok: false, error: "MISSING_REF" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const idx = Number.isInteger(body?.travelerIdx) ? body.travelerIdx : NaN;
  if (!Number.isInteger(idx)) {
    return NextResponse.json({ ok: false, error: "INVALID_TRAVELER_IDX" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: traveler, error: tErr } = await supabase
    .from("travelers")
    .select("id, promo_code_id")
    .eq("booking_ref", ref)
    .eq("idx", idx)
    .single();
  if (tErr || !traveler) return NextResponse.json({ ok: false, error: "TRAVELER_NOT_FOUND" }, { status: 404 });

  if (!traveler.promo_code_id) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Only release if still reserved; consumed codes remain tied
  await supabase
    .from("promo_usages")
    .update({ status: "released", released_at: new Date().toISOString() })
    .eq("promo_code_id", traveler.promo_code_id)
    .eq("booking_ref", ref)
    .eq("traveler_id", traveler.id)
    .eq("status", "reserved");

  const { error: tUpErr } = await supabase
    .from("travelers")
    .update({ promo_code_id: null })
    .eq("id", traveler.id);
  if (tUpErr) return NextResponse.json({ ok: false, error: tUpErr.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
