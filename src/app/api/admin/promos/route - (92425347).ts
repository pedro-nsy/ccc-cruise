"use server";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server"; // your server client (SERVICE_ROLE)

type Dir = "asc" | "desc";
type SortKey = "created" | "type" | "status";

function mapSort(sort: SortKey): string {
  if (sort === "type") return "type";
  if (sort === "status") return "status";
  return "created_at"; // "created"
}

function escapeIlike(s: string) {
  // escape % and _ so users can type them literally
  return s.replace(/[%_]/g, (m) => `\\${m}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const q = (url.searchParams.get("q") ?? "").trim();
  const type = url.searchParams.get("type") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const used = url.searchParams.get("used") ?? ""; // "yes" | "no" | ""

  const sort = (url.searchParams.get("sort") || "created_at");
  const dir  = (url.searchParams.get("dir") || "desc");

  // -- canonicalize sort --
  const allowedSorts = new Set(["code","type","status","used_count","assigned_to_name","created_at"]);
  let sortCol = sort;
  if (sortCol === "created")  sortCol = "created_at";
  if (sortCol === "used")     sortCol = "used_count";
  if (sortCol === "assigned") sortCol = "assigned_to_name";
  if (!allowedSorts.has(sortCol)) sortCol = "created_at";
  const ascending = (dir === "asc");

  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);

  const supa = supabaseServer();

  // ---------- BASE QUERY ----------
  // We always select columns the page uses.
  let query = supa
    .from("promo_codes")
    .select("id, code, type, status, used_count, created_at, updated_at, assigned_to_name, assigned_to_email:assigned_email, assigned_to_phone:assigned_phone, expires_at, created_by", { count: "exact" });

  // ---------- FILTERS ----------
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  if (used === "yes") query = query.gt("used_count", 0);
  if (used === "no") query = query.eq("used_count", 0);

  if (q) {
    const needle = escapeIlike(q);
    // case-insensitive partial match on code OR assigned_to_name
    query = query.or(`code.ilike.%${needle}%,assigned_to_name.ilike.%${needle}%`);
  }

  // ---------- SORT ----------
  query = query.order(mapSort(sort), { ascending: dir === "asc" });

  // ---------- PAGINATION ----------
  // Supabase range is inclusive indexes
  const from = offset;
  const to = offset + limit - 1;
  query = query.range(from, to);

  // ---------- RUN ----------
  const { data: items, error, count } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // ---------- STATS ----------
  // Prefer RPC if available, otherwise a tiny JS fallback
  let stats: any = null;
  try {
    const { data: sdata, error: sErr } = await supa.rpc("promo_stats_active_only");
    if (!sErr && sdata) stats = sdata;
  } catch {}

  if (!stats) {
    // Minimal fallback: compute totals from current page (not perfect, but safe)
    const created = { early_bird: 0, artist: 0, staff: 0, total: 0 };
    const usedObj = { early_bird: 0, artist: 0, staff: 0, total: 0 };
    (items || []).forEach((r: any) => {
      created.total += 1;
      if (r.type === "early_bird") created.early_bird += 1;
      if (r.type === "artist") created.artist += 1;
      if (r.type === "staff") created.staff += 1;

      if (r.used_count > 0) {
        usedObj.total += 1;
        if (r.type === "early_bird") usedObj.early_bird += 1;
        if (r.type === "artist") usedObj.artist += 1;
        if (r.type === "staff") usedObj.staff += 1;
      }
    });
    stats = { created, used: usedObj, caps: { early_bird: null, artist: null, staff: null } };
  }

  return NextResponse.json({
    ok: true,
    items: items || [],
    total: typeof count === "number" ? count : (items?.length ?? 0),
    stats,
  });
}


