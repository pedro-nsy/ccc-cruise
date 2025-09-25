const fs = require("fs");
const path = require("path");

function backupWrite(file, content, tag){
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.writeFileSync(file, content, "utf8");
  console.log("✓ wrote", file, "backup:", fs.existsSync(bak) ? bak : "(none)");
}

const FILE = path.join("src","app","api","admin","promos","[id]","usage","route.ts");

const content = `import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req);
  if ("error" in gate) return gate.error;

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("promo_usages")
    .select(\`
      id,
      promo_code_id,
      booking_ref,
      traveler_id,
      status,
      reserved_at,
      consumed_at,
      released_at,
      created_at,
      updated_at,
      traveler:travelers!promo_usages_traveler_id_fkey (
        first_name,
        last_name
      )
    \`)
    .eq("promo_code_id", params.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const items = (data || []).map((row: any) => {
    const t = row?.traveler || null;
    const traveler_name = t
      ? [t.first_name, t.last_name].filter(Boolean).join(" ").trim() || null
      : null;
    // strip nested traveler before returning
    const { traveler, ...rest } = row || {};
    return { ...rest, traveler_name };
  });

  return NextResponse.json({ ok: true, items });
}
`;

backupWrite(FILE, content, "step5b");
