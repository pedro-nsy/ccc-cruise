// node tools/write-useAdminPromos-full.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-step1b-full";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

const content = `\"use client\";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// If you already have a supabase client helper, use that import instead.
// This keeps it resilient: we try to get a token, but proceed even if none.
let getTokenOnce: () => Promise<string | "">;
try {
  // Lazy require to avoid breaking if the lib path differs
  // @ts-ignore
  const { createClientComponentClient } = require("@supabase/auth-helpers-nextjs");
  const supabase = createClientComponentClient();
  getTokenOnce = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  };
} catch {
  getTokenOnce = async () => "";
}

export type PromoItem = {
  id: string | number;
  code: string;
  type: "early_bird" | "artist" | "staff";
  status: "active" | "archived" | "reserved" | "consumed";
  used_count: number;
  assigned_to_name: string | null;
  created_at?: string | null;
};

export default function useAdminPromos() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // URL-derived state (single source of truth)
  const q      = (sp.get("q") ?? "").trim();
  const type   = (sp.get("type") ?? "all").toLowerCase();
  let   status = (sp.get("status") ?? "all").toLowerCase();
  const used   = (sp.get("used") ?? "all").toLowerCase();
  const sort   = (sp.get("sort") ?? "created").toLowerCase();
  const dir    = (sp.get("dir") === "asc" ? "asc" : "desc");
  const page   = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit  = Math.min(200, Math.max(1, parseInt(sp.get("limit") ?? "25", 10)));

  if (status === "disabled") status = "archived"; // legacy compatibility

  const [items, setItems] = useState<PromoItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [token, setToken] = useState<string>("");

  // Grab token once on mount (non-blocking)
  useEffect(() => {
    let on = true;
    getTokenOnce().then(t => { if (on) setToken(t || ""); });
    return () => { on = false; };
  }, []);

  // Build the API URL from current URL params (server trusts these)
  const apiUrl = useMemo(() => {
    const u = new URL("/api/admin/promos", window.location.origin);
    if (q) u.searchParams.set("q", q);
    if (type && type !== "all")   u.searchParams.set("type", type);
    if (status && status !== "all") u.searchParams.set("status", status);
    if (used && used !== "all")   u.searchParams.set("used", used);
    u.searchParams.set("sort", sort);
    u.searchParams.set("dir", dir);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    return u;
  }, [q, type, status, used, sort, dir, page, limit]);

  // Live list fetcher with AbortController
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
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || json?.message || "Failed to load promos");
      }
      setItems(json.items || []);
      setStats(json.stats || null);
      setTotal(json.total || 0);
    } catch (err:any) {
      if (err?.name !== "AbortError") {
        console.error("Load promos failed:", err?.message || err);
      }
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setLoading(false);
    }
  }, [apiUrl, token]);

  // Refetch whenever any URL param changes (includes sort/dir)
  useEffect(() => { fetchList(); }, [fetchList]);

  // Utilities the page already uses
  const onCopy = useCallback((code: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
  }, []);

  const onToggleStatus = useCallback(async (id: string|number, to: "active"|"archived") => {
    try {
      const res = await fetch(\`/api/admin/promos/\${id}\`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: \`Bearer \${token}\` } : {}),
        },
        body: JSON.stringify({ status: to }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.message || json?.error || "Update failed");
      // Refresh list after toggle
      fetchList();
    } catch (err:any) {
      console.error("Toggle failed:", err?.message || err);
    }
  }, [token, fetchList]);

  return {
    // data
    items, stats, total, loading,
    // URL params (if the page/UI needs to render pills/controls)
    q, type, status, used, sort, dir, page, limit,
    // actions
    onCopy, onToggleStatus,
  };
}
`;
fs.writeFileSync(FILE, content, "utf8");
console.log("✓ Wrote a robust, URL-driven useAdminPromos.ts. Backup:", path.basename(BAK));
