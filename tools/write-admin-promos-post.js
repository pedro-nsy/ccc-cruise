const fs = require("fs");
const path = require("path");

const DIR = path.join("src","app","api","admin","promos");
const FILE = path.join(DIR, "route.ts");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const hasFile = fs.existsSync(FILE);
const BAK = hasFile ? FILE + ".bak-step3-post" : null;
if (hasFile && !fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

// Read existing (GET) if present
const prev = hasFile ? fs.readFileSync(FILE, "utf8") : "";

const header =
`import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
type SortKey = "created" | "code" | "type" | "status" | "assigned";
`;

const ensureHeader = prev.includes("createClient(") ? prev : header + prev;

// If POST already exists, replace it entirely
const withoutPost = ensureHeader.replace(/export\s+async\s+function\s+POST\([\s\S]*?}\s*$/, (m) => {
  // remove trailing POST only if it’s the last export. Otherwise, keep and add ours later.
  return m.includes("GET(") ? ensureHeader : ensureHeader; 
});

// Append/replace POST implementation
const postImpl =
`
function randCode(len:number){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s=""; for(let i=0;i<len;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function prefixForType(t:string){ return t==="early_bird"?"EL": t==="artist"?"AR":"ST"; }

async function countInCap(type:string){
  let q:any = supabase.from("promo_codes").select("id",{ head:true, count:"exact" }).eq("type", type).neq("status","archived");
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({}));
    const type = (body?.type || "").trim();
    const quantity = Math.max(1, parseInt(String(body?.quantity || "1"), 10));

    if (!["early_bird","artist","staff"].includes(type)) {
      return NextResponse.json({ ok:false, code:"BAD_TYPE", message:"Type must be early_bird, artist, or staff." }, { status:400 });
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ ok:false, code:"BAD_QUANTITY", message:"Quantity must be a positive integer." }, { status:400 });
    }

    // Read cap
    const { data: capsRows, error: capErr } = await supabase.from("promo_caps_active").select("type, cap").eq("type", type).maybeSingle();
    if (capErr) return NextResponse.json({ ok:false, code:"CAPS_READ_FAILED", message:capErr.message }, { status:500 });

    const cap = capsRows?.cap ?? null; // null = no cap
    if (cap !== null) {
      const inCap = await countInCap(type);
      const remaining = Math.max(0, cap - inCap);
      if (quantity > remaining) {
        return NextResponse.json({
          ok:false, code:"OVER_CAP",
          message: \`Cap reached for \${type.replace("_"," ")} (\${cap}). Remaining: \${remaining}. Reduce quantity or archive codes.\`,
          cap, remaining
        }, { status:409 });
      }
    }

    // Create codes
    const batch = [];
    const pfx = prefixForType(type);
    const seen = new Set();
    for (let i=0; i<quantity; i++) {
      let code="";
      do { code = \`\${pfx}\${randCode(2)}-\${randCode(4)}\`; } while (seen.has(code));
      seen.add(code);
      batch.push({ code, type, status: "active" });
    }

    const { data: ins, error: insErr } = await supabase.from("promo_codes").insert(batch).select("id, code, type, status");
    if (insErr) {
      // if unique violation on code, report nicely
      return NextResponse.json({ ok:false, code:"CREATE_FAILED", message:insErr.message }, { status:500 });
    }

    return NextResponse.json({ ok:true, created: ins || [], count: (ins||[]).length });
  } catch (e:any) {
    return NextResponse.json({ ok:false, code:"UNEXPECTED", message: e?.message || String(e) }, { status:500 });
  }
}
`;

// If GET exists in the file already, keep it. Otherwise, we need to re-add a robust GET.
// Detect a GET export:
const hasGet = /export\s+async\s+function\s+GET\(/.test(withoutPost);
let finalOut = withoutPost;
if (!hasGet) {
  // Provide a conservative GET (list + stats) to avoid breaking anything
  finalOut += `
export async function GET(req: Request) {
  const u = new URL(req.url);
  const sp = u.searchParams;

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

  const sortMap: Record<SortKey, string> = {
    created: "created_at",
    code: "code",
    type: "type",
    status: "status",
    assigned: "assigned_to_name",
  };

  let list = supabase.from("promo_codes").select("id, code, type, status, assigned_to_name, created_at", { count: "exact" });
  if (q) list = list.or(\`code.ilike.\${q},assigned_to_name.ilike.\${q}\`);
  if (type) list = list.eq("type", type);
  if (status) list = list.eq("status", status);
  if (used === "yes") list = list.eq("status","consumed");
  if (used === "no")  list = list.neq("status","consumed");
  list = list.order(sortMap[sort] || "created_at", { ascending: dirAsc }).range(from, to);

  const { data: items, count: total, error: listErr } = await list;
  if (listErr) return NextResponse.json({ ok:false, error:"QUERY_FAILED", detail:listErr.message }, { status:500 });

  // stats (created, consumed, in_cap) + caps
  async function countWhere(filter) {
    let q:any = supabase.from("promo_codes").select("id", { head:true, count:"exact" });
    q = filter(q);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count || 0;
  }
  const types = ["early_bird","artist","staff"] as const;
  const created:any = {}; const consumed:any = {}; const inCap:any = {}; const caps:any = {};
  const { data: capsRows } = await supabase.from("promo_caps_active").select("type, cap");
  (capsRows||[]).forEach((r:any)=> caps[r.type] = r.cap ?? null);

  for (const t of types) {
    created[t]  = await countWhere(q => q.eq("type", t));
    consumed[t] = await countWhere(q => q.eq("type", t).eq("status","consumed"));
    inCap[t]    = await countWhere(q => q.eq("type", t).neq("status","archived"));
  }

  return NextResponse.json({ ok:true, items: items||[], total: total||0, stats: { created, consumed, in_cap: inCap, caps } });
}
`;
}
finalOut += postImpl;

fs.writeFileSync(FILE, finalOut, "utf8");
console.log("✓ Wrote POST /api/admin/promos (cap enforcement + creation). Backup:", BAK ? path.basename(BAK) : "(none)");
