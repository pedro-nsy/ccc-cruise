const fs = require("fs");
const path = require("path");

function ensureDir(p){ const d = path.dirname(p); if (!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function backup(file, tag){
  if (!fs.existsSync(file)) return;
  const bak = file + ".bak-" + tag;
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
  return bak;
}
function writeWithBackup(file, content, tag){
  ensureDir(file);
  const bak = backup(file, tag);
  fs.writeFileSync(file, content, "utf8");
  console.log("✓ wrote", file, "backup:", bak ? bak : "(none)");
}

/* 1) Add a consistent date-time formatter */
(function patchFormat(){
  const file = path.join("src","app","admin","promos","sections","format.ts");
  if (!fs.existsSync(file)) {
    console.warn("! format.ts not found; skipping fmtDateTime addition");
    return;
  }
  const s = fs.readFileSync(file, "utf8");
  if (s.includes("export function fmtDateTime(")) {
    console.log("• fmtDateTime already present");
    return;
  }
  const inject = `
export function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  } catch { return iso as string; }
}
`;
  const out = s.trimEnd() + "\\n" + inject.trimStart();
  writeWithBackup(file, out, "step5c");
})();

/* 2) Replace DetailsDrawer with timeline mapping + header actions */
(function writeDrawer(){
  const file = path.join("src","app","admin","promos","sections","DetailsDrawer.tsx");
  const content = `import { TypeChip, StatusChip } from "./chips";
import { fmtDate, fmtDateTime, yesNo, prettyPhone } from "./format";
import React from "react";

type Row = any;
type Usage = {
  id: string;
  promo_code_id: string | number;
  booking_ref: string | null;
  traveler_id: string | null;
  traveler_name?: string | null;
  status: "reserved"|"released"|"consumed"|"archived"|"reactivated";
  reserved_at?: string | null;
  consumed_at?: string | null;
  released_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function DetailsDrawer({
  row, usage, usageLoading, onClose,
  onToggleStatus, onCopyCode
}: {
  row: Row;
  usage: Usage[] | null;
  usageLoading: boolean;
  onClose: () => void;
  onToggleStatus?: (id: string|number, to: "active"|"archived") => void;
  onCopyCode?: (code: string) => void;
}) {
  if (!row) return null;

  const canArchive   = row.status === "active" || row.status === "reserved";
  const canActivate  = row.status === "archived";
  const cannotToggle = row.status === "consumed";

  function handleCopy(){
    if (onCopyCode) return onCopyCode(row.code);
    try { navigator.clipboard.writeText(row.code); } catch {}
  }
  function handleArchive(){
    if (!onToggleStatus) return;
    onToggleStatus(row.id, "archived");
  }
  function handleActivate(){
    if (!onToggleStatus) return;
    onToggleStatus(row.id, "active");
  }

  // Build timeline: Generated + mapped usage events, oldest -> newest
  const events: Array<{ label: string; sub?: string; when?: string | null }> = [];
  events.push({ label: "Generated", sub: undefined, when: row.created_at });

  (usage || [])
    .slice() // already sorted desc by API; we want oldest->newest
    .sort((a,b)=> new Date(a.created_at || a.reserved_at || a.released_at || a.consumed_at || 0).getTime()
                 - new Date(b.created_at || b.reserved_at || b.released_at || b.consumed_at || 0).getTime())
    .forEach(u => {
      if (u.status === "reserved") {
        const who = u.traveler_name ? \` (\${u.traveler_name})\` : (u.traveler_id ? \` (traveler \${u.traveler_id})\` : "");
        const line = u.booking_ref ? \`Reserved for booking \${u.booking_ref}\${who}\` : \`Reserved\${who}\`;
        events.push({ label: line, when: u.reserved_at || u.created_at || null });
      } else if (u.status === "released") {
        events.push({ label: "Released", when: u.released_at || u.created_at || null });
      } else if (u.status === "consumed") {
        const who = u.traveler_name ? \` (\${u.traveler_name})\` : (u.traveler_id ? \` (traveler \${u.traveler_id})\` : "");
        events.push({ label: \`Consumed\${who}\`, when: u.consumed_at || u.created_at || null });
      } else if (u.status === "archived") {
        events.push({ label: "Archived", when: u.created_at || null });
      } else if (u.status === "reactivated") {
        events.push({ label: "Reactivated", when: u.created_at || null });
      }
    });

  const hasMoreThanGenerated = events.length > 1;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[500px] bg-white border-l border-neutral-200 shadow-xl p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="font-mono text-lg font-semibold">{row.code}</div>
            <div className="flex items-center gap-2">
              <TypeChip t={row.type} />
              <StatusChip s={row.status} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={handleCopy} aria-label="Copy code">Copy</button>
            {cannotToggle ? (
              <button className="btn btn-ghost opacity-60 cursor-not-allowed" title="Consumed codes cannot be archived" disabled>Consumed</button>
            ) : canArchive && onToggleStatus ? (
              <button className="btn btn-ghost" onClick={handleArchive}>Archive</button>
            ) : canActivate && onToggleStatus ? (
              <button className="btn btn-primary" onClick={handleActivate}>Activate</button>
            ) : null}
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Assigned */}
          <section className="space-y-2">
            <h3 className="text-lg font-medium">Who it was assigned to</h3>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm text-neutral-600">Name</div>
              <div className="text-base text-neutral-700">{row.assigned_to_name || "Not assigned"}</div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-sm text-neutral-600">Email</div>
                  <div className="text-base text-neutral-700">{row.assigned_email || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600">Phone</div>
                  <div className="text-base text-neutral-700">{prettyPhone(row.assigned_phone)}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Code info */}
          <section className="space-y-2">
            <h3 className="text-lg font-medium">Code info</h3>
            <div className="rounded-2xl border bg-white p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-neutral-600">Created</div>
                <div className="text-base text-neutral-700">{fmtDateTime(row.created_at)}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-600">Updated</div>
                <div className="text-base text-neutral-700">{fmtDateTime(row.updated_at)}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-600">Used</div>
                <div className="text-base text-neutral-700">{yesNo(row.used_count || 0)}</div>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="space-y-2">
            <h3 className="text-lg font-medium">Code history</h3>
            <div className="rounded-2xl border bg-white p-4">
              {usageLoading ? (
                <div className="text-sm text-neutral-600">Loading…</div>
              ) : (
                <div className="space-y-3">
                  {events.map((ev, i) => (
                    <div key={i} className="text-sm">
                      <div className="text-neutral-700">{ev.label}</div>
                      <div className="text-xs text-neutral-500">{fmtDateTime(ev.when)}</div>
                    </div>
                  ))}
                  {!hasMoreThanGenerated && (
                    <div className="text-sm text-neutral-600">No events yet.</div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
`;
  writeWithBackup(file, content, "step5c");
})();

/* 3) Inject header action props into promos page (so drawer buttons work) */
(function patchPage(){
  const file = path.join("src","app","admin","promos","page.tsx");
  if (!fs.existsSync(file)) {
    console.warn("! page.tsx not found; please add onToggleStatus/onCopyCode props to <DetailsDrawer /> manually");
    return;
  }
  let s = fs.readFileSync(file, "utf8");

  // Ensure we pass the same onToggleStatus used by ListTable; and a copy handler
  if (s.includes("<DetailsDrawer") && !s.includes("onToggleStatus=")) {
    s = s.replace(/<DetailsDrawer([^>]*?)onClose=\{[^}]+\}([^>]*)\/>/s, (m, a1, a2) => {
      return `<DetailsDrawer${a1}onClose={onClose}${a2} onToggleStatus={onToggleStatus} onCopyCode={(c)=>navigator.clipboard.writeText(c)} />`;
    });
    // Fallback pattern if the previous didn't match self-closing usage
    if (!s.includes("onToggleStatus={onToggleStatus}")) {
      s = s.replace(/<DetailsDrawer([^>]*?)>/s, (m,a1) => {
        return `<DetailsDrawer${a1} onToggleStatus={onToggleStatus} onCopyCode={(c)=>navigator.clipboard.writeText(c)}>`;
      });
    }
    writeWithBackup(file, s, "step5c");
  } else {
    console.log("• page.tsx already appears to pass onToggleStatus or no <DetailsDrawer> match; skipping injection");
  }
})();
