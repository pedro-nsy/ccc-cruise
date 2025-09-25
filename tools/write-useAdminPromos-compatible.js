// node tools/write-useAdminPromos-compatible.js
const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-compat-step1b";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

const content = `\"use client\";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// ---- Types expected by page.tsx ----
export type Promo = {
  id: string | number;
  code: string;
  type: "early_bird" | "artist" | "staff";
  status: "active" | "archived" | "reserved" | "consumed";
  used_count: number;
  assigned_to_name: string | null;
  created_at?: string | null;
};
export type UsageRow = {
  id: string | number;
  when: string;
  kind: string;
  message?: string | null;
};

// Try to obtain a Supabase token if the client is available.
// If not, we still work (API may accept without auth per your setup).
let getTokenOnce: () => Promise<string | ""> = async () => "";
try {
  // @ts-ignore
  const { createClientComponentClient } = require("@supabase/auth-helpers-nextjs");
  const supabase = createClientComponentClient();
  getTokenOnce = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  };
} catch {}

// ---- Hook API expected by page.tsx ----
export function useAdminPromos() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // URL params (single source of truth)
  const q0      = (sp.get("q") ?? "").trim();
  const type0   = (sp.get("type") ?? "all").toLowerCase();
  let   status0 = (sp.get("status") ?? "all").toLowerCase();
  const used0   = (sp.get("used") ?? "all").toLowerCase();
  const sort0   = (sp.get("sort") ?? "created").toLowerCase();
  const dir0    = (sp.get("dir") === "asc" ? "asc" : "desc");
  const page0   = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit0  = Math.min(200, Math.max(1, parseInt(sp.get("limit") ?? "25", 10)));
  if (status0 === "disabled") status0 = "archived"; // legacy

  // Filters object for the page
  const filters = useMemo(() => ({
    q: q0,
    type: (type0 === "all" ? "" : type0) as ""|"early_bird"|"artist"|"staff",
    status: (status0 === "all" ? "" : status0) as ""|"active"|"archived"|"reserved"|"consumed",
    used: (used0 === "all" ? "" : used0) as ""|"yes"|"no",
  }), [q0, type0, status0, used0]);

  // Internal state
  const [items, setItems] = useState<Promo[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [token, setToken] = useState<string>("");

  // Get token once
  useEffect(() => {
    let on = true;
    getTokenOnce().then(t => { if (on) setToken(t || ""); });
    return () => { on = false; };
  }, []);

  // Helper to build a new URL from current params
  const makeUrl = useCallback((patch?: Record<string,string|null|undefined>) => {
    const url = new URL(window.location.origin + pathname + "?" + sp.toString());
    const set = (k: string, v: string | null | undefined) => {
      if (!v || v === "all" || v === "") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    };
    if (patch) {
      for (const [k,v] of Object.entries(patch)) set(k, v ?? null);
    }
    return url;
  }, [pathname, sp]);

  // setFilters expected by page: merge partial and reset page=1
  const setFilters = useCallback((partial: Partial<{ q:string; type:""|"early_bird"|"artist"|"staff"; status:""|"active"|"archived"|"reserved"|"consumed"; used:""|"yes"|"no" }>>) => {
    const url = makeUrl({
      q: partial.q ?? q0,
      type: (partial.type ?? (type0 === "all" ? "" : type0)) || null,
      status: (partial.status ?? (status0 === "all" ? "" : status0)) || null,
      used: (partial.used ?? (used0 === "all" ? "" : used0)) || null,
      page: "1",
    });
    router.replace(url.toString(), { scroll: false });
  }, [makeUrl, router, q0, type0, status0, used0]);

  // onSearch expected by page: keep current filters, ensure page=1
  const onSearch = useCallback(() => {
    const url = makeUrl({ page: "1" });
    router.replace(url.toString(), { scroll: false });
  }, [makeUrl, router]);

  // Build API URL
  const apiUrl = useMemo(() => {
    const u = new URL("/api/admin/promos", window.location.origin);
    if (q0) u.searchParams.set("q", q0);
    if (type0 && type0 !== "all") u.searchParams.set("type", type0);
    if (status0 && status0 !== "all") u.searchParams.set("status", status0);
    if (used0 && used0 !== "all") u.searchParams.set("used", used0);
    u.searchParams.set("sort", sort0);
    u.searchParams.set("dir", dir0);
    u.searchParams.set("page", String(page0));
    u.searchParams.set("limit", String(limit0));
    return u;
  }, [q0, type0, status0, used0, sort0, dir0, page0, limit0]);

  // Fetch list with AbortController
  const abortRef = useRef<AbortController | null>(null);
  const fetchList = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch(apiUrl.toString(), {
        headers: token ? { authorization: \`Bearer \${token}\` } : {},
        signal: ac.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || json?.message || "Failed to load promos");
      setItems(json.items || []);
      setStats(json.stats || null);
      setTotal(json.total || 0);
    } catch (e:any) {
      if (e?.name !== "AbortError") console.error("Load promos failed:", e?.message || e);
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setLoading(false);
    }
  }, [apiUrl, token]);

  // Refetch on URL param changes
  useEffect(() => { fetchList(); }, [fetchList]);

  // toggleStatus expected by page.tsx
  const toggleStatus = useCallback(async (id: string|number, to: "active"|"disabled"|"archived") => {
    const target = (to === "disabled" ? "archived" : to); // legacy
    try {
      const res = await fetch(\`/api/admin/promos/\${id}\`, {
        method: "PATCH",
        headers: { "content-type": "application/json", ...(token ? { authorization: \`Bearer \${token}\` } : {}) },
        body: JSON.stringify({ status: target }),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && json?.ok !== false, data: json };
    } catch (e:any) {
      return { ok:false, data:{ error: e?.message || "Request failed" } };
    }
  }, [token]);

  // createCodes expected by page.tsx
  const createCodes = useCallback(async (payload: any) => {
    try {
      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: \`Bearer \${token}\` } : {}) },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && json?.ok !== false, data: json };
    } catch (e:any) {
      return { ok:false, data:{ error: e?.message || "Create failed" } };
    }
  }, [token]);

  // loadUsage expected by page.tsx
  const loadUsage = useCallback(async (id: string|number) => {
    try {
      const res = await fetch(\`/api/admin/promos/\${id}/usage\`, {
        headers: token ? { authorization: \`Bearer \${token}\` } : {},
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && json?.ok !== false, items: json.items || [] };
    } catch (e:any) {
      return { ok:false, items:[] };
    }
  }, [token]);

  return {
    // list
    items, stats, total, loading,
    // filters (as your page consumes them)
    filters,
    setFilters,
    onSearch,
    // actions
    fetchList,
    toggleStatus,
    createCodes,
    loadUsage,
  };
}
`;
fs.writeFileSync(FILE, content, "utf8");
console.log("✓ Wrote compatible useAdminPromos.ts (named export + page contract). Backup:", path.basename(BAK));
