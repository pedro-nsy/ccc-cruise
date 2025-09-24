import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase-server";

const SAFE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I,O,L,0,1

function randFrom(alphabet: string, n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
function genCode(type: "early_bird"|"artist"|"staff") {
  const head = type === "early_bird" ? "EL" : type === "artist" ? "AR" : "ST";
  const tail = type === "early_bird" ? "B"  : type === "artist" ? "T"  : "F";
  return `${head}${randFrom(SAFE,2)}-${randFrom(SAFE,3)}${tail}`;
}

// ===== GET: list + stats (active-only in stats) =====
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if ("error" in gate) return gate.error;

  const supabase = supabaseServer();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toUpperCase();
  const type = (searchParams.get("type") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const used = (searchParams.get("used") || "").trim().toLowerCase();           // "yes" | "no" | ""
  const assigned = (searchParams.get("assigned") || "").trim().toLowerCase();   // "assigned" | "unassigned" | ""
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // main list (unchanged)
  let query = supabase.from("promo_codes")
    .select("id, code, type, status, used_count, created_at, updated_at, assigned_to_name, assigned_email, assigned_phone, expires_at, created_by", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q)       query = query.ilike("code", `%${q}%`);
  if (type)    query = query.eq("type", type);
  if (status)  query = query.eq("status", status);
  if (used === "yes") query = query.gt("used_count", 0);
  if (used === "no")  query = query.eq("used_count", 0);
  if (assigned === "assigned")   query = query.not("assigned_to_name", "is", null);
  if (assigned === "unassigned") query = query.is("assigned_to_name", null);

  const { data: items, error, count } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // stats (ACTIVE ONLY)
  const { data: activeRows, error: e2 } = await supabase
    .from("promo_codes")
    .select("type, used_count, status")
    .eq("status", "active")
    .limit(5000);

  if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

  let created_eb = 0, created_ar = 0, created_sf = 0;
  let used_eb = 0, used_ar = 0, used_sf = 0;

  for (const r of (activeRows || [])) {
    if (r.type === "early_bird") {
      created_eb++;
      if ((r.used_count || 0) > 0) used_eb++;
    } else if (r.type === "artist") {
      created_ar++;
      if ((r.used_count || 0) > 0) used_ar++;
    } else if (r.type === "staff") {
      created_sf++;
      if ((r.used_count || 0) > 0) used_sf++;
    }
  }

  const created_total = created_eb + created_ar + created_sf;
  const used_total = used_eb + used_ar + used_sf;

  const stats = {
    created: { early_bird: created_eb, artist: created_ar, staff: created_sf, total: created_total },
    used:    { early_bird: used_eb,    artist: used_ar,    staff: used_sf,    total: used_total },
    caps:    { early_bird: 150, artist: 120, staff: null }
  };

  return NextResponse.json({ ok: true, items: items || [], total: count ?? 0, stats });
}

// ===== POST: create (unchanged) =====
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if ("error" in gate) return gate.error;

  const supabase = supabaseServer();
  const body = await req.json().catch(() => ({}));
  const type = body?.type as "early_bird"|"artist"|"staff";
  const qty = Math.max(1, Math.min(1000, parseInt(body?.qty ?? 1, 10)));
  const assigned_to_name = (body?.assigned_to_name ?? null) as string | null;
  const assigned_email = (body?.assigned_email ?? null) as string | null;
  const assigned_phone = (body?.assigned_phone ?? null) as string | null;
  const note = (body?.note ?? null) as string | null;

  if (!["early_bird","artist","staff"].includes(type)) {
    return NextResponse.json({ ok: false, error: "INVALID_TYPE" }, { status: 400 });
  }

  const rows = [];
  for (let i = 0; i < qty; i++) {
    rows.push({
      code: genCode(type),
      type,
      status: "active",
      assigned_to_name, assigned_email, assigned_phone, note,
      created_by: gate.user.email,
    });
  }

  let inserted: any[] = [];
  let remaining = rows;
  for (let attempt = 0; attempt < 5 && remaining.length; attempt++) {
    const { data, error } = await supabase
      .from("promo_codes")
      .insert(remaining)
      .select("id, code, type, status");
    if (error) {
      remaining = remaining.map(r => ({ ...r, code: genCode(type) }));
    } else {
      inserted = inserted.concat(data || []);
      remaining = [];
    }
  }

  if (remaining.length) {
    return NextResponse.json({ ok: false, error: "COULD_NOT_GENERATE_UNIQUE" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, created: inserted.length, items: inserted });
}
