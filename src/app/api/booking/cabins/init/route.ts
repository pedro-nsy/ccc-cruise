import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type CapsRow = { type: "early_bird" | "artist"; category: "INTERIOR" | "OCEANVIEW" | "BALCONY"; remaining: number };

export async function GET(req: NextRequest) {
  const ref = req.cookies.get("ccc_ref")?.value;
  if (!ref) return NextResponse.json({ ok: false, error: "MISSING_REF" }, { status: 401 });

  const supabase = supabaseServer();

  // lead (group size + any prior selection)
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("adults, minors, minor_ages, status, cabin_category, cabin_layout")
    .eq("booking_ref", ref)
    .single();
  if (leadErr || !lead) return NextResponse.json({ ok: false, error: "LEAD_NOT_FOUND" }, { status: 404 });

  // travelers -> promo type per traveler (for per-booking promo counts)
  const { data: travelersRows, error: tErr } = await supabase
    .from("travelers")
    .select("idx, is_adult, promo_code_id")
    .eq("booking_ref", ref)
    .order("idx", { ascending: true });
  if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });

  const promoIds = (travelersRows ?? []).map(r => r.promo_code_id).filter(Boolean);
  let promoMap: Record<string, { type: "staff" | "artist" | "early_bird" }> = {};
  if (promoIds.length) {
    const { data: promos, error: pErr } = await supabase
      .from("promo_codes")
      .select("id, type")
      .in("id", promoIds as any[]);
    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
    for (const p of promos ?? []) promoMap[String((p as any).id)] = { type: (p as any).type };
  }

  const travelers = (travelersRows ?? []).map(r => ({
    idx: r.idx,
    is_adult: r.is_adult,
    promo: r.promo_code_id ? (promoMap[String(r.promo_code_id)] ?? null) : null,
  }));

  // settings: cabin_config + cabin_inventory
  const { data: settingsRows, error: sErr } = await supabase
    .from("settings")
    .select("key,value")
    .in("key", ["cabin_config", "cabin_inventory"]);
  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });

  const settings: Record<string, any> = {};
  for (const row of settingsRows ?? []) settings[row.key] = row.value;

  const config = settings["cabin_config"] || {};
  const inventory = settings["cabin_inventory"] || {};

  // prices (current view)
  const { data: prices, error: prErr } = await supabase
    .from("current_public_prices")
    .select("category, occupancy, price_cents");
  if (prErr) return NextResponse.json({ ok: false, error: prErr.message }, { status: 500 });

  // caps remaining by category (materialized view you created)
  const { data: capsRows, error: cErr } = await supabase
    .from("promo_caps_remaining_by_category")
    .select("type, category, remaining");
  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });

  // compute in-booking promo counts (artist/eb) to show “left” minus this booking (UX only)
  const inBooking = { early_bird: 0, artist: 0 } as Record<"early_bird" | "artist", number>;
  travelers.forEach(t => {
    const pt = t.promo?.type;
    if (pt === "artist") inBooking.artist += 1;
    if (pt === "early_bird") inBooking.early_bird += 1;
  });

  // normalize supports -> simple {cat: {double, triple, quad}}
  const supports: Record<string, { double: boolean; triple: boolean; quad: boolean }> = {};
  for (const cat of ["INTERIOR", "OCEANVIEW", "BALCONY"]) {
    const s = config?.[cat]?.supports || {};
    supports[cat] = {
      double: !!s.double,
      triple: !!s.triple,
      quad: !!s.quad,
    };
  }

  // cap rows (array) as-is, UI can filter by category
  const capsRemaining = (capsRows ?? []) as CapsRow[];

  const preselection = lead.cabin_category
    ? { category: lead.cabin_category, layout: lead.cabin_layout ?? null }
    : null;

  return NextResponse.json({
    ok: true,
    lead: { adults: lead.adults ?? 0, minors: lead.minors ?? 0, status: lead.status },
    travelers,
    supports,
    inventory,
    capsRemaining,
    prices,
    preselection,
    inBooking, // for UX-only subtraction if you want to display “left for your group”
  });
}
