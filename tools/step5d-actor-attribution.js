const fs = require("fs");
const path = require("path");

function ensureDir(p){ const d = path.dirname(p); if (!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function backupWrite(file, content, tag){
  ensureDir(file);
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.writeFileSync(file, content, "utf8");
  console.log("✓ wrote", file, "backup:", fs.existsSync(bak) ? bak : "(none)");
}

/* A) Update /api/admin/promos list+create */
(function patchPromosRoute(){
  const file = path.join("src","app","api","admin","promos","route.ts");
  if (!fs.existsSync(file)) { console.warn("! promos route.ts not found"); return; }
  let s = fs.readFileSync(file, "utf8");

  // 1) Include created_by_* in the list selection if missing
  s = s.replace(
    /select\("id,\s*code,\s*type,\s*status,\s*assigned_to_name,\s*created_at"/,
    'select("id, code, type, status, assigned_to_name, created_at, created_by_user_id, created_by_email"'
  );

  // 2) In POST, parse Authorization JWT to capture actor
  if (!s.includes("/*__ACTOR_PARSE__*/")) {
    s = s.replace(/export async function POST\(req: Request\) \{/, `export async function POST(req: Request) {
  /*__ACTOR_PARSE__*/
  let actorEmail: string | null = null;
  let actorId: string | null = null;
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.split(" ")[1] || "";
    const b64 = token.split(".")[1];
    if (b64) {
      const json = JSON.parse(Buffer.from(b64.replace(/-/g,"+").replace(/_/g,"/"), "base64").toString("utf8"));
      actorEmail = json?.email ?? null;
      actorId = json?.sub ?? json?.user_metadata?.sub ?? null;
    }
  } catch {}
`);
  }

  // 3) Add created_by_* to inserted rows
  s = s.replace(
    /batch\.push\(\{ code, type, status: "active" \}\);\s*/g,
    'batch.push({ code, type, status: "active", created_by_user_id: actorId, created_by_email: actorEmail });\n'
  );

  backupWrite(file, s, "step5d");
})();

/* B) Replace /usage route to include actor_email + traveler_name */
(function writeUsageRoute(){
  const file = path.join("src","app","api","admin","promos","[id]","usage","route.ts");
  if (!fs.existsSync(file)) { console.warn("! usage route.ts not found"); return; }
  const content = `import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req);
  if ("error" in gate) return gate.error;

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("promo_usages")
    .select(\`
      id,
      promo_code_id,
      booking_ref,
      traveler_id,
      status,
      reserved_at,
      consumed_at,
      released_at,
      created_at,
      updated_at,
      actor_user_id,
      actor_email,
      traveler:travelers!promo_usages_traveler_id_fkey (
        first_name,
        last_name
      )
    \`)
    .eq("promo_code_id", params.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const items = (data || []).map((row: any) => {
    const t = row?.traveler || null;
    const traveler_name = t
      ? [t.first_name, t.last_name].filter(Boolean).join(" ").trim() || null
      : null;
    const { traveler, ...rest } = row || {};
    return { ...rest, traveler_name };
  });

  return NextResponse.json({ ok: true, items });
}
`;
  backupWrite(file, content, "step5d");
})();

/* C) Overwrite DetailsDrawer to show "by ..." and generated-by */
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
  actor_email?: string | null;
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

  const [justCopied, setJustCopied] = React.useState(false);

  function handleCopy(){
    if (onCopyCode) return onCopyCode(row.code);
    try { navigator.clipboard.writeText(row.code); } catch {}
    setJustCopied(true);
    setTimeout(()=>setJustCopied(false), 1200);
  }
  function handleArchive(){ if (onToggleStatus) onToggleStatus(row.id, "archived"); }
  function handleActivate(){ if (onToggleStatus) onToggleStatus(row.id, "active"); }

  // Build timeline: Generated (+ actor if available) + mapped usage events, oldest -> newest
  const events: Array<{ label: string; sub?: string; when?: string | null }> = [];
  const genBy = row.created_by_email ? \` by \${row.created_by_email}\` : "";
  events.push({ label: \`Generated\${genBy}\`, when: row.created_at });

  (usage || [])
    .slice()
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
        const by = u.actor_email ? \` by \${u.actor_email}\` : "";
        events.push({ label: \`Archived\${by}\`, when: u.created_at || null });
      } else if (u.status === "reactivated") {
        const by = u.actor_email ? \` by \${u.actor_email}\` : "";
        events.push({ label: \`Reactivated\${by}\`, when: u.created_at || null });
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
            <span className="text-xs text-neutral-500" aria-live="polite">{justCopied ? "Copied" : ""}</span>
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
                {row.created_by_email ? (
                  <div className="text-xs text-neutral-600 mt-1">Generated by {row.created_by_email}</div>
                ) : null}
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
  backupWrite(file, content, "step5d");
})();
