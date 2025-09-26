const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","cabins","page.tsx");
const BAK  = FILE + ".bak-ui-rev";

const content = `\"use client\";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CategoryKey = "INTERIOR" | "OCEANVIEW" | "BALCONY";
type Layout = { doubles: number; triples: number; quads: number; cabins: number; seats: number; totalCents: number; totalLabel: string; recommended?: boolean };
type CategoryOut = {
  key: CategoryKey;
  label: string;
  fromCents: number;
  fromLabel: string; // "MXN 28,800 pp (double)"
  hasStaff: boolean;
  hasArtist: boolean;
  hasEb: boolean;
  disabledReason: string | null;
  layouts: Layout[];
};
type OptionsResponse = {
  ok: true;
  groupSize: number;
  adults: number;
  categories: CategoryOut[];
};
type State = {
  loading: boolean;
  error: string | null;
  data: OptionsResponse | null;
  selectedCat: CategoryKey | null;
  selectedLayoutIdx: number | null; // index within selected category layouts
};

function layoutLabel(l: {doubles:number;triples:number;quads:number}) {
  const parts: string[] = [];
  if (l.quads) parts.push(\`\${l.quads}× quad\`);
  if (l.triples) parts.push(\`\${l.triples}× triple\`);
  if (l.doubles) parts.push(\`\${l.doubles}× double\`);
  return parts.join(" · ");
}

function stateroomsText(cabins:number) {
  return \`\${cabins} stateroom\${cabins===1 ? "" : "s"} · you can adjust assignments on the next step.\`;
}

export default function CabinsPage() {
  const router = useRouter();
  const [st, setSt] = useState<State>({ loading:true, error:null, data:null, selectedCat:null, selectedLayoutIdx:null });

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetch("/api/booking/cabins/options", { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        setSt(s => ({ ...s, loading:false, error:j?.error || "Couldn’t load options.", data:null }));
        return;
      }
      const j = await r.json() as OptionsResponse;
      if (!alive) return;

      // preselect the first enabled category
      const firstEnabled = j.categories.find(c => !c.disabledReason) || null;
      setSt(s => ({
        ...s,
        loading:false,
        error:null,
        data:j,
        selectedCat:firstEnabled ? firstEnabled.key : null,
        selectedLayoutIdx:firstEnabled && firstEnabled.layouts.length ? 0 : null,
      }));
    })().catch(() => {
      if (!alive) return;
      setSt(s => ({ ...s, loading:false, error:"Couldn’t load options.", data:null }));
    });
    return () => { alive = false; };
  }, []);

  const selectedCategory = useMemo(() => {
    if (!st.data || !st.selectedCat) return null;
    return st.data.categories.find(c => c.key === st.selectedCat) || null;
  }, [st.data, st.selectedCat]);

  function pickCategory(cat: CategoryKey) {
    const catObj = st.data?.categories.find(c => c.key === cat) || null;
    setSt(s => ({
      ...s,
      selectedCat: cat,
      selectedLayoutIdx: catObj && catObj.layouts.length ? 0 : null,
    }));
  }

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!st.data || !selectedCategory || st.selectedLayoutIdx == null) return;

    const L = selectedCategory.layouts[st.selectedLayoutIdx];
    // mirror to local for the current Assign editor
    try {
      const draft = JSON.parse(localStorage.getItem("ccc-draft") || "{}");
      const next = { ...draft, cabins: { category: selectedCategory.key, layout: { doubles:L.doubles, triples:L.triples, quads:L.quads, cabins:L.cabins } } };
      localStorage.setItem("ccc-draft", JSON.stringify(next));
    } catch {}

    const res = await fetch("/api/booking/cabins/select", {
      method:"POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        category: selectedCategory.key,
        layout: { doubles:L.doubles, triples:L.triples, quads:L.quads, cabins:L.cabins },
      }),
    });
    if (!res.ok) {
      // keep it simple: soft error banner
      const j = await res.json().catch(()=>({}));
      setSt(s => ({ ...s, error: j?.error || "Couldn’t save your selection. Please try again." }));
      return;
    }
    router.push("/booking/cabins/assign");
  }

  if (st.loading) {
    return (
      <div className="mx-auto max-w-xl sm:max-w-2xl">
        <header className="text-center space-y-3 mt-6 sm:mt-8">
          <h1 className="text-2xl md:text-3xl font-semibold">Choose your cabin category</h1>
          <p className="text-neutral-700">We’ll only show layouts that make sense for your group size and ensure there’s at least one adult per cabin.</p>
          <p className="text-sm text-neutral-600">If you have a promo code, your price will be adjusted automatically and shown on the Review step.</p>
        </header>
        <div className="mt-6 rounded-2xl border bg-white p-6 text-sm text-neutral-600">Loading options…</div>
      </div>
    );
  }

  if (st.error) {
    return (
      <div className="mx-auto max-w-xl sm:max-w-2xl space-y-4">
        <header className="text-center space-y-3 mt-6 sm:mt-8">
          <h1 className="text-2xl md:text-3xl font-semibold">Choose your cabin category</h1>
          <p className="text-neutral-700">We’ll only show layouts that make sense for your group size and ensure there’s at least one adult per cabin.</p>
          <p className="text-sm text-neutral-600">If you have a promo code, your price will be adjusted automatically and shown on the Review step.</p>
        </header>
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {st.error}
        </div>
      </div>
    );
  }

  const cats = st.data?.categories ?? [];
  const canContinue = !!(selectedCategory && st.selectedLayoutIdx != null);

  return (
    <form onSubmit={onContinue} className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
      <header className="text-center space-y-3 mt-6 sm:mt-8">
        <h1 className="text-2xl md:text-3xl font-semibold">Choose your cabin category</h1>
        <p className="text-neutral-700">We’ll only show layouts that make sense for your group size and ensure there’s at least one adult per cabin.</p>
        <p className="text-sm text-neutral-600">If you have a promo code, your price will be adjusted automatically and shown on the Review step.</p>
      </header>

      {/* Category list */}
      <section className="space-y-4">
        {cats.map((c) => {
          const isSelected = st.selectedCat === c.key;
          const disabled = !!c.disabledReason;

          return (
            <div
              key={c.key}
              className={[
                "rounded-2xl border bg-white p-5 transition",
                isSelected ? "border-blue-600 ring-2 ring-blue-100" : "border-neutral-200 hover:border-neutral-300",
                disabled ? "opacity-60 pointer-events-none" : "",
              ].join(" ")}
            >
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="category"
                  className="mt-1 h-4 w-4 rounded border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  checked={isSelected}
                  onChange={() => pickCategory(c.key)}
                  disabled={disabled}
                />
                <div className="flex-1 space-y-1">
                  <div className="text-lg font-medium">{c.label}</div>
                  <div className="text-sm text-neutral-700">From {c.fromLabel}</div>
                  <div className="text-xs text-neutral-600">If you have a promo code, your price will be adjusted automatically and shown on the Review step.</div>
                  {disabled && (
                    <div className="mt-2 text-xs rounded-xl border border-amber-300 bg-amber-50 p-2 text-amber-800">
                      Not available with your current promo codes.
                    </div>
                  )}
                </div>
              </label>

              {/* Layouts (only for selected & not disabled) */}
              {isSelected && !disabled && (
                <div className="mt-4 space-y-3">
                  <div className="text-sm text-neutral-600">Available layouts for {c.label}</div>

                  {c.layouts.length === 0 && (
                    <div className="rounded-xl border bg-neutral-50 p-3 text-sm">
                      We couldn’t find a feasible layout. Try another category.
                    </div>
                  )}

                  {c.layouts.map((L, idx) => (
                    <label
                      key={idx}
                      className={[
                        "block rounded-xl border bg-white p-4",
                        st.selectedLayoutIdx === idx ? "border-blue-600 ring-2 ring-blue-100" : "border-neutral-200 hover:border-neutral-300"
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="layout"
                          className="mt-1 h-4 w-4 rounded border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          checked={st.selectedLayoutIdx === idx}
                          onChange={() => setSt(s => ({ ...s, selectedLayoutIdx: idx }))}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{layoutLabel(L)}</div>
                            {L.recommended && (
                              <span className="inline-flex items-center rounded-xl px-2 py-0.5 border text-xs bg-green-50 text-green-700 border-green-200">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-600">{stateroomsText(L.cabins)}</div>
                          <div className="mt-1 text-sm">
                            Estimated total: <span className="font-medium">{L.totalLabel}</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="flex items-center justify-between">
        <a href="/booking/travelers" className="btn btn-ghost">Back</a>
        <button type="submit" className="btn btn-primary disabled:opacity-60" disabled={!canContinue}>
          Continue
        </button>
      </div>

      <p className="text-xs text-neutral-500 text-center">
        Staff upgrades will be calculated automatically.
      </p>
    </form>
  );
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
