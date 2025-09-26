"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = "INTERIOR" | "OCEANVIEW" | "BALCONY";
type Layout = { doubles: number; triples: number; quads: number };

type InitData = {
  ok: true;
  lead: { adults: number; minors: number; status: string };
  travelers: Array<{ idx: number; is_adult: boolean; promo: null | { type: "staff" | "artist" | "early_bird" } }>;
  supports: Record<Category, { double: boolean; triple: boolean; quad: boolean }>;
  inventory: any;
  capsRemaining: Array<{ type: "early_bird" | "artist"; category: Category; remaining: number }>;
  prices: Array<{ category: Category; occupancy: "DOUBLE" | "TRIPLE" | "QUADRUPLE"; price_cents: number }>;
  preselection: null | { category: Category; layout: Layout };
  inBooking: { early_bird: number; artist: number };
};

export default function CabinsPage() {
  const router = useRouter();
  const [init, setInit] = useState<InitData | null>(null);
  const [category, setCategory] = useState<Category>("INTERIOR");
  const [layout, setLayout] = useState<Layout>({ doubles: 0, triples: 0, quads: 0 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // guard + load
  useEffect(() => {
    (async () => {
      const has = await fetch("/api/booking/has-ref");
      if (has.status === 401) { router.replace("/booking/start"); return; }

      const res = await fetch("/api/booking/cabins/init");
      if (!res.ok) { setErr("Couldn’t load cabin options."); return; }
      const data: InitData = await res.json();
      setInit(data);

      if (data.preselection) {
        setCategory(data.preselection.category);
        setLayout(data.preselection.layout ?? { doubles: 0, triples: 0, quads: 0 });
      } else {
        setCategory("INTERIOR");
        setLayout({ doubles: 0, triples: 0, quads: 0 });
      }
    })().catch(() => setErr("Couldn’t load cabin options."));
  }, [router]);

  const groupSize = useMemo(() => (init ? (init.lead.adults + init.lead.minors) : 0), [init]);
  const seats = layout.doubles * 2 + layout.triples * 3 + layout.quads * 4;
  const seatsOk = seats === groupSize;

  const supports = init?.supports?.[category] || { double: true, triple: true, quad: true };
  const pricesForCat = (init?.prices ?? []).filter(p => p.category === category);

  // caps “left” for the chosen category
  const ebLeftRaw = (init?.capsRemaining ?? []).find(r => r.type === "early_bird" && r.category === category)?.remaining ?? null;
  const arLeftRaw = (init?.capsRemaining ?? []).find(r => r.type === "artist" && r.category === category)?.remaining ?? null;
  const ebLeft = ebLeftRaw == null ? null : Math.max(0, ebLeftRaw - (init?.inBooking.early_bird ?? 0));
  const arLeft = arLeftRaw == null ? null : Math.max(0, arLeftRaw - (init?.inBooking.artist ?? 0));

  function inc(key: keyof Layout, delta: number) {
    setLayout(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + delta) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!seatsOk) { setErr("Seats must match your group size."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/booking/cabins/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, layout }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error || "Couldn’t save your selection."); 
        return;
      }
      router.push("/booking/cabins/assign");
    } finally {
      setSaving(false);
    }
  }

  if (!init) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 text-center text-neutral-500">
        Loading cabin options…
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Choose your cabin layout</h1>
        <p className="text-neutral-700">Pick a category, then select doubles/triples/quads that fit your group.</p>
        <p className="text-neutral-600 text-sm">You’ll need at least one adult per cabin on the next step.</p>
      </header>

      {err && <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{err}</div>}

      {/* Category selector */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Category</h3>
          <div className="flex items-center gap-2">
            {ebLeft != null && (
              <span className="inline-flex items-center rounded-xl px-2.5 py-1 border text-xs bg-green-50 text-green-700">
                Early Bird left: {ebLeft}
              </span>
            )}
            {arLeft != null && (
              <span className="inline-flex items-center rounded-xl px-2.5 py-1 border text-xs bg-amber-50 text-amber-800">
                Artist left: {arLeft}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["INTERIOR","OCEANVIEW","BALCONY"] as Category[]).map(cat => {
            const active = cat === category;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-2xl border p-5 w-full text-left hover:border-neutral-300 ${active ? "border-blue-600 ring-2 ring-blue-100" : ""}`}
                data-active={active}
              >
                <div className="text-lg font-medium">{cat === "OCEANVIEW" ? "Oceanview" : cat.charAt(0) + cat.slice(1).toLowerCase()}</div>
                <div className="mt-1 text-sm text-neutral-600">
                  {pricesForCat
                    .slice()
                    .sort((a,b)=>a.occupancy.localeCompare(b.occupancy))
                    .map(p => (
                      <div key={p.occupancy}>
                        {p.occupancy.charAt(0) + p.occupancy.slice(1).toLowerCase()}: MXN {(p.price_cents/100).toLocaleString("en-US")}
                      </div>
                    ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Layout selector */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <h3 className="text-lg font-medium">Layout</h3>
        <p className="text-sm text-neutral-600">We’ll only allow occupancies supported by the selected category.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Doubles */}
          <div className={`rounded-xl border p-4 ${supports.double ? "" : "opacity-50 pointer-events-none"}`}>
            <div className="font-medium">Double</div>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => inc("doubles", -1)}>-</button>
              <div className="w-10 text-center">{layout.doubles}</div>
              <button type="button" className="btn btn-ghost" onClick={() => inc("doubles", +1)}>+</button>
            </div>
          </div>

          {/* Triples */}
          <div className={`rounded-xl border p-4 ${supports.triple ? "" : "opacity-50 pointer-events-none"}`}>
            <div className="font-medium">Triple</div>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => inc("triples", -1)}>-</button>
              <div className="w-10 text-center">{layout.triples}</div>
              <button type="button" className="btn btn-ghost" onClick={() => inc("triples", +1)}>+</button>
            </div>
          </div>

          {/* Quads */}
          <div className={`rounded-xl border p-4 ${supports.quad ? "" : "opacity-50 pointer-events-none"}`}>
            <div className="font-medium">Quad</div>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => inc("quads", -1)}>-</button>
              <div className="w-10 text-center">{layout.quads}</div>
              <button type="button" className="btn btn-ghost" onClick={() => inc("quads", +1)}>+</button>
            </div>
          </div>
        </div>

        {/* Seats counter */}
        <div className="rounded-xl border bg-neutral-50 p-3 text-sm flex items-center justify-between">
          <span>Seats selected: <strong>{seats}</strong> · Group size: <strong>{groupSize}</strong></span>
          {!seatsOk && <span className="text-red-700">Seats must match your group size.</span>}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <a href="/booking/travelers" className="btn btn-ghost">Back</a>
        <button type="submit" disabled={!seatsOk || saving} className="btn btn-primary disabled:opacity-60">
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </form>
  );
}
