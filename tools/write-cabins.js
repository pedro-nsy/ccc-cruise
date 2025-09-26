const fs = require("fs");
const path = require("path");

function backupWrite(file, content, tag){
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.writeFileSync(file, content, "utf8");
  console.log("✓ wrote", file, "backup:", fs.existsSync(bak) ? bak : "(none)");
}

/* =========  lib/pricing.ts  ========= */
const pricingFile = path.join("src","lib","pricing.ts");
backupWrite(pricingFile, `import { supabaseServer } from "@/lib/supabase-server";

export type Category = "INTERIOR" | "OCEANVIEW" | "BALCONY";
export type Occupancy = 2|3|4;

export type PriceRow = { category: Category; occupancy: "DOUBLE"|"TRIPLE"|"QUADRUPLE"; price_cents: number };

export async function fetchCurrentPrices() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("current_public_prices")
    .select("category,occupancy,price_cents");
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const r of (data || []) as PriceRow[]) {
    map.set(\`\${r.category}::\${r.occupancy}\`, r.price_cents);
  }
  return (cat: Category, occ: Occupancy) => {
    const key = \`\${cat}::\${occ===2?"DOUBLE":occ===3?"TRIPLE":"QUADRUPLE"}\`;
    const v = map.get(key);
    if (v == null) throw new Error("Missing price for " + key);
    return v;
  };
}

export function computeBestPlacementTotalCents(opts: {
  category: Category;
  occupancies: Occupancy[];
  basePrice: (cat: Category, occ: Occupancy) => number;
  promoCounts: { staff: number; artist: number; eb: number; none: number };
}) {
  const { category, occupancies, basePrice, promoCounts } = opts;

  // Build seat base prices for this layout/category
  const seats = occupancies.map(o => basePrice(category, o)).sort((a,b)=>b-a); // desc, most expensive first

  // Pre-calc interior deltas per occupancy for staff rule
  const interiorDeltas = new Map<Occupancy, number>([
    [2, Math.max(0, basePrice(category, 2) - basePrice("INTERIOR", 2))],
    [3, Math.max(0, basePrice(category, 3) - basePrice("INTERIOR", 3))],
    [4, Math.max(0, basePrice(category, 4) - basePrice("INTERIOR", 4))],
  ]);

  // Greedy assignment: apply Staff → Artist → EB → None on most expensive seats.
  let total = 0;
  let sLeft = promoCounts.staff|0,
      aLeft = promoCounts.artist|0,
      eLeft = promoCounts.eb|0;

  for (const seat of seats) {
    if (sLeft > 0) {
      // Staff pays upgrade delta vs interior for THIS seat's occupancy
      // We need which occupancy this seat was. Approximate by mapping price back → try 4,3,2
      let occ: Occupancy = 4;
      if (seat === basePrice(category, 4)) occ = 4;
      else if (seat === basePrice(category, 3)) occ = 3;
      else occ = 2;
      total += interiorDeltas.get(occ) || 0;
      sLeft--;
      continue;
    }
    if (aLeft > 0) { total += Math.round(seat * 0.5); aLeft--; continue; }
    if (eLeft > 0) { total += Math.round(seat * 0.85); eLeft--; continue; }
    total += seat;
  }
  return total;
}
`, "cabins");

/* =========  API: /api/booking/cabins/options  ========= */
const apiOptionsFile = path.join("src","app","api","booking","cabins","options","route.ts");
backupWrite(apiOptionsFile, `import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { fetchCurrentPrices, computeBestPlacementTotalCents, type Category, type Occupancy } from "@/lib/pricing";

type CabinConfig = Record<Category, { supports:{ double:boolean; triple:boolean; quad:boolean } }>;
type CabinInventory = Record<Category, { total:number; double_only:number; flex:number }>;

function expand(n:number, occs: Occupancy[]): Occupancy[][] {
  // enumerate non-negative solutions to 2d+3t+4q = n, limited to occupancies allowed later
  const out: Occupancy[][] = [];
  for (let q=0; q*4<=n; q++){
    for (let t=0; t*3+q*4<=n; t++){
      const rem = n - (t*3 + q*4);
      if (rem % 2 !== 0) continue;
      const d = rem / 2;
      if (d<0) continue;
      const occ: Occupancy[] = ([] as Occupancy[])
        .concat(Array(q).fill(4) as Occupancy[])
        .concat(Array(t).fill(3) as Occupancy[])
        .concat(Array(d).fill(2) as Occupancy[]);
      out.push(occ);
    }
  }
  return out;
}
function count(occ: Occupancy[], x: Occupancy){ return occ.reduce((a,b)=>a+(b===x?1:0),0); }

export async function GET(req: NextRequest) {
  try {
    const ref = req.cookies.get("ccc_ref")?.value;
    if (!ref) return NextResponse.json({ ok:false, error:"MISSING_REF" }, { status:401 });

    const sb = supabaseServer();

    // Load lead (adults/minors) + travelers (promos)
    const { data: lead, error: leadErr } = await sb
      .from("leads")
      .select("booking_ref, adults, minors")
      .eq("booking_ref", ref)
      .single();
    if (leadErr || !lead) return NextResponse.json({ ok:false, error:"LEAD_NOT_FOUND" }, { status:404 });
    const groupSize = (lead.adults||0) + (lead.minors||0);

    const { data: travelers, error: tErr } = await sb
      .from("travelers")
      .select("idx,is_adult,promo_code_id")
      .eq("booking_ref", ref)
      .order("idx",{ ascending:true });
    if (tErr) return NextResponse.json({ ok:false, error:tErr.message }, { status:500 });

    // promo type map
    let rawIds = (travelers||[]).map(t=>t.promo_code_id).filter(Boolean);
    const idsNum = (rawIds as any[]).filter(v=>typeof v==="number") as number[];
    const idsStr = (rawIds as any[]).filter(v=>typeof v!=="number").map(String) as string[];
    const promoMap: Record<string, { type:"early_bird"|"artist"|"staff" }> = {};
    if (idsNum.length) {
      const { data } = await sb.from("promo_codes").select("id,type").in("id", idsNum);
      (data||[]).forEach((p:any)=>promoMap[String(p.id)] = { type:p.type });
    }
    if (idsStr.length) {
      const { data } = await sb.from("promo_codes").select("id,type").in("id", idsStr);
      (data||[]).forEach((p:any)=>promoMap[String(p.id)] = { type:p.type });
    }

    const promoCountsAll = { staff:0, artist:0, eb:0, none:0 };
    for (const t of (travelers||[])) {
      const ty = t.promo_code_id ? promoMap[String(t.promo_code_id)]?.type : null;
      if (ty === "staff") promoCountsAll.staff++;
      else if (ty === "artist") promoCountsAll.artist++;
      else if (ty === "early_bird") promoCountsAll.eb++;
      else promoCountsAll.none++;
    }

    // load settings
    const cfg = await sb.from("settings").select("key,value").in("key",["cabin_config","cabin_inventory"]).then(r=>{
      if (r.error) throw new Error(r.error.message);
      const m: Record<string, any> = {};
      for (const row of r.data||[]) m[row.key] = row.value;
      return m;
    });
    const cabinConfig = cfg.cabin_config as CabinConfig;
    const inventory   = cfg.cabin_inventory as CabinInventory;

    // promo caps remaining per category (strict block logic)
    const { data: caps, error: capsErr } = await sb
      .from("promo_caps_remaining_by_category")
      .select("type, category, remaining");
    if (capsErr) return NextResponse.json({ ok:false, error:capsErr.message }, { status:500 });

    const remainingByTypeCat = new Map<string, number>();
    (caps||[]).forEach((r:any)=>{
      const key = \`\${r.type}::\${r.category||"null"}\`;
      remainingByTypeCat.set(key, r.remaining);
    });

    // generator for layouts per category with feasibility rules
    const basePrice = await fetchCurrentPrices();
    const categories: Category[] = ["INTERIOR","OCEANVIEW","BALCONY"];
    const out: any[] = [];

    for (const cat of categories) {
      // supports
      const sup = cabinConfig?.[cat]?.supports || { double:true, triple:true, quad:true };

      // strict caps block?
      const artistRem = remainingByTypeCat.get(\`artist::\${cat}\`) ?? 0;
      const ebRem     = remainingByTypeCat.get(\`early_bird::\${cat}\`) ?? 0;
      const needArtist= promoCountsAll.artist;
      const needEb    = promoCountsAll.eb;
      const blocked   = (needArtist > 0 && needArtist > artistRem) || (needEb > 0 && needEb > ebRem);

      // candidate layouts (sum to groupSize)
      let layouts = expand(groupSize,[2,3,4] as Occupancy[])
        .filter(occ=>{
          if (!sup.triple && occ.includes(3)) return false;
          if (!sup.quad   && occ.includes(4)) return false;
          return true;
        });

      // adult-per-cabin cheap guard (cabins <= adults)
      const adults = (lead.adults||0);
      layouts = layouts.filter(occ => occ.length <= adults);

      // ship-level shape constraints (double_only vs flex)
      const inv = inventory?.[cat] || { total: 9999, double_only: 9999, flex: 9999 };
      layouts = layouts.filter(occ=>{
        const d = count(occ,2);
        const t = count(occ,3);
        const q = count(occ,4);
        const totalCabins = d+t+q;
        if (totalCabins > inv.total) return false;
        if (t+q > inv.flex) return false;          // triples+quads must fit in flex
        if (d > inv.double_only + inv.flex) return false; // doubles can be double_only or flex
        return true;
      });

      // De-dup (expand can produce same mix in different order)
      const key = (a: Occupancy[]) => \`\${count(a,2)}-\${count(a,3)}-\${count(a,4)}\`;
      const seen = new Set<string>();
      layouts = layouts.filter(l=>{ const k=key(l); if (seen.has(k)) return false; seen.add(k); return true; });

      // price + ranking
      const priced = layouts.map(occ => {
        const total = computeBestPlacementTotalCents({
          category: cat,
          occupancies: occ,
          basePrice,
          promoCounts: promoCountsAll,
        });
        return { occ, total };
      });

      // rank: fewest cabins → cheapest total → (tie-breaker: more flex headroom)
      priced.sort((a,b)=>{
        const c = a.occ.length - b.occ.length;
        if (c !== 0) return c;
        const p = a.total - b.total;
        if (p !== 0) return p;
        // headroom = how many flex cabins remain if we chose this layout
        const flexUsed = count(a.occ,3)+count(a.occ,4);
        const flexUsedB= count(b.occ,3)+count(b.occ,4);
        return (flexUsed - flexUsedB);
      });

      const top = priced.slice(0,3).map(x=>({
        doubles: count(x.occ,2),
        triples: count(x.occ,3),
        quads:   count(x.occ,4),
        cabins:  x.occ.length,
        total_cents: x.total,
      }));

      out.push({
        category: cat,
        from_price_cents: basePrice(cat, 2), // per your spec: show ONLY double price
        promo_need: { artist: needArtist, eb: needEb },
        promo_remaining: {
          artist: artistRem,
          eb: ebRem,
        },
        blocked, // strict caps block
        layouts: top,
      });
    }

    // chips visibility: only show the promo(s) present in travelers
    const showArtistChip = promoCountsAll.artist > 0;
    const showEbChip     = promoCountsAll.eb > 0;

    return NextResponse.json({
      ok:true,
      groupSize,
      promoCounts: promoCountsAll,
      showChips: { artist: showArtistChip, eb: showEbChip },
      categories: out,
    }, { status:200 });

  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || "Server error" }, { status:500 });
  }
}
`, "cabins");

/* =========  API: /api/booking/cabins/save  ========= */
const apiSaveFile = path.join("src","app","api","booking","cabins","save","route.ts");
backupWrite(apiSaveFile, `import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest){
  const ref = req.cookies.get("ccc_ref")?.value;
  if (!ref) return NextResponse.json({ ok:false, error:"MISSING_REF" }, { status:401 });

  const body = await req.json().catch(()=>({}));
  const category = (body?.category||"").toString().toUpperCase();
  const layout = body?.layout && typeof body.layout === "object" ? body.layout : null;
  if (!category || !layout) return NextResponse.json({ ok:false, error:"INVALID_PAYLOAD" }, { status:400 });

  const sb = supabaseServer();
  const { error } = await sb
    .from("leads")
    .update({
      cabin_category: category,
      cabin_layout: layout,
      status: "cabins_selected",
    })
    .eq("booking_ref", ref);
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });

  // Also mirror to localStorage on client (page will do it) to keep CabinAssignmentEditor working for now.
  return NextResponse.json({ ok:true }, { status:200 });
}
`, "cabins");

/* =========  Page: /booking/cabins  ========= */
const pageFile = path.join("src","app","booking","cabins","page.tsx");
backupWrite(pageFile, `"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = "INTERIOR" | "OCEANVIEW" | "BALCONY";
type Layout = { doubles:number; triples:number; quads:number; cabins:number; total_cents:number };

type ApiPayload = {
  ok: true;
  groupSize: number;
  promoCounts: { staff:number; artist:number; eb:number; none:number };
  showChips: { artist:boolean; eb:boolean };
  categories: Array<{
    category: Category;
    from_price_cents: number;
    promo_need: { artist:number; eb:number };
    promo_remaining: { artist:number; eb:number };
    blocked: boolean;
    layouts: Layout[];
  }>;
} | { ok:false; error:string };

function mxn(cents:number){ return "MXN " + (Math.round(cents/100)).toLocaleString("en-US"); }

export default function CabinsPage(){
  const router = useRouter();
  const [data, setData] = useState<ApiPayload | null>(null);
  const [err, setErr] = useState("");
  const [chosen, setChosen] = useState<{ category:Category|null; layout:Layout|null }>({ category:null, layout:null });
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    let alive = true;
    (async()=>{
      const res = await fetch("/api/booking/cabins/options", { cache: "no-store" });
      const js = await res.json();
      if (!alive) return;
      if (!js.ok) setErr(js.error||"Failed to load");
      else setData(js);
    })().catch(()=>setErr("Failed to load"));
    return ()=>{ alive=false; }
  },[]);

  const helperLine = "If you have a promo code, your price will be adjusted automatically and shown on Review.";

  function select(cat: Category, layout: Layout){
    setChosen({ category:cat, layout });
  }

  async function next(){
    if (!chosen.category || !chosen.layout) return;
    setSaving(true);
    try {
      // save to server
      const res = await fetch("/api/booking/cabins/save", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ category: chosen.category, layout: chosen.layout }),
      });
      if (!res.ok) { setSaving(false); return; }

      // TEMP: mirror to localStorage to keep CabinAssignmentEditor working
      try {
        const draft = JSON.parse(localStorage.getItem("ccc-draft") || "{}");
        draft.cabins = { category: chosen.category, layout: { doubles: chosen.layout.doubles, triples: chosen.layout.triples, quads: chosen.layout.quads, cabins: chosen.layout.cabins } };
        localStorage.setItem("ccc-draft", JSON.stringify(draft));
      } catch {}

      router.push("/booking/cabins/assign");
    } finally {
      setSaving(false);
    }
  }

  const cats = useMemo(()=> (data && data.ok) ? (data as any).categories as ApiPayload["categories"] : [], [data]);

  return (
    <main className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Cabins</h1>
        <p className="text-neutral-700">Choose a cabin category and a layout that fits your group.</p>
        <p className="text-sm text-neutral-600">We\\u2019ll finalize totals on the Review step. You can still make changes.</p>
      </header>

      {err && <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{err}</div>}
      {!err && !data && (
        <div className="rounded-xl border bg-white p-6 text-center text-neutral-600">Loading availability…</div>
      )}

      {!err && data && data.ok && cats.map(cat => {
        const disabledCategory = cat.blocked || cat.layouts.length === 0;
        return (
          <section key={cat.category} className="rounded-2xl border bg-white p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold">{cat.category === "OCEANVIEW" ? "Oceanview" : (cat.category.charAt(0) + cat.category.slice(1).toLowerCase())}</div>
                <div className="text-sm text-neutral-600">From {mxn(cat.from_price_cents)} per person (double)</div>
                <div className="text-xs text-neutral-500 mt-1">{helperLine}</div>
              </div>

              {(data as any).showChips && (
                <div className="flex items-center gap-2">
                  {(data as any).showChips.artist && (
                    <div className={"inline-flex items-center rounded-xl px-2.5 py-1 border text-xs " + (cat.promo_remaining.artist<=0 ? "bg-neutral-50 text-neutral-400" : "")}>
                      Artist: {cat.promo_remaining.artist} left
                    </div>
                  )}
                  {(data as any).showChips.eb && (
                    <div className={"inline-flex items-center rounded-xl px-2.5 py-1 border text-xs " + (cat.promo_remaining.eb<=0 ? "bg-neutral-50 text-neutral-400" : "")}>
                      Early Bird: {cat.promo_remaining.eb} left
                    </div>
                  )}
                </div>
              )}
            </div>

            {disabledCategory && (
              <div className="rounded-xl border bg-neutral-50 p-4 text-sm">Not available with your current promo codes.</div>
            )}

            {!disabledCategory && (
              <div className="space-y-3">
                {cat.layouts.map((lay, i) => {
                  const active = chosen.category===cat.category && chosen.layout?.doubles===lay.doubles && chosen.layout?.triples===lay.triples && chosen.layout?.quads===lay.quads;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={()=>select(cat.category, lay)}
                      className={"w-full text-left rounded-2xl border p-5 hover:border-neutral-300 " + (active ? "data-[active=true]:border-blue-600 ring-2 ring-blue-100 border-blue-600" : "")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-lg font-medium">
                            {lay.quads ? \`\${lay.quads}× quad\` : ""}{lay.quads&&lay.triples? " · " : ""}{lay.triples ? \`\${lay.triples}× triple\` : ""}{(lay.quads||lay.triples)&&lay.doubles? " · " : ""}{lay.doubles ? \`\${lay.doubles}× double\` : ""}
                          </div>
                          <div className="text-sm text-neutral-600">Uses {lay.cabins} cabin{lay.cabins>1?"s":""}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-semibold">{mxn(lay.total_cents)}</div>
                          <div className="text-xs text-neutral-500">Best placement estimate</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <div className="flex items-center justify-between">
        <a href="/booking/travelers" className="btn btn-ghost">Back</a>
        <button disabled={!chosen.category || !chosen.layout || saving} onClick={next} className="btn btn-primary disabled:opacity-60">
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </main>
  );
}
`, "cabins");

