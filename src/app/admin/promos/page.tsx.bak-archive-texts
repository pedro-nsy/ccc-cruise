"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";

// Sections
import Header from "./sections/Header";
import StatsStrip from "./sections/StatsStrip";
import FiltersBar from "./sections/FiltersBar";
import GeneratorForm from "./sections/GeneratorForm";
import ListTable from "./sections/ListTable";
import DetailsDrawer from "./sections/DetailsDrawer";

// Shared state (URL-synced; server-driven)
import { useAdminPromos, type Promo, type UsageRow } from "./hooks/useAdminPromos";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPromosPage() {
  // --- Hook model: holds items/stats/filters and server calls ---
  const model = useAdminPromos();

  // --- Keep your existing auth guard behavior (redirect if no session) ---
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token || "";
      if (!token && alive) window.location.href = "/admin/login";
    });
    return () => { alive = false; };
  }, []);

  // --- Local-only UI state (unchanged) ---
  const [openId, setOpenId] = useState<string | number | null>(null);
  const [openRow, setOpenRow] = useState<Promo | null>(null);
  const [usage, setUsage] = useState<UsageRow[] | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const [genType, setGenType] = useState<""|"early_bird"|"artist"|"staff">("");
  const [qty, setQty] = useState(10);
  const [meta, setMeta] = useState({ name: "", email: "", phone: "", note: "" });
  const [genMsg, setGenMsg] = useState("");

  // ---- Handlers (same UX; now they call the hook methods) ----
  const onSearch = () => {
    model.onSearch(); // writes URL + fetches; keeps “Search-only” rule
  };

  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast.success("Code copied"); }
    catch { toast.error("Couldn’t copy"); }
  };

  const toggleStatus = async (id: string|number, to: "active"|"disabled") => {
    const res = await model.toggleStatus(id, to);
    if (res.ok) {
      toast.success(to === "active" ? "Code enabled" : "Code disabled");
      model.fetchList();
    } else {
      toast.error("Update failed");
    }
  };

  const openDetails = async (row: Promo) => {
    setOpenRow(row); setOpenId(row.id); setUsage(null); setUsageLoading(true);
    const { ok, items } = await model.loadUsage(row.id);
    setUsage(ok ? items : []);
    if (!ok) toast.error("Failed to load history");
    setUsageLoading(false);
  };
  const closeDetails = () => { setOpenId(null); setOpenRow(null); setUsage(null); };

  const createCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenMsg("");
    if (!genType) { setGenMsg("Choose a promo type."); return; }
    const payload = {
      type: genType, qty,
      assigned_to_name: meta.name || null,
      assigned_email:  meta.email || null,
      assigned_phone:  meta.phone || null,
      note:            meta.note || null,
    };
    const { ok, data } = await model.createCodes(payload);
    if (!ok) {
      setGenMsg(data?.error || "Failed to create codes.");
      toast.error("Create failed");
      return;
    }
    const created = data?.created ?? 0;
    setGenMsg(`Created ${created} codes.`);
    toast.success(`Created ${created} code${created === 1 ? "" : "s"}`);
    model.fetchList();
  };

  // Visuals unchanged
  const filtered = useMemo(() => model.items, [model.items]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 mt-8">
      <Toaster position="top-right" />

      <Header />

      <StatsStrip stats={model.stats} />

      <FiltersBar
        q={model.filters.q}
        type={model.filters.type}
        status={model.filters.status}
        used={model.filters.used}
        setQ={(v)=>model.setFilters({ q: v })}
        setType={(v)=>model.setFilters({ type: v as any })}
        setStatus={(v)=>model.setFilters({ status: v as any })}
        setUsed={(v)=>model.setFilters({ used: v as any })}
        onSearch={onSearch}
      />

      <GeneratorForm
        genType={genType} setGenType={setGenType}
        qty={qty} setQty={setQty}
        meta={meta} setMeta={setMeta}
        genMsg={genMsg}
        onSubmit={createCodes}
      />

      <ListTable
        items={filtered}
        loading={model.loading}
        onCopy={copyCode}
        onToggleStatus={toggleStatus}
        onOpenDetails={openDetails}
      />

      {openId && openRow && (
        <DetailsDrawer
          row={openRow}
          usage={usage}
          usageLoading={usageLoading}
          onClose={closeDetails}
        />
      )}
    </main>
  );
}
