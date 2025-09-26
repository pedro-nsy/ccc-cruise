"use client";

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
        <p className="text-sm text-neutral-600">We\u2019ll finalize totals on the Review step. You can still make changes.</p>
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
                            {lay.quads ? `${lay.quads}× quad` : ""}{lay.quads&&lay.triples? " · " : ""}{lay.triples ? `${lay.triples}× triple` : ""}{(lay.quads||lay.triples)&&lay.doubles? " · " : ""}{lay.doubles ? `${lay.doubles}× double` : ""}
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
