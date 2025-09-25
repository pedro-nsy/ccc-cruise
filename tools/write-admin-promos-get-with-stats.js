const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","route.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-step2";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

const content = `import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SortKey = "created" | "code" | "type" | "status" | "assigned";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const sp = u.searchParams;

  // --- filters (URL) ---
  const qRaw = (sp.get("q") || "").trim();
  const q = qRaw ? \`%$\{qRaw}%\` : "";
  const type = sp.get("type") && sp.get("type") !== "all" ? sp.get("type") : "";
  let status = sp.get("status") && sp.get("status") !== "all" ? sp.get("status")! : "";
  if (status === "disabled") status = "archived";
  const used = sp.get("used") && sp.get("used") !== "all" ? sp.get("used")! : "";

  const sort: SortKey = (sp.get("sort") as SortKey) || "created";
  const dirAsc = sp.get("dir") === "asc";

  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(sp.get("limit") || "25", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // --- list query ---
  const sortMap: Record<SortKey,string> = {
    created: "created_at",
    code: "code",
    type: "type",
    status: "status",
    assigned: "assigned_to_name",
  };

  let list = supabase
    .from("promo_codes")
    .select("id, code, type, status, assigned_to_name, created_at", { count: "exact" });

  if (q) list = list.or(\`code.ilike.\${q},assigned_to_name.ilike.\${q}\`);
  if (type) list = list.eq("type", type);
  if (status) list = list.eq("status", status);
  if (used === "yes") list = list.eq("status", "consumed");
  if (used === "no")  list = list.neq("status", "consumed");

  list = list.order(sortMap[sort] || "created_at", { ascending: dirAsc, nullsFirst: false })
             .range(from, to);

  const { data: items, count: total, error: listErr } = await list;
  if (listErr) {
    return NextResponse.json({ ok:false, error:"QUERY_FAILED", detail:listErr.message }, { status: 500 });
  }

  // --- global stats (not page-based) ---
  // created per type
  const { data: createdRows, error: cErr } = await supabase
    .from("promo_codes")
    .select("type, count:id")
    .order("type");
  if (cErr) {
    return NextResponse.json({ ok:false, error:"STATS_CREATED_FAILED", detail:cErr.message }, { status: 500 });
  }

  // consumed per type
  const { data: consumedRows, error: uErr } = await supabase
    .from("promo_codes")
    .select("type, count:id")
    .eq("status", "consumed")
    .order("type");
  if (uErr) {
    return NextResponse.json({ ok:false, error:"STATS_USED_FAILED", detail:uErr.message }, { status: 500 });
  }

  // caps (current active)
  const { data: capsRows, error: capErr } = await supabase
    .from("promo_caps_active")
    .select("type, cap")
    .order("type");
  if (capErr) {
    return NextResponse.json({ ok:false, error:"STATS_CAPS_FAILED", detail:capErr.message }, { status: 500 });
  }

  const types = ["early_bird","artist","staff"] as const;

  const created: Record<string, number> = Object.fromEntries(types.map(t=>[t,0]));
  const consumed: Record<string, number> = Object.fromEntries(types.map(t=>[t,0]));
  const caps: Record<string, number|null> = Object.fromEntries(types.map(t=>[t,null]));

  (createdRows||[]).forEach(r => { if (r?.type && typeof r["count"] === "number") created[r.type] = r["count"]; });
  (consumedRows||[]).forEach(r => { if (r?.type && typeof r["count"] === "number") consumed[r.type] = r["count"]; });
  (capsRows||[]).forEach(r => { if (r?.type) caps[r.type] = r.cap ?? null; });

  return NextResponse.json({
    ok: true,
    items: items || [],
    total: total || 0,
    stats: { created, consumed, caps },
  });
}
`;
fs.writeFileSync(FILE, content, "utf8");
console.log("✓ Wrote GET /api/admin/promos with global stats. Backup:", path.basename(BAK));
