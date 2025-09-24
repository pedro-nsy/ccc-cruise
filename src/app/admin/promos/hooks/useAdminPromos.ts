import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ===== Types (match page usage) =====
export type Promo = {
  id: string | number;
  code: string;
  type: "early_bird" | "artist" | "staff";
  status: "active" | "disabled" | "reserved" | "consumed";
  used_count: number;
  created_at: string;
  updated_at: string;
  assigned_to_name: string | null;
  assigned_email: string | null;
  assigned_phone: string | null;
  expires_at: string | null;
  created_by: string | null;
};

export type Stats = {
  created: { early_bird: number; artist: number; staff: number; total: number };
  used:    { early_bird: number; artist: number; staff: number; total: number };
  caps:    { early_bird: number | null; artist: number | null; staff: number | null };
};

export type UsageRow = {
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

export type SortKey = "created" | "type" | "status";

type Filters = {
  q: string;
  type: "" | "early_bird" | "artist" | "staff";
  status: "" | "active" | "reserved" | "consumed" | "disabled";
  used: "" | "yes" | "no";
};

export function useAdminPromos() {
  // --- Auth token ---
  const [token, setToken] = useState<string>("");
  useEffect(() => {
    let on = true;
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token || "";
      if (on) setToken(t);
    });
    return () => { on = false; };
  }, []);

  // --- URL state (read once)
  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;

  const [filters, setFiltersState] = useState<Filters>(() => ({
    q: url?.searchParams.get("q") ?? "",
    type: (url?.searchParams.get("type") ?? "") as Filters["type"],
    status: (url?.searchParams.get("status") ?? "") as Filters["status"],
    used: (url?.searchParams.get("used") ?? "") as Filters["used"],
  }));

  const [sort, setSort] = useState<SortKey>((url?.searchParams.get("sort") as SortKey) || "created");
  const [dir, setDir] = useState<"asc"|"desc">((url?.searchParams.get("dir") as "asc"|"desc") || "desc");
  const [pageSize, setPageSize] = useState<number>(parseInt(url?.searchParams.get("pageSize") || "50",10) || 50);
  const [page, setPage] = useState<number>(parseInt(url?.searchParams.get("page") || "1",10) || 1);
  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  // --- Data state ---
  const [items, setItems] = useState<Promo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // --- URL writer (no fetch) ---
  const writeUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const { q, type, status, used } = filters;
    const set = (k: string, v: string) => { if (v) u.searchParams.set(k, v); else u.searchParams.delete(k); };
    set("q", q.trim());
    set("type", type);
    set("status", status);
    set("used", used);
    u.searchParams.set("sort", sort);
    u.searchParams.set("dir", dir);
    u.searchParams.set("pageSize", String(pageSize));
    u.searchParams.set("page", String(page));
    window.history.replaceState({}, "", u.toString());
  }, [filters, sort, dir, pageSize, page]);

  // --- Fetch list (server-driven) ---
  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const u = new URL("/api/admin/promos", window.location.origin);
      const { q, type, status, used } = filters;
      if (q) u.searchParams.set("q", q.trim());
      if (type) u.searchParams.set("type", type);
      if (status) u.searchParams.set("status", status);
      if (used) u.searchParams.set("used", used);
      u.searchParams.set("sort", sort);
      u.searchParams.set("dir", dir);
      u.searchParams.set("limit", String(pageSize));
      u.searchParams.set("offset", String(offset));

      const res = await fetch(u.toString(), { headers: { authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "Failed to load promos");

      setItems(json.items || []);
      setStats(json.stats || null);
      setTotal(typeof json.total === "number" ? json.total : (json.items?.length || 0));
    } finally {
      setLoading(false);
    }
  }, [token, filters, sort, dir, pageSize, offset]);

  // Initial load after token appears
  const init = useRef(false);
  useEffect(() => {
    if (!init.current && token) {
      init.current = true;
      fetchList();
    }
  }, [token, fetchList]);

  // Keep URL in sync after changes (no auto-fetch except when you call onSearch or sort/page change flows)
  useEffect(() => {
    if (!init.current) return;
    writeUrl();
  }, [filters, sort, dir, pageSize, page, writeUrl]);

  // --- Public API for the page ---
  const setFilters = useCallback((next: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...next }));
    setPage(1);
  }, []);

  const onSearch = useCallback(() => {
    writeUrl();
    fetchList();
  }, [writeUrl, fetchList]);

  const onSort = useCallback((k: SortKey) => {
    if (k === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(k); setDir("asc"); }
    setPage(1);
  }, [sort]);

  const setPageSafe = useCallback((p: number) => { setPage(p); }, []);
  const setPageSizeSafe = useCallback((s: number) => { setPageSize(s); setPage(1); }, []);

  const toggleStatus = useCallback(async (id: string|number, to: "active"|"disabled") => {
    if (!token) return { ok: false };
    const res = await fetch(`/api/admin/promos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: to }),
    });
    return { ok: res.ok };
  }, [token]);

  const createCodes = useCallback(async (payload: any) => {
    if (!token) return { ok: false };
    const res = await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, data: json };
  }, [token]);

  const loadUsage = useCallback(async (id: string|number) => {
    if (!token) return { ok: false, items: [] as UsageRow[] };
    const res = await fetch(`/api/admin/promos/${id}/usage`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, items: (json.items || []) as UsageRow[] };
  }, [token]);

  return {
    // data
    items, stats, total, loading,
    // filters/sort/paging
    filters, setFilters,
    sort, dir, page, pageSize, offset,
    // actions
    onSearch, onSort, setPage: setPageSafe, setPageSize: setPageSizeSafe,
    fetchList, toggleStatus, createCodes, loadUsage,
  };
}
