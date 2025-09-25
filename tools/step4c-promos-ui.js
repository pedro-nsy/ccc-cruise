const fs = require("fs");
const path = require("path");

function writeWithBackup(rel, content, tag){
  const file = path.join("src","app","admin","promos","sections", rel);
  const bak  = file + ".bak-" + tag;
  const dir  = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.writeFileSync(file, content, "utf8");
  console.log("✓ wrote", file, "backup:", fs.existsSync(bak) ? bak : "(none)");
  return { file, bak };
}

function patchPageStatsProp(){
  const file = path.join("src","app","admin","promos","page.tsx");
  if (!fs.existsSync(file)) { console.log("! page.tsx not found, skipping"); return; }
  const bak  = file + ".bak-step4c";
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
  let s = fs.readFileSync(file, "utf8");

  // Add stats={model.stats} to <GeneratorForm ... />
  // Match the opening tag spanning multiple lines.
  const re = /<GeneratorForm([\s\S]*?)\/>/m;
  const m  = s.match(re);
  if (!m) { console.log("! GeneratorForm tag not found; no changes"); return; }

  let tag = m[0];
  if (!/stats=/.test(tag)) {
    // insert stats prop just before onSubmit to keep things tidy
    tag = tag.replace(/onSubmit=\{[^}]+\}/, (hit) => `stats={model.stats}\n          ${hit}`);
    s = s.replace(re, tag);
    fs.writeFileSync(file, s, "utf8");
    console.log("✓ patched page.tsx to pass stats={model.stats}");
    console.log("  backup:", bak);
  } else {
    console.log("… page.tsx already passes stats");
  }
}

const generatorForm = `import React, { useMemo, useState } from "react";

type GenType = "" | "early_bird" | "artist" | "staff";

export default function GeneratorForm({
  stats,
  genType, setGenType,
  qty, setQty,
  meta, setMeta,
  genMsg,
  onSubmit
}: {
  stats?: any | null;
  genType: GenType; setGenType: (v: GenType)=>void;
  qty: number; setQty: (n: number)=>void;
  meta: { name: string; email: string; phone: string; note: string };
  setMeta: (f: (m: typeof meta)=>typeof meta) => void;
  genMsg: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  // mode: quick vs bulk (UI only; submit still delegates to parent)
  const [mode, setMode] = useState<"quick"|"bulk">("quick");

  // when switching modes, apply the UX rules you approved:
  // quick → force qty=1; bulk → keep qty (but we’ll clamp/disable if invalid)
  const switchMode = (m: "quick"|"bulk") => {
    setMode(m);
    if (m === "quick") setQty(1);
  };

  // remaining per type (computed from stats: caps - in_cap)
  const remaining = useMemo(() => {
    if (!stats || !genType) return null;
    const caps = stats?.caps?.[genType] ?? null;
    const inCap = stats?.in_cap?.[genType] ?? 0;
    if (caps === null || typeof caps !== "number") return null; // Staff or uncapped
    return Math.max(0, Number(caps) - Number(inCap || 0));
  }, [stats, genType]);

  // format hint by type
  const hint = useMemo(() => {
    if (genType === "early_bird") return "Example: EL??-???B";
    if (genType === "artist")     return "Example: AR??-???T";
    if (genType === "staff")      return "Example: ST??-???F";
    return "We’ll use the right format automatically.";
  }, [genType]);

  const showRemaining = useMemo(() => {
    if (!genType) return null;
    if (genType === "staff") return "No cap";
    if (remaining === null) return "—";
    return String(remaining);
  }, [genType, remaining]);

  // Disable rules
  const quickDisabled = !genType;
  const bulkOutOfRange = qty < 1 || qty > 20 || Number.isNaN(qty);
  const bulkOverCap = (remaining !== null && qty > remaining);
  const bulkDisabled = !genType || bulkOutOfRange || bulkOverCap;

  return (
    <section className="space-y-6">
      {/* Toggle cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Add card */}
        <div
          className="rounded-2xl border bg-white p-6 space-y-4 hover:border-neutral-300"
          data-active={mode === "quick"}
          onClick={() => switchMode("quick")}
          role="button"
          tabIndex={0}
        >
          <h3 className="text-lg font-medium">Quick Add</h3>
          <p className="text-sm text-neutral-600">
            Make one code and (optionally) note who it’s for.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium">Type</label>
              <select
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                           focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                value={genType}
                onChange={(e) => setGenType(e.target.value as GenType)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select type</option>
                <option value="early_bird">Early Bird</option>
                <option value="artist">Artist</option>
                <option value="staff">Staff</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">{hint}</p>
              <p className="text-xs text-neutral-600 mt-1">
                Remaining: {showRemaining ?? "—"}
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Assign name (optional)</label>
              <input
                placeholder="Full name"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                           focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                value={meta.name}
                onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-xs text-neutral-500 mt-1">Only shown internally on the list.</p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              className="btn btn-primary disabled:opacity-60"
              type="submit"
              disabled={quickDisabled}
              onClick={(e) => { setQty(1); }}  /* keep qty=1 for quick */
            >
              Create
            </button>
          </div>
        </div>

        {/* Bulk Create card */}
        <div
          className="rounded-2xl border bg-white p-6 space-y-4 hover:border-neutral-300"
          data-active={mode === "bulk"}
          onClick={() => switchMode("bulk")}
          role="button"
          tabIndex={0}
        >
          <h3 className="text-lg font-medium">Bulk Create</h3>
          <p className="text-sm text-neutral-600">
            Generate up to 20 codes at once.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium">Type</label>
              <select
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                           focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                value={genType}
                onChange={(e) => setGenType(e.target.value as GenType)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select type</option>
                <option value="early_bird">Early Bird</option>
                <option value="artist">Artist</option>
                <option value="staff">Staff</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">{hint}</p>
              <p className="text-xs text-neutral-600 mt-1">
                Remaining: {showRemaining ?? "—"}
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Quantity</label>
              <input
                type="number" min={1} max={20}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                           focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value || "1", 10))}
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-xs text-neutral-500 mt-1">Max 20 at once.</p>
              {bulkOverCap && (
                <p className="text-xs text-amber-800 mt-1">
                  Quantity exceeds Remaining. Reduce quantity or archive codes.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Assign name to all (optional)</label>
              <input
                placeholder="Full name"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                           focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                value={meta.name}
                onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-xs text-neutral-500 mt-1">Applied to every code in this batch.</p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              className="btn btn-primary disabled:opacity-60"
              type="submit"
              disabled={bulkDisabled}
            >
              Create
            </button>
          </div>
        </div>
      </div>

      {/* single form wrapper (keeps parent onSubmit intact) */}
      <form onSubmit={onSubmit} className="sr-only" aria-hidden="true"></form>

      {/* legacy message support */}
      {genMsg && (
        <div className="rounded-xl border bg-neutral-50 p-4 text-sm text-neutral-700">
          {genMsg}
        </div>
      )}
    </section>
  );
}
`;

writeWithBackup("GeneratorForm.tsx", generatorForm, "step4c");
patchPageStatsProp();
