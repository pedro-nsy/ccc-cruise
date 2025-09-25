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

const generatorForm = `import React, { useEffect, useMemo, useRef, useState } from "react";

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
  onSubmit // legacy
}: {
  stats?: any | null;
  genType: GenType; setGenType: (v: GenType)=>void;
  qty: number; setQty: (n: number)=>void;
  meta: { name: string; email: string; phone: string; note: string };
  setMeta: (f: (m: typeof meta)=>typeof meta) => void;
  genMsg: string;
  genError?: string;
  onQuickSubmit?: () => Promise<string>;     // returns created code
  onBulkSubmit?: () => Promise<number>;      // returns count created
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [bulkMode, setBulkMode] = useState(false);

  const [quickCode, setQuickCode] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [bannerError, setBannerError] = useState("");
  const [typeError, setTypeError] = useState("");
  const [qtyError, setQtyError] = useState("");
  const [bulkCount, setBulkCount] = useState(0);

  const quickTypeRef = useRef<HTMLSelectElement>(null);
  const bulkTypeRef  = useRef<HTMLSelectElement>(null);
  const bulkQtyRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bulkMode) setTimeout(() => bulkTypeRef.current?.focus(), 0);
    else          setTimeout(() => quickTypeRef.current?.focus(), 0);
  }, [bulkMode]);

  const remaining = useMemo(() => {
    if (!stats || !genType) return null;
    const caps = stats?.caps?.[genType] ?? null;
    const inCap = stats?.in_cap?.[genType] ?? 0;
    if (caps === null || typeof caps !== "number") return null;
    return Math.max(0, Number(caps) - Number(inCap || 0));
  }, [stats, genType]);

  const showRemainingLine = useMemo(() => {
    if (!genType) return false;
    if (!stats)   return false;
    if (genType === "staff") return false;
    return true;
  }, [stats, genType]);

  const bulkOutOfRange = qty < 1 || qty > 20 || Number.isNaN(qty);
  const bulkOverCap = (remaining !== null && qty > remaining);

  const quickDisabled = !genType;
  const bulkDisabled  = !genType || bulkOutOfRange || bulkOverCap;

  function truncateName(s: string) { return (s || "").slice(0, 120); }

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

  function clearErrors() {
    setBannerError("");
    setTypeError("");
    setQtyError("");
  }

  async function handleQuickCreate(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    clearErrors();
    setQuickCode("");
    setBulkCount(0);
    setQty(1);

    if (!genType) {
      setTypeError("Select a type.");
      quickTypeRef.current?.focus();
      return;
    }

    if (!onQuickSubmit) return;
    try {
      setMeta((m) => ({ ...m, name: truncateName(m.name) }));
      const code = await onQuickSubmit();
      if (code) {
        setQuickCode(code);
        setMeta((m) => ({ ...m, name: "" }));
      }
    } catch (err: any) {
      const code = err?.code || "";
      let msg = err?.message || err?.error || "We couldn’t create codes. Try again.";
      if (code === "OVER_CAP" && typeof err?.remaining === "number") {
        msg = \`You’re over the cap for \${genType.replace("_"," ")}. Remaining: \${err.remaining}. Reduce quantity or archive codes.\`;
      }
      setBannerError(msg);
    }
  }

  async function handleBulkCreate(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    clearErrors();
    setQuickCode("");
    setBulkCount(0);

    if (!genType) {
      setTypeError("Select a type.");
      bulkTypeRef.current?.focus();
      return;
    }
    if (qty < 1 || qty > 20 || Number.isNaN(qty)) {
      setQtyError("Enter a quantity between 1 and 20.");
      bulkQtyRef.current?.focus();
      return;
    }
    if (bulkOverCap) {
      setQtyError("Quantity exceeds Remaining.");
      bulkQtyRef.current?.focus();
      return;
    }

    if (!onBulkSubmit) return;
    try {
      setMeta((m) => ({ ...m, name: truncateName(m.name) }));
      const count = await onBulkSubmit();
      setBulkCount(count);
      setQty(1);
      setMeta((m) => ({ ...m, name: "" }));
    } catch (err: any) {
      const code = err?.code || "";
      let msg = err?.message || err?.error || "We couldn’t create codes. Try again.";
      if (code === "BAD_QUANTITY") {
        msg = "Bulk is limited to 20 at a time.";
      } else if (code === "OVER_CAP" && typeof err?.remaining === "number") {
        msg = \`You’re over the cap for \${genType.replace("_"," ")}. Remaining: \${err.remaining}.\`;
      }
      setBannerError(msg);
    }
  }

  return (
    <section className="space-y-6">
      {!stats && (
        <div className="rounded-xl border bg-neutral-50 p-4 text-sm text-neutral-700" role="status" aria-live="polite">
          Set caps to track remaining.
        </div>
      )}

      <div className="rounded-2xl border bg-white p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Generate promo codes</h3>
            <p className="text-sm text-neutral-600">Create a single code or switch to bulk (max 20). Names are for internal reference only.</p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              checked={bulkMode}
              onChange={(e) => setBulkMode(e.target.checked)}
              aria-controls="bulk-fields"
              aria-expanded={bulkMode}
            />
            <span>
              Create multiple codes at once
              <span className="block text-xs text-neutral-500">Switch to bulk (max 20). You can assign the same name to all.</span>
            </span>
          </label>
        </div>

        {(genError || bannerError) && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="status" aria-live="polite">
            {genError || bannerError}
          </div>
        )}

        {/* QUICK MODE */}
        {!bulkMode && (
          <div className="space-y-4" id="quick-fields">
            {/* Row: Type + Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Type</label>
                <select
                  ref={quickTypeRef}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                             focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  value={genType}
                  onChange={(e) => { setGenType(e.target.value as GenType); setTypeError(""); }}
                >
                  <option value="">Select type</option>
                  <option value="early_bird">Early Bird</option>
                  <option value="artist">Artist</option>
                  <option value="staff">Staff</option>
                </select>
                {typeError && <p className="text-xs text-red-700 mt-1">{typeError}</p>}
                {showRemainingLine && (
                  <p className="text-xs text-neutral-600 mt-1">Remaining: {remaining}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium">Assign name (optional)</label>
                <input
                  placeholder="Full name"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                             focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  value={meta.name}
                  onChange={(e) => setMeta((m) => ({ ...m, name: truncateName(e.target.value) }))}
                />
                <p className="text-xs text-neutral-500 mt-1">For internal reference only — doesn’t affect traveler booking names.</p>
              </div>
            </div>

            {/* Success (created code) — compact width on desktop */}
            {quickCode && (
              <div className="md:max-w-md">
                <div className="rounded-xl border bg-neutral-50 p-3 text-sm flex items-center justify-between" role="status" aria-live="polite">
                  <div>
                    <div className="text-neutral-700">Created code</div>
                    <div className="font-medium">{quickCode}</div>
                  </div>
                  <button type="button" className="btn btn-ghost" aria-label="Copy code" onClick={copyCode}>Copy</button>
                </div>
              </div>
            )}
            {copyMsg && <p className="text-xs text-neutral-600">{copyMsg}</p>}

            <div className="flex items-center justify-end pt-1">
              <button className="btn btn-primary disabled:opacity-60" type="button" disabled={quickDisabled} onClick={handleQuickCreate}>
                Create
              </button>
            </div>
          </div>
        )}

        {/* BULK MODE */}
        {bulkMode && (
          <div className="space-y-4" id="bulk-fields">
            {/* Row: Type + Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Type</label>
                <select
                  ref={bulkTypeRef}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                             focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  value={genType}
                  onChange={(e) => { setGenType(e.target.value as GenType); setTypeError(""); }}
                >
                  <option value="">Select type</option>
                  <option value="early_bird">Early Bird</option>
                  <option value="artist">Artist</option>
                  <option value="staff">Staff</option>
                </select>
                {typeError && <p className="text-xs text-red-700 mt-1">{typeError}</p>}
                {showRemainingLine && (
                  <p className="text-xs text-neutral-600 mt-1">Remaining: {remaining}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium">Quantity</label>
                <input
                  ref={bulkQtyRef}
                  type="number" min={1} max={20}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                             focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  value={qty}
                  onChange={(e) => { setQty(parseInt(e.target.value || "1", 10)); setQtyError(""); }}
                />
                <p className="text-xs text-neutral-500 mt-1">Max 20 at once.</p>
                {qtyError && <p className="text-xs text-red-700 mt-1">{qtyError}</p>}
                {bulkOverCap && !qtyError && (
                  <p className="text-xs text-amber-800 mt-1">Quantity exceeds Remaining. Reduce quantity or archive codes.</p>
                )}
              </div>
            </div>

            {/* Assign name to all — half width on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Assign name to all (optional)</label>
                <input
                  placeholder="Full name"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800
                             focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  value={meta.name}
                  onChange={(e) => setMeta((m) => ({ ...m, name: truncateName(e.target.value) }))}
                />
                <p className="text-xs text-neutral-500 mt-1">Applied to every code in this batch. For internal reference only — doesn’t affect traveler booking names.</p>
              </div>
            </div>

            {bulkCount > 0 && (
              <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700" role="status" aria-live="polite">
                {bulkCount} codes created.
              </div>
            )}

            <div className="flex items-center justify-end pt-1">
              <button className="btn btn-primary disabled:opacity-60" type="button" disabled={bulkDisabled} onClick={handleBulkCreate}>
                Create
              </button>
            </div>
          </div>
        )}
      </div>

      {genMsg && (
        <div className="rounded-xl border bg-neutral-50 p-4 text-sm text-neutral-700">
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

writeWithBackup("GeneratorForm.tsx", generatorForm, "step4h");
