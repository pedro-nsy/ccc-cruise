import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const SAFE = /^[A-HJ-NP-Z2-9-]+$/i;

function normalize(code: string) {
  return (code || "").trim().toUpperCase();
}

function typeFromCode(code: string): "early_bird" | "artist" | "staff" | null {
  if (/^EL[A-HJ-NP-Z2-9]{2}-[A-HJ-NP-Z2-9]{3}B$/.test(code)) return "early_bird";
  if (/^AR[A-HJ-NP-Z2-9]{2}-[A-HJ-NP-Z2-9]{3}T$/.test(code)) return "artist";
  if (/^ST[A-HJ-NP-Z2-9]{2}-[A-HJ-NP-Z2-9]{3}F$/.test(code)) return "staff";
  return null;
}

export async function POST(req: NextRequest) {
  const ref = req.cookies.get("ccc_ref")?.value;
  if (!ref) return NextResponse.json({ ok: false, error: "MISSING_REF" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const raw = typeof body?.code === "string" ? body.code : "";
  const idx = Number.isInteger(body?.travelerIdx) ? body.travelerIdx : NaN;

  const code = normalize(raw);
  if (!code || !SAFE.test(code)) {
    return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
  }
  if (!Number.isInteger(idx)) {
    return NextResponse.json({ ok: false, error: "INVALID_TRAVELER_IDX" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // Traveler
  const { data: traveler, error: tErr } = await supabase
    .from("travelers")
    .select("id, idx, promo_code_id")
    .eq("booking_ref", ref)
    .eq("idx", idx)
    .single();
  if (tErr || !traveler) return NextResponse.json({ ok: false, error: "TRAVELER_NOT_FOUND" }, { status: 404 });

  // Promo code
  const { data: promo, error: pErr } = await supabase
    .from("promo_codes")
    .select("id, code, type, status, expires_at")
    .eq("code", code)
    .single();
  if (pErr || !promo) return NextResponse.json({ ok: false, error: "CODE_NOT_FOUND" }, { status: 404 });
  if (promo.status !== "active") return NextResponse.json({ ok: false, error: "CODE_DISABLED" }, { status: 400 });
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: "CODE_EXPIRED" }, { status: 400 });
  }

  // Is it already taken by someone else? (reserved or consumed)
  const { data: activeUse, error: aErr } = await supabase
    .from("promo_usages")
    .select("id, booking_ref, traveler_id, status")
    .eq("promo_code_id", promo.id)
    .in("status", ["reserved", "consumed"])
    .maybeSingle();

  if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });
  if (activeUse && (activeUse.booking_ref !== ref || activeUse.traveler_id !== traveler.id)) {
    return NextResponse.json({ ok: false, error: "CODE_ALREADY_USED" }, { status: 409 });
  }

  // If traveler already has a different reserved code, release it
  if (traveler.promo_code_id && traveler.promo_code_id !== promo.id) {
    await supabase
      .from("promo_usages")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("traveler_id", traveler.id)
      .eq("booking_ref", ref)
      .eq("status", "reserved");
  }

  // Reserve or refresh reservation (idempotent if same traveler already has it)
  if (activeUse && activeUse.booking_ref === ref && activeUse.traveler_id === traveler.id && activeUse.status === "reserved") {
    // refresh TTL
    const { error: rErr } = await supabase
      .from("promo_usages")
      .update({ reserved_at: new Date().toISOString() })
      .eq("id", activeUse.id);
    if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 });
  } else {
    // attempt to reserve (unique partial index will block contested codes)
    const { error: iErr } = await supabase
      .from("promo_usages")
      .insert({
        promo_code_id: promo.id,
        booking_ref: ref,
        traveler_id: traveler.id,
        status: "reserved",
        reserved_at: new Date().toISOString(),
      });
    if (iErr) {
      // likely unique violation -> someone else grabbed it
      return NextResponse.json({ ok: false, error: "CODE_ALREADY_USED" }, { status: 409 });
    }
  }

  // Attach to traveler
  const { error: tUpErr } = await supabase
    .from("travelers")
    .update({ promo_code_id: promo.id })
    .eq("id", traveler.id);
  if (tUpErr) return NextResponse.json({ ok: false, error: tUpErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, code: promo.code, type: promo.type }, { status: 200 });
}
