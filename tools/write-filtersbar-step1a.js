// Run from: C:\Users\pedro\Documents\code\ccc-cruise\web
// node tools/write-filtersbar-step1a.js
const fs = require("fs");
const path = require("path");

const TARGET = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
const BACKUP = TARGET + ".bak-step1a";

const content = `\"use client\";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type PromoType = "early_bird" | "artist" | "staff";
type PromoStatus = "active" | "reserved" | "consumed" | "archived";

const TYPE_OPTIONS: Array<{ value: "" | "all" | PromoType; label: string }> = [
  { value: "all", label: "All types" },
  { value: "early_bird", label: "Early Bird" },
  { value: "artist", label: "Artist" },
  { value: "staff", label: "Staff" },
];

const STATUS_OPTIONS: Array<{ value: "" | "all" | PromoStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "reserved", label: "Reserved" },
  { value: "consumed", label: "Consumed" },
  { value: "archived", label: "Archived" },
];

const USED_OPTIONS = [
  { value: "all", label: "All" },
  { value: "yes", label: "Used" },     // used = consumed
  { value: "no",  label: "Not used" }, // not consumed
];

function setParam(u: URL, key: string, val: string | null) {
  if (!val || val === "all" || val === "") {
    u.searchParams.delete(key);
  } else {
    u.searchParams.set(key, val);
  }
}

export default function FiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // current values
  const q = sp.get("q") ?? "";
  const type = (sp.get("type") ?? "all").toLowerCase();
  let status = (sp.get("status") ?? "all").toLowerCase();
  const used = (sp.get("used") ?? "all").toLowerCase();

  // Legacy map: disabled -> archived
  if (status === "disabled") status = "archived";

  // Handlers: update URL, reset page=1
  const update = React.useCallback((next: Partial<{ q:string; type:string; status:string; used:string }>) => {
    const url = new URL(window.location.href);
    setParam(url, "q",     next.q ?? q);
    setParam(url, "type",  next.type ?? type);
    setParam(url, "status",next.status ?? status);
    setParam(url, "used",  next.used ?? used);
    // always reset page to 1 on filter change
    url.searchParams.set("page", "1");
    router.replace(url.toString());
  }, [router, q, type, status, used]);

  const onClear = React.useCallback(() => {
    const url = new URL(window.location.origin + pathname);
    url.searchParams.set("page", "1");
    router.replace(url.toString());
  }, [router, pathname]);

  return (
    <section className="rounded-2xl border bg-white p-6 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
        {/* q */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Search</label>
          <input
            className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            placeholder="Code, name, email, phone..."
            defaultValue={q}
            onKeyDown={(e) => { if (e.key === "Enter") update({ q: (e.currentTarget as HTMLInputElement).value.trim() }); }}
            onBlur={(e) => update({ q: e.currentTarget.value.trim() })}
          />
        </div>

        {/* type */}
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select
            className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            value={type}
            onChange={(e) => update({ type: e.target.value })}
          >
            {TYPE_OPTIONS.map(o => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* status */}
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select
            className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            value={status}
            onChange={(e) => update({ status: e.target.value })}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* used */}
        <div>
          <label className="block text-sm font-medium">Used</label>
          <select
            className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            value={used}
            onChange={(e) => update({ used: e.target.value })}
          >
            {USED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-neutral-500">Changing filters resets the list to page 1.</p>
        <button
          className="rounded-xl border px-4 py-2.5 bg-white hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
          onClick={onClear}
          type="button"
        >
          Clear filters
        </button>
      </div>
    </section>
  );
}
`;

(function main() {
  if (!fs.existsSync(TARGET)) {
    console.error("Not found:", TARGET);
    process.exit(1);
  }
  if (!fs.existsSync(BACKUP)) {
    fs.copyFileSync(TARGET, BACKUP);
    console.log("• Backup created:", BACKUP);
  } else {
    console.log("i Backup already exists:", BACKUP);
  }
  fs.writeFileSync(TARGET, content, "utf8");
  console.log("✓ Wrote FiltersBar.tsx for Step 1A:", TARGET);
})();
