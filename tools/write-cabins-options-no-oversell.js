const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","booking","cabins","options","route.ts");
const BAK  = FILE + ".bak-no-oversell-fix";

const content = `import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type CategoryKey = "INTERIOR" | "OCEANVIEW" | "BALCONY";
type Supports = { double: boolean; triple: boolean; quad: boolean };
type CabinConfig = Record<CategoryKey, { supports: Supports }>;
type CabinInventory = Record<CategoryKey, { total: number; double_only: number; flex: number }>;
type Layout = { doubles: number; triples: number; quads: number; cabins: number; seats: number };

const CAPACITY_STATUSES = ["DEPOSIT_CONFIRMED","ON_HOLD"] as const;

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
        if (remAfterT === 0) {
          const cabins = q + t;
          yield { doubles: 0, triples: t, quads: q, cabins, seats: N };
        }
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

function feasibleBasic(layout: Layout, sup: Supports, adults: number) {
  if (layout.triples > 0 && !sup.triple) return false;
  if (layout.quads   > 0 && !sup.quad)   return false;
  if (layout.doubles > 0 && !sup.double) return false;
  if (adults < layout.cabins) return false; // at least one adult per cabin (cheap guard)
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const ref = req.cookies.get("ccc_ref")?.value;
    if (!ref) return NextResponse.json({ ok:false, error:"MISSING_REF" }, { status:401 });

    const supabase = supabaseServer();

    // Lead: group size + adult count
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("booking_ref, adults, minors")
      .eq("booking_ref", ref)
      .single();
    if (leadErr || !lead) return NextResponse.json({ ok:false, error:"LEAD_NOT_FOUND" }, { status:404 });

    const groupSize = (lead.adults ?? 0) + (lead.minors ?? 0);
    const adults = lead.adults ?? 0;

    // Travelers -> promo mix
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
      .from("settings").select("value").eq("key","cabin_config").single();
    const { data: invRow } = await supabase
      .from("settings").select("value").eq("key","cabin_inventory").single();

    const CONFIG = (cfgRow?.value ?? {}) as CabinConfig;
    const INVENTORY = (invRow?.value ?? {}) as CabinInventory;

    // Prices (public pp)
    const { data: prices } = await supabase
      .from("current_public_prices")
      .select("category, occupancy, price_cents");

    const priceMap = new Map<string, number>();
    for (const r of prices ?? []) {
      priceMap.set(\`\${r.category}|\${r.occupancy}\`, r.price_cents);
    }
    function pp(category: CategoryKey, occ: "DOUBLE"|"TRIPLE"|"QUADRUPLE") {
      return priceMap.get(\`\${category}|\${occ}\`) ?? 0;
    }

    // Promo caps remaining per category
    const { data: caps } = await supabase
      .from("promo_caps_remaining_by_category")
      .select("type, category, remaining");

    const capRem = { artist: new Map<CategoryKey|"null",number>(), early_bird: new Map<CategoryKey|"null",number>() };
    for (const c of caps ?? []) {
      const key = (c.category ?? "null") as any;
      if (c.type === "artist") capRem.artist.set(key, Number(c.remaining ?? 0));
      if (c.type === "early_bird") capRem.early_bird.set(key, Number(c.remaining ?? 0));
    }

    // LIVE USAGE from confirmed/hold bookings: how many cabins already in use per category & occupancy
    // We don't have occupancy on bookings, so we count in 'cabins' and join to bookings for status.
    const { data: usedRows, error: usedErr } = await supabase
      .from("cabins")
      .select("category, occupancy, bookings!inner(status)")
      .in("bookings.status", CAPACITY_STATUSES as any);
    if (usedErr) return NextResponse.json({ ok:false, error: usedErr.message }, { status:500 });

    const usedByCat = new Map<CategoryKey, { doubles:number; triples:number; quads:number; totalCabins:number }>();
    const cats: CategoryKey[] = ["INTERIOR","OCEANVIEW","BALCONY"];
    for (const c of cats) usedByCat.set(c, { doubles:0, triples:0, quads:0, totalCabins:0 });

    for (const row of usedRows ?? []) {
      const cat = (row.category || "") as CategoryKey;
      const occ = (row.occupancy || "").toString().toUpperCase();
      const bucket = usedByCat.get(cat);
      if (!bucket) continue;
      if (occ === "DOUBLE") bucket.doubles += 1;
      else if (occ === "TRIPLE") bucket.triples += 1;
      else if (occ === "QUADRUPLE") bucket.quads += 1;
      bucket.totalCabins += 1;
    }

    function publicTotalCents(category: CategoryKey, layout: Layout) {
      return layout.doubles * pp(category,"DOUBLE")
           + layout.triples * pp(category,"TRIPLE")
           + layout.quads   * pp(category,"QUADRUPLE");
    }

    // Check if a layout can fit given remaining ship capacity for that category
    function fitsRemaining(category: CategoryKey, layout: Layout): boolean {
      const inv = INVENTORY[category];
      if (!inv) return true; // be permissive if no inventory

      const used = usedByCat.get(category) || { doubles:0, triples:0, quads:0, totalCabins:0 };

      // Current consumption
      let flexUsed = used.triples + used.quads; // triples/quads must come from flex
      let doubleOnlyUsed = used.doubles;        // doubles consume double_only first
      let totalUsed = used.totalCabins;

      // Add the candidate layout demand
      const addTriples = layout.triples;
      const addQuads   = layout.quads;
      const addDoubles = layout.doubles;

      // Triples/quads always consume flex
      flexUsed += addTriples + addQuads;

      // Doubles: consume remaining double_only first, then flex
      const doubleOnlyRem = inv.double_only - doubleOnlyUsed;
      const fromDoubleOnly = Math.max(0, Math.min(addDoubles, doubleOnlyRem));
      const spillToFlex = addDoubles - fromDoubleOnly;

      doubleOnlyUsed += fromDoubleOnly;
      flexUsed += Math.max(0, spillToFlex);

      // Total cabins
      totalUsed += layout.cabins;

      // Compute remaining vs inventory
      const flexRem = inv.flex - flexUsed;
      const doubleOnlyRemAfter = inv.double_only - doubleOnlyUsed;
      const totalRem = inv.total - totalUsed;

      return flexRem >= 0 && doubleOnlyRemAfter >= 0 && totalRem >= 0;
    }

    const categories: CategoryKey[] = ["INTERIOR","OCEANVIEW","BALCONY"];
    const out: any[] = [];

    for (const cat of categories) {
      const supports = CONFIG[cat]?.supports ?? { double:true, triple:true, quad:true };
      const inv = INVENTORY[cat] ?? { total:999, double_only:999, flex:999 };

      // Promo strict gating per your rule
      const needArtist = artistCount;
      const needEb = ebCount;
      const remArtist = Number(capRem.artist.get(cat) ?? Infinity);
      const remEb = Number(capRem.early_bird.get(cat) ?? Infinity);

      let disabledReason: string | null = null;
      if (needArtist > remArtist || needEb > remEb) {
        disabledReason = "Not available with your promo codes right now.";
      }

      // Generate feasible layouts (basic rules first)
      const layoutsAll: Array<{ layout: Layout; totalCents: number }> = [];
      for (const L of generateLayouts(groupSize, supports)) {
        if (!feasibleBasic(L, supports, adults)) continue;
        layoutsAll.push({ layout: L, totalCents: publicTotalCents(cat, L) });
      }

      // If not disabled by promos, filter by live remaining capacity (no oversell)
      let layouts = layoutsAll;
      if (!disabledReason) {
        layouts = layoutsAll.filter(x => fitsRemaining(cat, x.layout));
        if (layouts.length === 0) {
          disabledReason = "Not available — ship capacity for this category is fully used.";
        }
      }

      // Rank: fewest cabins -> cheapest public total
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

      const fromCents = pp(cat,"DOUBLE");
      out.push({
        key: cat,
        label: LABELS[cat],
        fromCents,
        fromLabel: \`\${fmtMXN(fromCents)} pp (double)\`,
        hasStaff, hasArtist, hasEb,
        artistRemaining: Number(capRem.artist.get(cat) ?? 0),
        ebRemaining: Number(capRem.early_bird.get(cat) ?? 0),
        disabledReason,
        layouts: top,
      });
    }

    return NextResponse.json({ ok:true, groupSize, adults, categories: out }, { status:200 });
  } catch (err:any) {
    return NextResponse.json({ ok:false, error: err?.message || "Server error" }, { status:500 });
  }
}
`;

if (!fs.existsSync(path.dirname(FILE))) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
}
if (fs.existsSync(FILE) && !fs.existsSync(BAK)) {
  fs.copyFileSync(FILE, BAK);
}
fs.writeFileSync(FILE, content, "utf8");
console.log("✓ Wrote", FILE, "Backup:", fs.existsSync(BAK) ? BAK : "(none)");
