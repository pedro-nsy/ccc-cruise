// Run from: C:\Users\pedro\Documents\code\ccc-cruise\web
// node tools/overwrite-promos-ui-status.js
const fs = require("fs");
const path = require("path");

const listTablePath = path.join("src","app","admin","promos","sections","ListTable.tsx");
const chipsPath     = path.join("src","app","admin","promos","sections","chips.tsx");

function writeWithBackup(file, content, tag) {
  if (!fs.existsSync(file)) {
    console.error("Not found:", file);
    process.exit(1);
  }
  const bak = file + `.bak-${tag}`;
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.writeFileSync(file, content, "utf8");
  console.log("• Wrote", file, "(backup:", path.basename(bak) + ")");
}

/* ---------- NEW chips.tsx (status pill supports 4 statuses) ---------- */
const chipsContent = `export function TypeChip({ t }: { t: "early_bird"|"artist"|"staff" }) {
  const label = t === "early_bird" ? "Early Bird (15%)" : t === "artist" ? "Artist (50%)" : "Staff";
  const color =
    t === "early_bird" ? "border-blue-300 text-blue-700 bg-blue-50" :
    t === "artist"     ? "border-purple-300 text-purple-700 bg-purple-50" :
                         "border-green-200 text-green-700 bg-green-50";
  return <span className={\`inline-flex items-center rounded-xl px-2.5 py-1 border text-xs \${color}\`}>{label}</span>;
}

export function StatusChip({ s }: { s: "active"|"archived"|"reserved"|"consumed" }) {
  let label = "Active";
  let color = "border-neutral-300 text-neutral-700 bg-neutral-50";
  if (s === "archived") {
    label = "Archived";
    color = "border-amber-300 text-amber-800 bg-amber-50";
  } else if (s === "reserved") {
    label = "Reserved";
    color = "border-blue-300 text-blue-700 bg-blue-50";
  } else if (s === "consumed") {
    label = "Consumed";
    color = "border-green-300 text-green-700 bg-green-50";
  }
  return <span className={\`inline-flex items-center rounded-xl px-2.5 py-1 border text-xs \${color}\`}>{label}</span>;
}
`;

/* ---------- NEW ListTable.tsx (defensive UI for consumed) ---------- */
const listTableContent = `import { Info } from "lucide-react";
import { TypeChip, StatusChip } from "./chips";
import { yesNo } from "./format";

export default function ListTable({
  items,
  loading,
  onCopy,
  onToggleStatus,
  onOpenDetails,
}: {
  items: Array<{
    id: string|number;
    code: string;
    type: "early_bird"|"artist"|"staff";
    status: "active"|"archived"|"reserved"|"consumed";
    used_count: number;
    assigned_to_name: string|null;
  }>;
  loading: boolean;
  onCopy: (code: string)=>void;
  onToggleStatus: (id: string|number, to: "active"|"archived")=>void;
  onOpenDetails: (row: any)=>void;
}) {
  if (loading) {
    return (
      <section className="rounded-2xl border bg-white p-6">
        <div className="text-sm text-neutral-600">Loading…</div>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return (
      <section className="rounded-2xl border bg-white p-6">
        <div className="rounded-xl border bg-neutral-50 p-4 text-sm">
          No codes match your filters. Try adjusting search or filters.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="space-y-3">
        <div className="grid grid-cols-12 text-sm font-medium text-neutral-600">
          <div className="col-span-3">Code</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Used</div>
          <div className="col-span-2">Assigned to</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {items.map((p) => (
          <div key={String(p.id)} className="grid grid-cols-12 items-center text-sm py-2 border-t">
            {/* Code + Copy */}
            <div className="col-span-3 font-mono font-semibold flex items-center gap-2">
              {p.code}
              <button
                className="px-2 py-1 text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-200 rounded"
                title="Copy code"
                onClick={() => onCopy(p.code)}
              >
                Copy
              </button>
            </div>

            {/* Type */}
            <div className="col-span-2"><TypeChip t={p.type} /></div>

            {/* Status */}
            <div className="col-span-2"><StatusChip s={p.status} /></div>

            {/* Used (Yes/No) */}
            <div className="col-span-1">{yesNo(p.used_count)}</div>

            {/* Assigned to (name only) */}
            <div className="col-span-2 truncate">{p.assigned_to_name || "—"}</div>

            {/* Actions */}
            <div className="col-span-2 text-right flex items-center justify-end gap-2">
              {p.status === "consumed" ? (
                // Defensive UX: consumed cannot be archived; show a disabled chip-like button
                <button className="btn btn-ghost disabled:opacity-60" disabled title="Consumed codes cannot be archived">
                  Consumed
                </button>
              ) : p.status === "active" || p.status === "reserved" ? (
                // Active or Reserved → Archive allowed (reserved will auto-release per business rule)
                <button className="btn btn-ghost" onClick={() => onToggleStatus(p.id, "archived")}>Archive</button>
              ) : (
                // Archived → Activate
                <button className="btn btn-primary" onClick={() => onToggleStatus(p.id, "active")}>Activate</button>
              )}
              <button className="btn btn-ghost inline-flex items-center gap-1" onClick={() => onOpenDetails(p)}>
                <Info className="w-4 h-4" /> Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
`;

writeWithBackup(chipsPath, chipsContent, "chips-v2");
writeWithBackup(listTablePath, listTableContent, "listtable-v2");
console.log("✓ Updated status chip + list table for 4 statuses and defensive consumed UX.");
