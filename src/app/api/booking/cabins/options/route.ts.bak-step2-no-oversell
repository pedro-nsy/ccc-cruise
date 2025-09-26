import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type CategoryKey = "INTERIOR" | "OCEANVIEW" | "BALCONY";
type Supports = { double: boolean; triple: boolean; quad: boolean };
type CabinConfig = Record<CategoryKey, { supports: Supports }>;
type CabinInventory = Record<CategoryKey, { total: number; double_only: number; flex: number }>;

type Layout = { doubles: number; triples: number; quads: number; cabins: number; seats: number };

const LABELS: Record<CategoryKey,string> = {
  INTERIOR: "Interior",
  OCEANVIEW: "Ocean View",
  BALCONY: "Balcony",
};

function fmtMXN(cents: number) {
  const v = Math.round(cents/100);
  return "MXN " + v.toLocaleString("en-US");
}

function* generateLayouts(N: number, supports: Supports): Generator<Layout> {
  const canD = supports.double, canT = supports.triple, canQ = supports.quad;
  for (let q = 0; q <= (canQ ? Math.floor(N/4) : 0); q++) {
    const remAfterQ = N - 4*q;
    for (let t = 0; t <= (canT ? Math.floor(remAfterQ/3) : 0); t++) {
      const remAfterT = remAfterQ - 3*t;
      if (!canD) {
        if (remAfterT === 0) yield { doubles: 0, triples: t, quads: q, cabins: q+t, seats: N };
        continue;
      }
      if (remAfterT % 2 !== 0) continue;
      const d = remAfterT/2;
      const cabins = q + t + d;
      if (cabins <= 0) continue;
      yield { doubles: d, triples: t, quads: q, cabins, seats: N };
    }
  }
}

function feasible(layout: Layout, inv: CabinInventory[CategoryKey], sup: Supports, adults: number) {
  if (layout.triples > 0 && !sup.triple) return false;
  if (layout.quads   > 0 && !sup.quad)   return false;
  if (layout.doubles > 0 && !sup.double) return false;
  if (adults < layout.cabins) return false;

  // ship-level constraints: consume flex with triples/quads first
  const usedFlex = layout.triples + layout.quads;
  if (usedFlex > (inv.flex ?? 0)) return false;

  const maxDoubles = (inv.double_only ?? 0) + Math.max(0, (inv.flex ?? 0) - usedFlex);
  if (layout.doubles > maxDoubles) return false;

  if (layout.cabins > (inv.total ?? 0)) return false;
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const ref = req.cookies.get("ccc_ref")?.value;
    if (!ref) return NextResponse.json({ ok:false, error:"MISSING_REF" }, { status:401 });

    const supabase = supabaseServer();

    // Group size and adults
    const { data: lead } = await supabase
      .from("leads")
      .select("booking_ref, adults, minors")
      .eq("booking_ref", ref)
      .single();
    if (!lead) return NextResponse.json({ ok:false, error:"LEAD_NOT_FOUND" }, { status:404 });

    const groupSize = (lead.adults ?? 0) + (lead.minors ?? 0);
    const adults = lead.adults ?? 0;

    // Travelers → promo counts
    const { data: travelers } = await supabase
      .from("travelers")
      .select("promo_code_id")
      .eq("booking_ref", ref);

    const promoIds = (travelers ?? []).map(t=>t.promo_code_id).filter(Boolean);
    let staffCount=0, artistCount=0, ebCount=0;
    if (promoIds.length) {
      const { data: promos } = await supabase
        .from("promo_codes")
        .select("id,type")
        .in("id", promoIds);
      for (const p of promos ?? []) {
        if (p.type === "staff") staffCount++;
        else if (p.type === "artist") artistCount++;
        else if (p.type === "early_bird") ebCount++;
      }
    }
    const hasStaff = staffCount>0, hasArtist = artistCount>0, hasEb = ebCount>0;

    // Settings: config + inventory
    const { data: cfgRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key","cabin_config")
      .single();
    const { data: invRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key","cabin_inventory")
      .single();

    const CONFIG = (cfgRow?.value ?? {}) as CabinConfig;
    const INVENTORY = (invRow?.value ?? {}) as CabinInventory;

    // Current public prices
    const { data: prices } = await supabase
      .from("current_public_prices")
      .select("category, occupancy, price_cents");

    const priceMap = new Map<string, number>();
    for (const r of prices ?? []) priceMap.set(`${r.category}|${r.occupancy}`, r.price_cents);
    const pp = (category: CategoryKey, occ: "DOUBLE"|"TRIPLE"|"QUADRUPLE") =>
      priceMap.get(`${category}|${occ}`) ?? 0;

    // Promo caps remaining by category
    const { data: caps } = await supabase
      .from("promo_caps_remaining_by_category")
      .select("type, category, remaining");

    const capRem = {
      artist: new Map<CategoryKey|"null",number>(),
      early_bird: new Map<CategoryKey|"null",number>()
    };
    for (const c of caps ?? []) {
      const key = (c.category ?? "null") as any;
      if (c.type === "artist") capRem.artist.set(key, Number(c.remaining ?? 0));
      if (c.type === "early_bird") capRem.early_bird.set(key, Number(c.remaining ?? 0));
    }

    // Public-only total (Step 1 keeps as-is; ranking/estimates can be revised in step 3)
    function publicTotalCents(category: CategoryKey, layout: Layout) {
      const seats =
        Array(layout.doubles).fill(pp(category,"DOUBLE"))
        .concat(Array(layout.triples).fill(pp(category,"TRIPLE")))
        .concat(Array(layout.quads).fill(pp(category,"QUADRUPLE")));
      return seats.reduce((a,b)=>a+b,0);
    }

    const categories: CategoryKey[] = ["INTERIOR","OCEANVIEW","BALCONY"];
    const out: any[] = [];

    for (const cat of categories) {
      const supports = CONFIG[cat]?.supports ?? { double:true, triple:true, quad:true };
      const inv = INVENTORY[cat] ?? { total:999, double_only:999, flex:999 };

      // Strict caps gating
      const needArtist = artistCount;
      const needEb = ebCount;
      const remArtist = Number(capRem.artist.get(cat) ?? Infinity);
      const remEb = Number(capRem.early_bird.get(cat) ?? Infinity);

      let disabledReason: string | null = null;
      if (needArtist > remArtist || needEb > remEb) {
        disabledReason = "Not available with your promo codes right now.";
      }

      // From price (public double)
      const fromCents = pp(cat,"DOUBLE");

      // Build feasible layouts (limit to top 3 by fewest cabins → cheapest public total)
      const layouts: Array<{ layout: Layout; totalCents: number }> = [];
      for (const L of generateLayouts(groupSize, supports)) {
        if (!feasible(L, inv, supports, adults)) continue;
        const total = publicTotalCents(cat, L);
        layouts.push({ layout: L, totalCents: total });
      }
      layouts.sort((a,b)=>{
        if (a.layout.cabins !== b.layout.cabins) return a.layout.cabins - b.layout.cabins;
        return a.totalCents - b.totalCents;
      });

      const top = layouts.slice(0,3).map((x, i)=>({
        doubles: x.layout.doubles,
        triples: x.layout.triples,
        quads:   x.layout.quads,
        cabins:  x.layout.cabins,
        seats:   x.layout.seats,
        totalCents: x.totalCents,
        totalLabel: fmtMXN(x.totalCents),
        recommended: i===0,
      }));

      out.push({
        key: cat,
        label: LABELS[cat],
        fromCents,
        fromLabel: `${fmtMXN(fromCents)} pp (double)`,
        hasStaff, hasArtist, hasEb,
        // NEW: promo chip counts per category (Step 1)
        artistRemaining: Number.isFinite(remArtist) ? remArtist : null,
        ebRemaining: Number.isFinite(remEb) ? remEb : null,
        disabledReason,
        layouts: top,
      });
    }

    return NextResponse.json({ ok:true, groupSize, adults, categories: out }, { status:200 });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Server error" }, { status:500 });
  }
}
