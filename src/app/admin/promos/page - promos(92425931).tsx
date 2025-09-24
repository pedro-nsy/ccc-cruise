"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Design system constants
const CONTAINER = "mx-auto max-w-5xl px-4 sm:px-6 mt-6 sm:mt-8";
const CARD = "rounded-2xl border bg-white p-6";
const LABEL = "block text-sm font-medium";
const INPUT = "mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400";
const BTN_GHOST = "rounded-xl border px-4 py-2.5 bg-white hover:border-neutral-300";
const BTN_PRIMARY = "inline-flex items-center justify-center rounded-xl px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60";

type SortKey = "created" | "type" | "status";
const SORT_LABELS: Record<SortKey,string> = { created:"Created", type:"Type", status:"Status" };

type PromoRow = {
  id: string;
  code: string;
  type: "early_bird"|"artist"|"staff";
  status: "active"|"reserved"|"consumed"|"disabled";
  used_count: number;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  assigned_to_phone: string | null;
  note: string | null;
  created_at: string;
};

export default function AdminPromosPage() {
  const supabase = createClientComponentClient();
  const [sessionToken, setSessionToken] = useState<string>("");

  // Filters
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all"|"early_bird"|"artist"|"staff">("all");
  const [status, setStatus] = useState<"all"|"active"|"reserved"|"consumed"|"disabled">("all");
  const [used, setUsed] = useState<"all"|"yes"|"no">("all");
  const [assigned, setAssigned] = useState<"all"|"assigned"|"unassigned">("all");

  // Step 5B states
  const [sort, setSort] = useState<SortKey>("created");
  const [dir, setDir] = useState<"asc"|"desc">("desc");
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [items, setItems] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  useEffect(() => {
    // Grab access token for Bearer
    supabase.auth.getSession().then(({ data }) => {
      const tok = data.session?.access_token || "";
      setSessionToken(tok);
    });
  }, [supabase]);

  async function loadPromos() {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort, dir,
        limit: String(pageSize),
        offset: String(offset),
      });
      if (q) params.set("q", q);
      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);
      if (used !== "all") params.set("used", used);
      if (assigned !== "all") params.set("assigned", assigned);

      const res = await fetch(`/api/admin/promos?${params.toString()}`, {
        headers: { authorization: `Bearer ${sessionToken}` },
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load");
      setItems(json.items || []);
      setTotal(json.total || 0);
      setStats(json.stats || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPromos(); },
    [sessionToken, q, type, status, used, assigned, sort, dir, pageSize, page]);

  function SortHeader({ k }: { k: SortKey }) {
    const active = sort === k;
    const arrow = !active ? "" : (dir === "asc" ? "▲" : "▼");
    return (
      <button
        type="button"
        onClick={() => {
          if (active) setDir(dir === "asc" ? "desc" : "asc");
          else { setSort(k); setDir("asc"); }
          setPage(1);
        }}
        className="inline-flex items-center gap-1"
      >
        <span>{SORT_LABELS[k]}</span>
        {arrow && <span className="text-xs">{arrow}</span>}
      </button>
    );
  }

  function typeChip(t: PromoRow["type"]) {
    const base = "inline-flex items-center rounded-xl px-2.5 py-1 border text-xs";
    if (t === "early_bird") return <span className={`${base} bg-green-50 text-green-700 border-green-200`}>Early Bird (15%)</span>;
    if (t === "artist")     return <span className={`${base} bg-amber-50 text-amber-800 border-amber-300`}>Artist (50%)</span>;
    return                    <span className={`${base} bg-neutral-50 text-neutral-700 border-neutral-200`}>Staff</span>;
  }

  return (
    <main className={CONTAINER}>
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Promo codes</h1>
        <p className="text-neutral-700">Search, sort, and manage codes. Disabled codes are excluded from stats.</p>
      </header>

      <section className={`${CARD} mt-6 space-y-6`}>
        {/* Filters (mobile-first) */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL}>Search</label>
            <input className={INPUT} value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} placeholder="Code, note, assignee…" />
          </div>
          <div>
            <label className={LABEL}>Type</label>
            <select className={INPUT} value={type} onChange={(e)=>{ setType(e.target.value as any); setPage(1); }}>
              <option value="all">All</option>
              <option value="early_bird">Early Bird</option>
              <option value="artist">Artist</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select className={INPUT} value={status} onChange={(e)=>{ setStatus(e.target.value as any); setPage(1); }}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="reserved">Reserved</option>
              <option value="consumed">Consumed</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Used</label>
            <select className={INPUT} value={used} onChange={(e)=>{ setUsed(e.target.value as any); setPage(1); }}>
              <option value="all">All</option>
              <option value="yes">Used &gt; 0</option>
              <option value="no">Never used</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Assigned</label>
            <select className={INPUT} value={assigned} onChange={(e)=>{ setAssigned(e.target.value as any); setPage(1); }}>
              <option value="all">All</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {/* Mobile sort select */}
          <div className="sm:hidden">
            <label className={LABEL}>Sort</label>
            <select
              className={INPUT}
              value={`${sort}:${dir}`}
              onChange={(e)=>{
                const [s,d] = e.target.value.split(":");
                setSort(s as SortKey);
                setDir(d as "asc"|"desc");
                setPage(1);
              }}
            >
              <option value="created:desc">Created (newest)</option>
              <option value="created:asc">Created (oldest)</option>
              <option value="type:asc">Type (A→Z)</option>
              <option value="type:desc">Type (Z→A)</option>
              <option value="status:asc">Status (A→Z)</option>
              <option value="status:desc">Status (Z→A)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-neutral-600">
                <th className="py-2 px-3"><SortHeader k="type" /></th>
                <th className="py-2 px-3"><SortHeader k="status" /></th>
                <th className="py-2 px-3">Code</th>
                <th className="py-2 px-3 hidden md:table-cell">Assigned to</th>
                <th className="py-2 px-3 hidden md:table-cell">Used</th>
                <th className="py-2 px-3 hidden md:table-cell"><SortHeader k="created" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!loading && items.length === 0 && (
                <tr><td className="py-6 px-3 text-neutral-600" colSpan={6}>No results</td></tr>
              )}
              {items.map((row) => (
                <tr key={row.id} className="text-sm">
                  <td className="py-3 px-3">{typeChip(row.type)}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center rounded-xl px-2.5 py-1 border text-xs bg-neutral-50 text-neutral-700 border-neutral-200">
                      {row.status.charAt(0).toUpperCase()+row.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium">{row.code}</td>
                  <td className="py-3 px-3 hidden md:table-cell">
                    {row.assigned_to_name || row.assigned_to_email || row.assigned_to_phone ? (
                      <div className="text-neutral-700">
                        {row.assigned_to_name || ""}
                        <div className="text-xs text-neutral-500">
                          {[row.assigned_to_email, row.assigned_to_phone].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                    ) : <span className="text-neutral-500">—</span>}
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell">{row.used_count || 0}</td>
                  <td className="py-3 px-3 hidden md:table-cell text-neutral-600">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer controls */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            {total === 0 ? "No results" : `Showing ${offset + 1}–${Math.min(offset + pageSize, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-neutral-600">Rows</label>
            <select
              className="rounded-xl border border-neutral-300 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              value={pageSize}
              onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className="flex items-center gap-2">
              <button className={BTN_GHOST} disabled={page === 1} onClick={()=> setPage(p=>Math.max(1, p-1))}>Prev</button>
              <button className={BTN_GHOST} disabled={offset + pageSize >= total} onClick={()=> setPage(p=> p+1)}>Next</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
