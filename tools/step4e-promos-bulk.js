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
}

function patchPageAddOnBulkSubmit(){
  const file = path.join("src","app","admin","promos","page.tsx");
  if (!fs.existsSync(file)) { console.log("! page.tsx not found, skipping patch"); return; }
  const bak  = file + ".bak-step4e";
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
  let s = fs.readFileSync(file, "utf8");

  const re = /<GeneratorForm([\s\S]*?)\/>/m;
  const m  = s.match(re);
  if (!m) { console.log("! GeneratorForm tag not found; no changes"); return; }

  let tag = m[0];
  if (!/onBulkSubmit=/.test(tag)) {
    const insertion =
`onBulkSubmit={async () => {
            const payload = {
              type: genType,
              quantity: qty,
              ...(meta?.name ? { assigned_to_name: meta.name.trim() } : {})
            };
            const res = await model.createCodes(payload);
            if (res?.ok) {
              const count = res?.data?.count ?? 0;
              try { (await import("react-hot-toast")).default.success(\`Created \${count} \${genType === "early_bird" ? "Early Bird" : genType === "artist" ? "Artist" : "Staff"} codes.\`); } catch {}
              try { await model.fetchList(); } catch {}
              return count;
            } else {
              throw res?.data || { message: "Create failed" };
            }
          }}`;

    // insert right before onSubmit if present, else before "/>"
    if (/onSubmit=/.test(tag)) {
      tag = tag.replace(/onSubmit=\{[^}]+\}/, (hit) => insertion + "\n          " + hit);
    } else {
      tag = tag.replace(/\/>$/, " " + insertion + " />");
    }

    s = s.replace(re, tag);
    fs.writeFileSync(file, s, "utf8");
    console.log("✓ patched page.tsx with onBulkSubmit");
    console.log("  backup:", bak);
  } else {
    console.log("… page.tsx already has onBulkSubmit");
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
  genError,
  onQuickSubmit,
  onBulkSubmit,
  onSubmit
}: {
  stats?: any | null;
  genType: GenType; setGenType: (v: GenType)=>void;
  qty: number; setQty: (n: number)=>void;
  meta: { name: string; email: string; phone: string; note: string };
  setMeta: (f: (m: typeof meta)=>typeof meta) => void;
  genMsg: string;
  genError?: string;
  onQuickSubmit?: () => Promise<string>;
  onBulkSubmit?: () => Promise<number>;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [mode, setMode] = useState<"quick"|"bulk">("quick");
  const [quickCode, setQuickCode] = useState<string>("");
  const [copyMsg, setCopyMsg] = useState<string>("");
  const [quickError, setQuickError] = useState<string>("");
  const [bulkError, setBulkError] = useState<string>("");
  const [bulkCount, setBulkCount] = useState<number>(0);

  const switchMode = (m: "quick"|"bulk") => {
    setMode(m);
    setQuickError(""); setBulkError(""); setCopyMsg("");
    if (m === "quick") setQty(1);
  };

  const remaining = useMemo(() => {
    if (!stats || !genType) return null;
    const caps = stats?.caps?.[genType] ?? null;
    const inCap = stats?.in_cap?.[genType] ?? 0;
    if (caps === null || typeof caps !== "number") return null;
    return Math.max(0, Number(caps) - Number(inCap || 0));
  }, [stats, genType]);

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

  const quickDisabled = !genType;
  const bulkOutOfRange = qty < 1 || qty > 20 || Number.isNaN(qty);
  const bulkOverCap = (remaining !== null && qty > remaining);
  const bulkDisabled = !genType || bulkOutOfRange || bulkOverCap;

  async function copyCode() {
    if (!quickCode) return;
    try {
      await navigator.clipboard.writeText(quickCode);
      setCopyMsg("Copied");
      setTimeout(() => setCopyMsg(""), 1500);
    } catch {
      setCopyMsg("Copy failed");
      setTimeout(() => setCopyMsg(""), 1500);
    }
  }

  async function handleQuickCreate(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault(); e.stopPropagation();
    setQuickError(""); setCopyMsg(""); setQuickCode("");
    setBulkError(""); setBulkCount(0);
    if (!onQuickSubmit || !genType) return;
    setQty(1);
    try {
      const code = await onQuickSubmit();
      if (code) {
        setQuickCode(code);
        setMeta((m) => ({ ...m, name: "" })); // clear name, keep type
      }
    } catch (err: any) {
      const msg = (err?.message || err?.error || "Create failed");
      const rem = (typeof err?.remaining === "number") ? \` Remaining: \${err.remaining}.\` : "";
      setQuickError(msg + rem);
    }
  }

  async function handleBulkCreate(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault(); e.stopPropagation();
    setBulkError(""); setBulkCount(0);
    setQuickError(""); setQuickCode(""); setCopyMsg("");
    if (!onBulkSubmit || bulkDisabled) return;
    try {
      const count = await onBulkSubmit();
      setBulkCount(count);
      // reset: qty -> 1, clear name, keep type
      setQty(1);
      setMeta((m) => ({ ...m, name: "" }));
    } catch (err: any) {
      // Map common server errors
      const code = err?.code || "";
      let msg = err?.message || err?.error || "Create failed";
      if (code === "BAD_QUANTITY") {
        msg = "Bulk is limited to 20 at a time.";
      }
      const rem = (typeof err?.remaining === "number") ? \` Remaining: \${err.remaining}.\` : "";
      setBulkError(msg + rem);
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Add */}
        <div
          className="rounded-2xl border bg-white p-6 space-y-4 hover:border-neutral-300"
          data-active={mode === "quick"}
          onClick={() => switchMode("quick")}
          role="button"
          tabIndex={0}
        >
          <h3 className="text-lg font-medium">Quick Add</h3>
          <p className="text-sm text-neutral-600">Make one code and (optionally) note who it’s for.</p>

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
              <p className="text-xs text-neutral-600 mt-1">Remaining: {showRemaining ?? "—"}</p>
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

          {(genError || quickError) && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {genError || quickError}
            </div>
          )}

          {quickCode && (
            <div className="rounded-xl border bg-neutral-50 p-3 text-sm flex items-center justify-between">
              <div>
                <div className="text-neutral-700">Created code</div>
                <div className="font-medium">{quickCode}</div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); copyCode(); }}>
                Copy
              </button>
            </div>
          )}
          {copyMsg && <p className="text-xs text-neutral-600">{copyMsg}</p>}

          <div className="flex items-center justify-end pt-1">
            <button className="btn btn-primary disabled:opacity-60" type="button" disabled={quickDisabled} onClick={handleQuickCreate}>
              Create
            </button>
          </div>
        </div>

        {/* Bulk Create */}
        <div
          className="rounded-2xl border bg-white p-6 space-y-4 hover:border-neutral-300"
          data-active={mode === "bulk"}
          onClick={() => switchMode("bulk")}
          role="button"
          tabIndex={0}
        >
          <h3 className="text-lg font-medium">Bulk Create</h3>
          <p className="text-sm text-neutral-600">Generate up to 20 codes at once.</p>

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
              <p className="text-xs text-neutral-600 mt-1">Remaining: {showRemaining ?? "—"}</p>
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

          {bulkError && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {bulkError}
            </div>
          )}
          {bulkCount > 0 && (
            <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">
              {bulkCount} codes created.
            </div>
          )}

          <div className="flex items-center justify-end pt-1">
            <button className="btn btn-primary disabled:opacity-60" type="button" disabled={bulkDisabled} onClick={handleBulkCreate}>
              Create
            </button>
          </div>
        </div>
      </div>

      {/* legacy message */}
      {genMsg && (
        <div className="rounded-XL border bg-neutral-50 p-4 text-sm text-neutral-700">
          {genMsg}
        </div>
      )}
      {genError && !quickCode && !bulkCount && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {genError}
        </div>
      )}
    </section>
  );
}
`;

writeWithBackup("GeneratorForm.tsx", generatorForm, "step4e");
patchPageAddOnBulkSubmit();
