import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/admin/promos
 * Validates filters, maps disabled->archived, returns items + total.
 * (Stats are deferred to Step 2 to avoid errors on column drift.)
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if ("error" in gate) return gate.error;

  const url = new URL(req.url);
  const sp = url.searchParams;

  const qRaw = (sp.get("q") ?? "").trim();
  const typeRaw = (sp.get("type") ?? "").trim().toLowerCase();
  let statusRaw = (sp.get("status") ?? "").trim().toLowerCase();
  const usedRaw = (sp.get("used") ?? "").trim().toLowerCase();
  const sortRaw = (sp.get("sort") ?? "created").trim().toLowerCase();
  const dirRaw = (sp.get("dir") ?? "desc").trim().toLowerCase();
  const pageRaw = parseInt(sp.get("page") ?? "1", 10);
  const limitRaw = parseInt(sp.get("limit") ?? "25", 10);

  if (statusRaw === "disabled") statusRaw = "archived";

  const allowedStatus = new Set(["", "all", "active", "reserved", "consumed", "archived"]);
  const allowedType = new Set(["", "all", "early_bird", "artist", "staff"]);
  const allowedSort = new Set(["created", "code", "type", "status", "used"]);
  const allowedDir  = new Set(["asc", "desc"]);

  if (!allowedStatus.has(statusRaw)) {
    return NextResponse.json({ ok:false, error:"INVALID_STATUS: " + statusRaw }, { status:400 });
  }
  if (!allowedType.has(typeRaw)) {
    return NextResponse.json({ ok:false, error:"INVALID_TYPE: " + typeRaw }, { status:400 });
  }
  if (!allowedSort.has(sortRaw) || !allowedDir.has(dirRaw)) {
    return NextResponse.json({ ok:false, error:"INVALID_SORT_DIR" }, { status:400 });
  }

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 200 ? limitRaw : 25;
  const offset = (page - 1) * limit;

  const supabase = supabaseServer();

  // Build query
  let query = supabase
    .from("promo_codes")
    .select("*", { count: "exact" }); // <-- select * to avoid missing-column errors

  if (qRaw) {
    const q = "%" + qRaw + "%";
    query = query.or(
  [
    "code.ilike." + q,
    "assigned_to_name.ilike." + q
  ].join(",")
);
  }

  if (typeRaw && typeRaw !== "all") {
    query = query.eq("type", typeRaw);
  }

  if (statusRaw && statusRaw !== "all") {
    query = query.eq("status", statusRaw);
  }

  // used = consumed yes/no
  if (usedRaw === "yes") {
    query = query.eq("status", "consumed");
  } else if (usedRaw === "no") {
    query = query.neq("status", "consumed");
  }

  const sortMap: Record<string, string> = {
    created: "created_at",
    code: "code",
    type: "type",
    status: "status",
    used: "used_count"
  };
  const orderCol = sortMap[sortRaw] ?? "created_at";
  query = query.order(orderCol, { ascending: dirRaw === "asc" });

  query = query.range(offset, offset + limit - 1);

  const { data: items, error, count } = await query;

  if (error) {
    return NextResponse.json({ ok:false, error:"QUERY_FAILED: " + (error.message || "unknown") }, { status:500 });
  }

  return NextResponse.json({
    ok: true,
    items: items ?? [],
    total: count ?? 0,
    page,
    limit,
    stats: null
  });
}
