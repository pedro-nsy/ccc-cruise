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

const FILE = path.join("src","app","booking","cabins","page.tsx");

const content = `\"use client\";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CategoryKey = "INTERIOR" | "OCEANVIEW" | "BALCONY";

type ApiLayout = {
  doubles: number;
  triples: number;
  quads: number;
  cabins: number;
  seats: number;
  totalCents: number;
  totalLabel: string;
  recommended: boolean;
};

type ApiCategory = {
  key: CategoryKey;
  label: string;              // \"Interior\" | \"Ocean View\" | \"Balcony\"
  fromCents: number;
  fromLabel: string;          // e.g., \"MXN 28,800 pp (double)\"
  hasStaff: boolean;
  hasArtist: boolean;
  hasEb: boolean;
  disabledReason: string | null;
  layouts: ApiLayout[];       // up to 3
};

type ApiResponse = {
  ok: true;
  groupSize: number;
  adults: number;
  categories: ApiCategory[];
};

function layoutName(l: ApiLayout) {
  const parts: string[] = [];
  if (l.quads) parts.push(\`\${l.quads}× quad\`);
  if (l.triples) parts.push(\`\${l.triples}× triple\`);
  if (l.doubles) parts.push(\`\${l.doubles}× double\`);
  return parts.join(" · ");
}

export default function CabinsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  // UI state
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [selectedLayoutIdx, setSelectedLayoutIdx] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/booking/cabins/options", { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to load options");
      }
      const j = (await res.json()) as ApiResponse;
      if (!alive) return;
      setData(j);
      // preselect first category that's not disabled
      const firstEnabled = j.categories.find(c => !c.disabledReason)?.key ?? j.categories[0]?.key ?? null;
      setSelectedCategory(firstEnabled);
    })().catch((e) => setErr(e.message || "Failed to load options"))
      .finally(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  // reset layout selection when category changes
  useEffect(() => { setSelectedLayoutIdx(null); }, [selectedCategory]);

  const currentCategory = useMemo(() => {
    if (!data || !selectedCategory) return null;
    return data.categories.find(c => c.key === selectedCategory) || null;
  }, [data, selectedCategory]);

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCategory || currentCategory.disabledReason) return;
    if (selectedLayoutIdx == null) return;
    const picked = currentCategory.layouts[selectedLayoutIdx];
    if (!picked) return;

    const payload = {
      category: currentCategory.key,
      layout: {
        doubles: picked.doubles,
        triples: picked.triples,
        quads: picked.quads,
        cabins: picked.cabins,
      }
    };

    // Mirror minimal bits to localStorage for the Assign editor (it reads ccc-draft)
    try {
      const draftRaw = typeof window !== "undefined" ? localStorage.getItem("ccc-draft") : null;
      const draft = draftRaw ? JSON.parse(draftRaw) : {};
      const next = { ...draft, cabins: { category: currentCategory.key, layout: payload.layout } };
      localStorage.setItem("ccc-draft", JSON.stringify(next));
    } catch {}

    const res = await fetch("/api/booking/cabins/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Could not save your selection.");
      return;
    }
    router.push("/booking/cabins/assign");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl sm:max-w-2xl rounded-2xl border bg-white p-6 text-center text-neutral-600">
        Loading options…
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="mx-auto max-w-xl sm:max-w-2xl rounded-2xl border bg-red-100 p-6 text-sm text-red-700">
        {err || "Could not load options."}
      </div>
    );
  }

  const canContinue = !!currentCategory && !currentCategory.disabledReason && selectedLayoutIdx != null;

  return (
    <form onSubmit={onContinue} className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
      {/* Header */}
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Choose your cabin category</h1>
        <p className="text-neutral-700">
          We’ll only show layouts that make sense for your group size and ensure there’s at least one adult per cabin.
        </p>
        <p className="text-neutral-600 text-sm">
          If you have a promo code, your price will be adjusted automatically and shown on the Review step.
        </p>
      </header>

      {/* Section 1: pick category */}
      <section className="space-y-3">
        {data.categories.map((cat) => {
          const disabled = !!cat.disabledReason;
          const active = selectedCategory === cat.key;
          return (
            <label
              key={cat.key}
              className={\`
                block rounded-2xl border p-5 bg-white hover:border-neutral-300
                \${active ? "border-blue-600 ring-2 ring-blue-100" : "border-neutral-200"}
                \${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
              \`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="category"
                  className="mt-1 h-4 w-4 rounded border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  checked={active}
                  onChange={() => setSelectedCategory(cat.key)}
                  disabled={disabled}
                />
                <div className="flex-1 space-y-1">
                  <div className="text-lg font-medium">{cat.label}</div>
                  <div className="text-sm text-neutral-700">From {cat.fromLabel}</div>
                  <div className="text-xs text-neutral-500">
                    If you have a promo code, your price will be adjusted automatically and shown on the Review step.
                  </div>

                  {disabled && (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                      Not available with your promo codes right now.
                    </div>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </section>

      {/* Section 2: layouts for the selected category (separate block) */}
      <section className="rounded-2xl border bg-white p-6">
        <div className="text-lg font-medium mb-2">
          {currentCategory ? \`Available layouts for \${currentCategory.label}\` : "Available layouts"}
        </div>

        {!currentCategory && (
          <div className="text-sm text-neutral-600">Select a category above to see layout options.</div>
        )}

        {currentCategory && currentCategory.disabledReason && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            This category isn’t available with your promo codes right now.
          </div>
        )}

        {currentCategory && !currentCategory.disabledReason && (
          <>
            {currentCategory.layouts.length === 0 ? (
              <div className="text-sm text-neutral-600">
                We couldn’t find a feasible layout for your group size in this category.
              </div>
            ) : (
              <div className="space-y-3">
                {currentCategory.layouts.map((L, idx) => {
                  const selected = selectedLayoutIdx === idx;
                  const roomsText = L.cabins === 1 ? "1 stateroom" : \`\${L.cabins} staterooms\`;
                  return (
                    <label
                      key={idx}
                      className={\`
                        block rounded-2xl border p-4
                        \${selected ? "border-blue-600 ring-2 ring-blue-100" : "border-neutral-200"}
                        cursor-pointer
                      \`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="layout"
                          className="mt-1 h-4 w-4 rounded border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          checked={selected}
                          onChange={() => setSelectedLayoutIdx(idx)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{layoutName(L)}</div>
                            {L.recommended && (
                              <span className="inline-flex items-center rounded-xl px-2.5 py-1 border text-xs bg-green-50 text-green-700 border-green-200">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-600">
                            {roomsText} · you can adjust assignments on the next step.
                          </div>
                          <div className="text-sm mt-1">
                            <span className="text-neutral-600">Estimated total: </span>
                            <span className="font-medium">{L.totalLabel}</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <p className="text-xs text-neutral-500 text-center">Staff upgrades will be calculated automatically.</p>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <a href="/booking/travelers" className="btn btn-ghost">Back</a>
        <button type="submit" className="btn btn-primary disabled:opacity-60" disabled={!canContinue}>
          Continue
        </button>
      </div>
    </form>
  );
}
`;

backupWrite(FILE, content, "cabins-two-sections");
