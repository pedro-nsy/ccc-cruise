"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = "INTERIOR" | "OCEAN" | "BALCONY";
type Layout = { doubles: number; triples: number; quads: number; cabins: number };

const PUBLIC_PRICE_PER_PERSON_DOUBLE: Record<Category, number> = {
  INTERIOR: 28800,
  OCEAN: 34000,
  BALCONY: 38200,
};
const EARLY_BIRD_PER_PERSON_DOUBLE: Record<Category, number> = {
  INTERIOR: 24480,
  OCEAN: 28900,
  BALCONY: 32470,
};
const EARLY_BIRD_AVAILABLE: Record<Category, boolean> = {
  INTERIOR: true,
  OCEAN: true,
  BALCONY: true,
};

type InventoryRule = { total: number; flex: number; doubleOnly: number };
const INVENTORY: Record<Category, InventoryRule> = {
  BALCONY:  { total: 145, flex: 50, doubleOnly: 95 },
  INTERIOR: { total: 145, flex: 50, doubleOnly: 95 },
  OCEAN:    { total: 50,  flex: 10, doubleOnly: 40 },
};

type Combo = { doubles: number; triples: number; quads: number };
function allExactCombos(people: number): Combo[] {
  const combos: Combo[] = [];
  for (let q = Math.floor(people / 4); q >= 0; q--) {
    const remAfterQ = people - 4 * q;
    for (let t = Math.floor(remAfterQ / 3); t >= 0; t--) {
      const remAfterT = remAfterQ - 3 * t;
      if (remAfterT % 2 !== 0) continue;
      const d = remAfterT / 2;
      combos.push({ quads: q, triples: t, doubles: d });
    }
  }
  return combos;
}
function feasible(combo: Combo, inv: InventoryRule, adults: number): boolean {
  const cabins = combo.doubles + combo.triples + combo.quads;
  if (cabins > adults) return false; // adult per cabin
  const usedFlex = combo.triples + combo.quads;
  if (usedFlex > inv.flex) return false;
  const flexLeft = inv.flex - usedFlex;
  const maxDoubles = inv.doubleOnly + flexLeft;
  if (combo.doubles > maxDoubles) return false;
  if (cabins > inv.total) return false;
  return true;
}
function rankCombos(valid: Combo[], inv: InventoryRule): Combo[] {
  return valid
    .map(c => {
      const usedFlex = c.triples + c.quads;
      const flexLeft = inv.flex - usedFlex;
      const doublesLeft = inv.doubleOnly + flexLeft - c.doubles;
      const cabins = c.doubles + c.triples + c.quads;
      const headroom = Math.max(0, flexLeft) + Math.max(0, doublesLeft);
      return { combo: c, cabins, headroom };
    })
    .sort((a,b) => (a.cabins !== b.cabins ? a.cabins - b.cabins : b.headroom - a.headroom))
    .map(x => x.combo);
}
function layoutLabel(c: Combo): string {
  const parts: string[] = [];
  if (c.quads) parts.push(`${c.quads}× quad`);
  if (c.triples) parts.push(`${c.triples}× triple`);
  if (c.doubles) parts.push(`${c.doubles}× double`);
  return parts.join(" · ");
}

export default function Page() {
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [adults, setAdults] = useState(0);
  const [minors, setMinors] = useState(0);
  const people = adults + minors;

  const [hasSbs, setHasSbs] = useState(false);
  const [chosen, setChosen] = useState<Category | null>(null);
  const [selected, setSelected] = useState<Layout | null>(null);

  // bootstrap state from draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = JSON.parse(localStorage.getItem("ccc-draft") || "{}");
    const gs = draft?.groupSize || {};
    setAdults(Number(gs?.adults ?? 0));
    setMinors(Number(gs?.minors ?? 0));
    const intent = draft?.intent || {};
    setHasSbs(Boolean(intent?.promoFlags?.hasSbs));
    if (draft?.cabins?.category && draft?.cabins?.layout) {
      setChosen(draft.cabins.category);
      setSelected(draft.cabins.layout);
    }
    setLoaded(true);
  }, []);

  const combos = useMemo(() => {
    if (!chosen || people <= 0) return [];
    const inv = INVENTORY[chosen];
    const all = allExactCombos(people);
    const valid = all.filter(c => feasible(c, inv, adults));
    return rankCombos(valid, inv);
  }, [chosen, people, adults]);

  const isLoading = !loaded;

  function saveAndContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen || !selected) return;
    const draft = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("ccc-draft") || "{}") : {};
    if (typeof window !== "undefined") {
      localStorage.setItem("ccc-draft", JSON.stringify({ ...draft, cabins: { category: chosen, layout: selected } }));
    }
    router.push("/booking/cabins/assign");
  }

  const CategoryPrice: React.FC<{ cat: Category }> = ({ cat }) => {
    if (hasSbs) {
      const base = PUBLIC_PRICE_PER_PERSON_DOUBLE.INTERIOR;
      const oceanDelta = PUBLIC_PRICE_PER_PERSON_DOUBLE.OCEAN - base;
      const balconyDelta = PUBLIC_PRICE_PER_PERSON_DOUBLE.BALCONY - base;
      if (cat === "INTERIOR") {
        return (
          <div className="mt-1 text-sm">
            <span className="font-semibold">from MXN 0 pp (SBS)</span>
            <div className="text-xs text-neutral-500">SBS pricing applies to Interior. Upgrades available.</div>
          </div>
        );
      }
      if (cat === "OCEAN") {
        return (
          <div className="mt-1 text-sm">
            <span className="font-semibold">Upgrade: +MXN {oceanDelta.toLocaleString()} pp</span>
            <div className="text-xs text-neutral-500">Compared to Interior (SBS). Early Bird does not apply.</div>
          </div>
        );
      }
      return (
        <div className="mt-1 text-sm">
          <span className="font-semibold">Upgrade: +MXN {balconyDelta.toLocaleString()} pp</span>
          <div className="text-xs text-neutral-500">Compared to Interior (SBS). Early Bird does not apply.</div>
        </div>
      );
    }
    const publicFrom = PUBLIC_PRICE_PER_PERSON_DOUBLE[cat];
    const ebOn = EARLY_BIRD_AVAILABLE[cat];
    const ebFrom = EARLY_BIRD_PER_PERSON_DOUBLE[cat];
    return (
      <div className="mt-1 text-sm">
        {ebOn ? (
          <div className="flex items-baseline gap-2">
            <span className="line-through text-neutral-500">MXN {publicFrom.toLocaleString()} pp (double)</span>
            <span className="font-semibold">from MXN {ebFrom.toLocaleString()} pp (Early Bird)</span>
          </div>
        ) : (
          <div><span className="font-semibold">MXN {publicFrom.toLocaleString()} pp (double)</span></div>
        )}
        <div className="text-xs text-neutral-500">Promo codes (Artist / CCC Staff / SBS) may lower your total.</div>
      </div>
    );
  };

  const needsMoreAdults = useMemo(() => {
    if (!chosen) return false;
    return combos.length === 0 && people > 0 && adults === 0;
  }, [chosen, combos.length, people, adults]);

  return (
    <form onSubmit={saveAndContinue} className="mx-auto max-w-xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Choose your cabin category</h1>
        <p className="text-neutral-700">
          We’ll only show layouts that make sense for your group size (<strong>{people}</strong>) and
          ensure there’s <strong>at least one adult per cabin</strong>.
        </p>
        <p className="text-neutral-600 text-sm">
          Prices are per person. Final pricing and availability are confirmed on the review step.
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-2xl border p-6 bg-white text-sm text-neutral-500 text-center">
          Loading cabin options…
        </div>
      ) : (
        <>
          {/* Category cards */}
          <div className="grid gap-4">
            {(["INTERIOR","OCEAN","BALCONY"] as Category[]).map((cat) => {
              const label = cat === "INTERIOR" ? "Interior" : cat === "OCEAN" ? "Ocean View" : "Balcony";
              const active = chosen === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setChosen(cat); setSelected(null); }}
                  className={
                    "rounded-2xl border p-5 text-left bg-white transition " +
                    (active ? "border-blue-600 ring-2 ring-blue-100" : "hover:border-neutral-300")
                  }
                >
                  <div className="text-lg font-semibold">{label}</div>
                  <CategoryPrice cat={cat} />
                </button>
              );
            })}
          </div>

          {/* Layout options for the chosen category */}
          {chosen && (
            <div className="rounded-2xl border p-6 bg-white space-y-4">
              <div className="text-sm font-medium">
                Available layouts for {chosen === "INTERIOR" ? "Interior" : chosen === "OCEAN" ? "Ocean View" : "Balcony"}
              </div>

              {needsMoreAdults && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                  At least one adult is required per cabin. Please go back and add an adult, or reduce the number of cabins.
                </div>
              )}

              {!needsMoreAdults && combos.length === 0 && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                  We couldn’t find a feasible layout with current inventory rules. Try another category.
                </div>
              )}

              {combos.map((c, idx) => {
                const cabins = c.doubles + c.triples + c.quads;
                const isRecommended = idx === 0;
                const layout: Layout = { ...c, cabins };
                return (
                  <label key={`${c.quads}-${c.triples}-${c.doubles}-${idx}`} className="flex items-start gap-3 rounded-xl border p-4 hover:border-blue-200 cursor-pointer">
                    <input
                      type="radio"
                      name="layout"
                      className="mt-1"
                      checked={
                        !!selected &&
                        selected.doubles === c.doubles &&
                        selected.triples === c.triples &&
                        selected.quads === c.quads
                      }
                      onChange={() => setSelected(layout)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isRecommended && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            Recommended
                          </span>
                        )}
                        <div className="font-medium">{layoutLabel(c)}</div>
                      </div>
                      <div className="text-xs text-neutral-500">
                        {cabins} stateroom{cabins === 1 ? "" : "s"} · {adults} adult{adults === 1 ? "" : "s"} available
                      </div>
                    </div>
                  </label>
                );
              })}

              {combos.length > 0 && (
                <div className="pt-3 text-xs text-neutral-600">
                  Prefer a different mix? You can adjust assignments on the review step.
                </div>
              )}
            </div>
          )}
        </>
      )}

      <p className="text-xs text-neutral-500 text-center">
        Availability and prices are confirmed on the next step. Final assignment happens before payment.
      </p>

      <div className="flex items-center justify-between">
        <a href="/booking/travelers" className="btn btn-ghost">Back</a>
        <button
          type="submit"
          className="btn btn-primary disabled:opacity-60"
          disabled={isLoading || !chosen || !selected || combos.length === 0}
        >
          Continue
        </button>
      </div>
    </form>
  );
}


