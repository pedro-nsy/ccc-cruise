"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";
import { Info } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Promo = {
  id: string | number;
  code: string;
  type: "early_bird" | "artist" | "staff";
  status: "active" | "disabled";
  used_count: number;
  created_at: string;
  updated_at: string;
  assigned_to_name: string | null;
  assigned_email: string | null;
  assigned_phone: string | null;
  expires_at: string | null;
  created_by: string | null;
};

type Stats = {
  created: { early_bird: number; artist: number; staff: number; total: number };
  used:    { early_bird: number; artist: number; staff: number; total: number };
  caps:    { early_bird: number; artist: number; staff: null };
};

type UsageRow = {
  id: string;
  booking_ref: string;
  traveler_id: string | null;
  status: "reserved" | "consumed" | "released";
  reserved_at: string | null;
  consumed_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminPromosPage() {
  const [sessionToken, setSessionToken] = useState<string>("");

  const [items, setItems] = useState<Promo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [used, setUsed] = useState("");          // "", "yes", "no"
  const [assigned, setAssigned] = useState("");  // "", "assigned", "unassigned"
  const [loading, setLoading] = useState(true);

  // details drawer
  const [openId, setOpenId] = useState<string | number | null>(null);
  const [openRow, setOpenRow] = useState<Promo | null>(null);
  const [usage, setUsage] = useState<UsageRow[] | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // (temp) generator
  const [genType, setGenType] = useState<""|"early_bird"|"artist"|"staff">("");
  const [qty, setQty] = useState(10);
  const [meta, setMeta] = useState({ name: "", email: "", phone: "", note: "" });
  const [genMsg, setGenMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || "";
      if (!token) { window.location.href = "/admin/login"; return; }
      if (alive) setSessionToken(token);
    })();
    return () => { alive = false; };
  }, []);

  async function fetchList() {
    if (!sessionToken) return;
    setLoading(true);
    const u = new URL("/api/admin/promos", window.location.origin);
    if (q) u.searchParams.set("q", q.trim().toUpperCase());
    if (type) u.searchParams.set("type", type);
    if (status) u.searchParams.set("status", status);
    if (used) u.searchParams.set("used", used);
    if (assigned) u.searchParams.set("assigned", assigned);

    const res = await fetch(u.toString(), { headers: { authorization: `Bearer ${sessionToken}` }});
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(data.items || []);
      setStats(data.stats || null);
    } else {
      toast.error(data?.error || "Failed to load promos");
    }
    setLoading(false);
  }
  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [sessionToken]);

  async function toggleStatus(id: string|number, to: "active"|"disabled") {
    if (!sessionToken) return;
    const res = await fetch(`/api/admin/promos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ status: to }),
    });
    if (res.ok) { toast.success(to === "active" ? "Code enabled" : "Code disabled"); fetchList(); }
    else {
      try { const j = await res.json(); toast.error(j?.error || "Update failed"); }
      catch { toast.error("Update failed"); }
    }
  }

  async function copyCode(code: string) {
    try { await navigator.clipboard.writeText(code); toast.success("Code copied"); }
    catch { toast.error("Couldn’t copy"); }
  }

  async function openDetails(row: Promo) {
    setOpenRow(row); setOpenId(row.id); setUsage(null); setUsageLoading(true);
    try {
      const res = await fetch(`/api/admin/promos/${row.id}/usage`, { headers: { authorization: `Bearer ${sessionToken}` }});
      const data = await res.json().catch(() => ({}));
      if (res.ok) setUsage(data.items || []);
      else toast.error(data?.error || "Failed to load history");
    } finally { setUsageLoading(false); }
  }
  function closeDetails(){ setOpenId(null); setOpenRow(null); setUsage(null); }

  async function createCodes(e: React.FormEvent) {
    e.preventDefault();
    setGenMsg("");
    if (!sessionToken) { setGenMsg("No session."); return; }
    if (!genType) { setGenMsg("Choose a promo type."); return; }
    const payload = {
      type: genType, qty,
      assigned_to_name: meta.name || null,
      assigned_email: meta.email || null,
      assigned_phone: meta.phone || null,
      note: meta.note || null,
    };
    const res = await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setGenMsg(data?.error || "Failed to create codes."); toast.error("Create failed"); return; }
    setGenMsg(`Created ${data.created} codes.`);
    toast.success(`Created ${data.created} code${data.created === 1 ? "" : "s"}`);
    fetchList();
  }

  const filtered = useMemo(() => items, [items]);

  // UI helpers
  function TypeChip({ t }: { t: Promo["type"] }) {
    const label = t === "early_bird" ? "Early Bird (15%)" : t === "artist" ? "Artist (50%)" : "Staff";
    const color =
      t === "early_bird" ? "border-blue-300 text-blue-700 bg-blue-50" :
      t === "artist"     ? "border-purple-300 text-purple-700 bg-purple-50" :
                           "border-green-200 text-green-700 bg-green-50";
    return <span className={`inline-flex items-center rounded-xl px-2.5 py-1 border text-xs ${color}`}>{label}</span>;
  }
  function StatusChip({ s }: { s: Promo["status"] }) {
    const label = s === "active" ? "active" : "disabled";
    const color = s === "active" ? "border-neutral-300 text-neutral-700 bg-neutral-50" : "border-amber-300 text-amber-800 bg-amber-50";
    return <span className={`inline-flex items-center rounded-xl px-2.5 py-1 border text-xs ${color}`}>{label}</span>;
  }
  function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return iso; }
  }
  function yesNo(n: number) { return n > 0 ? "Yes" : "No"; }
  function prettyPhone(s?: string | null) {
    if (!s) return "—";
    const digits = s.replace(/[^\d+]/g, "");
    const m = digits.match(/^(\+?\d{1,3})?(\d{3})?(\d{3,4})?(\d{4})?$/);
    if (!m) return s;
    const cc = m[1] || ""; const a = m[2] || ""; const b = m[3] || ""; const c = m[4] || "";
    if (cc && a && b && c) return `${cc} (${a}) ${b}-${c}`;
    return s;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 mt-8">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Promo codes</h1>
        <p className="text-neutral-700">Generate, search, and manage promo codes.</p>
      </header>

      {/* Stats (two-line layout; disabled codes ignored by API) */}
<section className="rounded-2xl border bg-white p-6 space-y-4">
  <p className="text-neutral-700">Here’s the current promo code status</p>
  {!stats ? (
    <div className="text-sm text-neutral-600">Loading…</div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:divide-x md:divide-neutral-200">

      {/* Early Bird */}
      <div className="px-0 md:pr-6">
        <div className="text-base text-neutral-700 font-medium">Early Bird codes</div>
        <div className="text-neutral-700">
          <span className="font-semibold">{stats.created.early_bird}</span> / {stats.caps.early_bird} created
        </div>
        <div className="text-neutral-600">
          <span className="font-semibold">{stats.used.early_bird}</span> / {stats.created.early_bird} used
        </div>
      </div>

      {/* Artist */}
      <div className="px-0 md:pr-6">
        <div className="text-base text-neutral-700 font-medium">Artist codes</div>
        <div className="text-neutral-700">
          <span className="font-semibold">{stats.created.artist}</span> / {stats.caps.artist} created
        </div>
        <div className="text-neutral-600">
          <span className="font-semibold">{stats.used.artist}</span> / {stats.created.artist} used
        </div>
      </div>

      {/* Staff */}
      <div className="px-0 md:pr-6">
        <div className="text-base text-neutral-700 font-medium">Staff codes</div>
        <div className="text-neutral-700">
          <span className="font-semibold">{stats.created.staff}</span> created
        </div>
        <div className="text-neutral-600">
          <span className="font-semibold">{stats.used.staff}</span> / {stats.created.staff} used
        </div>
      </div>

      {/* Total */}
      <div className="px-0">
        <div className="text-base text-neutral-700 font-medium">Total</div>
        <div className="text-neutral-700">
          <span className="font-semibold">{stats.created.total}</span> created so far
        </div>
        <div className="text-neutral-600">
          <span className="font-semibold">{stats.used.total}</span> / {stats.created.total} used so far
        </div>
      </div>

    </div>
  )}
</section>

      {/* Sticky filters */}
      <div className="sticky top-20 z-10">
        <div className="rounded-2xl border bg-white/80 backdrop-blur p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input className="rounded-xl border border-neutral-300 px-3 py-2"
                   placeholder="Search code…"
                   value={q}
                   onChange={e => setQ(e.target.value)} />
            <select className="rounded-xl border border-neutral-300 px-3 py-2" value={type} onChange={e => setType(e.target.value)}>
              <option value="">All types</option>
              <option value="early_bird">Early Bird</option>
              <option value="artist">Artist</option>
              <option value="staff">Staff</option>
            </select>
            <select className="rounded-xl border border-neutral-300 px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <select className="rounded-xl border border-neutral-300 px-3 py-2" value={used} onChange={e => setUsed(e.target.value)}>
              <option value="">Used (all)</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <select className="rounded-xl border border-neutral-300 px-3 py-2" value={assigned} onChange={e => setAssigned(e.target.value)}>
              <option value="">Assigned (all)</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <button type="button" className="btn btn-primary" onClick={fetchList}>Search</button>
          </div>
        </div>
      </div>

      {/* Create codes (temp) */}
      <form onSubmit={createCodes} className="rounded-2xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium">Create codes</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select className="rounded-xl border border-neutral-300 px-3 py-2"
                  value={genType} onChange={e => setGenType(e.target.value as any)}>
            <option value="">Select type</option>
            <option value="early_bird">Early Bird</option>
            <option value="artist">Artist</option>
            <option value="staff">Staff</option>
          </select>
          <input type="number" min={1} max={500}
                 className="rounded-xl border border-neutral-300 px-3 py-2"
                 value={qty} onChange={e => setQty(parseInt(e.target.value || "1",10))} />
          <input placeholder="Assigned to (name)" className="rounded-xl border border-neutral-300 px-3 py-2"
                 value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} />
          <input placeholder="Assigned email" className="rounded-xl border border-neutral-300 px-3 py-2"
                 value={meta.email} onChange={e => setMeta(m => ({ ...m, email: e.target.value }))} />
          <input placeholder="Assigned phone" className="rounded-xl border border-neutral-300 px-3 py-2"
                 value={meta.phone} onChange={e => setMeta(m => ({ ...m, phone: e.target.value }))} />
          <input placeholder="Note" className="rounded-xl border border-neutral-300 px-3 py-2"
                 value={meta.note} onChange={e => setMeta(m => ({ ...m, note: e.target.value }))} />
        </div>
        {genMsg && <div className="text-sm text-neutral-700">{genMsg}</div>}
        <div className="flex items-center justify-end">
          <button className="btn btn-primary">Create</button>
        </div>
      </form>

      {/* List */}
      <section className="rounded-2xl border bg-white p-6">
        {loading ? (
          <div className="text-sm text-neutral-600">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-neutral-50 p-4 text-sm">
            No codes match your filters. Try adjusting search or filters.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-12 text-sm font-medium text-neutral-600">
              <div className="col-span-3">Code</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Used</div>
              <div className="col-span-2">Assigned to</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {filtered.map((p) => (
              <div key={String(p.id)} className="grid grid-cols-12 items-center text-sm py-2 border-t">
                {/* Code + Copy */}
                <div className="col-span-3 font-mono font-semibold flex items-center gap-2">
                  {p.code}
                  <button className="px-2 py-1 text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-200 rounded"
                          title="Copy code" onClick={() => copyCode(p.code)}>Copy</button>
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
                  {p.status === "active" ? (
                    <button className="btn btn-ghost" onClick={() => toggleStatus(p.id, "disabled")}>Disable</button>
                  ) : (
                    <button className="btn btn-primary" onClick={() => toggleStatus(p.id, "active")}>Enable</button>
                  )}
                  <button className="btn btn-ghost inline-flex items-center gap-1" onClick={() => openDetails(p)}>
                    <Info className="w-4 h-4" /> Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Right-side Details Drawer */}
      {openId && openRow && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={closeDetails} />
          <aside className="absolute right-0 top-0 h-full w-full sm:w-[500px] bg-white border-l border-neutral-200 shadow-xl p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="font-mono text-lg font-semibold">{openRow.code}</div>
                <div className="flex items-center gap-2">
                  <TypeChip t={openRow.type} />
                  <StatusChip s={openRow.status} />
                </div>
              </div>
              <button className="btn btn-ghost" onClick={closeDetails}>Close</button>
            </div>

            <div className="mt-6 space-y-6">
              {/* Assigned */}
              <section className="space-y-2">
                <h3 className="text-lg font-medium">Who it was assigned to</h3>
                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-sm text-neutral-600">Name</div>
                  <div className="text-base text-neutral-700">{openRow.assigned_to_name || "Not assigned"}</div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <div className="text-sm text-neutral-600">Email</div>
                      <div className="text-base text-neutral-700">{openRow.assigned_email || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-neutral-600">Phone</div>
                      <div className="text-base text-neutral-700">{prettyPhone(openRow.assigned_phone)}</div>
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
                    <div className="text-base text-neutral-700">{fmtDate(openRow.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-600">Updated</div>
                    <div className="text-base text-neutral-700">{fmtDate(openRow.updated_at)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-600">Used</div>
                    <div className="text-base text-neutral-700">{yesNo(openRow.used_count)}</div>
                  </div>
                </div>
              </section>

              {/* Code history */}
              <section className="space-y-2">
                <h3 className="text-lg font-medium">Code history</h3>
                <div className="rounded-2xl border bg-white p-4">
                  {usageLoading ? (
                    <div className="text-sm text-neutral-600">Loading…</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <div className="text-neutral-700">
                          {openRow.created_by ? `Created by ${openRow.created_by}` : "Created"}
                        </div>
                        <div className="text-xs text-neutral-500">{new Date(openRow.created_at).toLocaleString()}</div>
                      </div>

                      {!usage || usage.length === 0 ? (
                        <div className="text-sm text-neutral-600">No other events yet.</div>
                      ) : (
                        usage.map(u => {
                          const when =
                            u.status === "reserved" ? u.reserved_at :
                            u.status === "consumed" ? u.consumed_at :
                            u.released_at;
                          const whenTxt = when ? new Date(when).toLocaleString() : "";
                          const line =
                            u.status === "reserved"
                              ? `Reserved for booking ${u.booking_ref}${u.traveler_id ? ` (traveler ${u.traveler_id})` : ""}`
                              : u.status === "consumed"
                                ? "Consumed"
                                : "Released";
                          return (
                            <div key={u.id} className="text-sm">
                              <div className="text-neutral-700">{line}</div>
                              <div className="text-xs text-neutral-500">{whenTxt}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

