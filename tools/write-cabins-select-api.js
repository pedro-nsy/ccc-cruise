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

const FILE = path.join("src","app","api","booking","cabins","select","route.ts");
const CONTENT = `import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type Body = {
  category: "INTERIOR" | "OCEANVIEW" | "BALCONY";
  layout: { doubles: number; triples: number; quads: number; cabins: number };
};

export async function POST(req: NextRequest) {
  try {
    const ref = req.cookies.get("ccc_ref")?.value;
    if (!ref) return NextResponse.json({ ok:false, error:"MISSING_REF" }, { status:401 });

    const body = await req.json() as Body;
    if (!body?.category || !body?.layout) {
      return NextResponse.json({ ok:false, error:"INVALID_PAYLOAD" }, { status:400 });
    }

    const supabase = supabaseServer();

    const { error } = await supabase
      .from("leads")
      .update({
        cabin_category: body.category,
        cabin_layout: body.layout,
        status: "cabins_selected",
      })
      .eq("booking_ref", ref);

    if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });

    return NextResponse.json({ ok:true }, { status:200 });
  } catch (err:any) {
    return NextResponse.json({ ok:false, error: err?.message || "Server error" }, { status:500 });
  }
}
`;

backupWrite(FILE, CONTENT, "cabins-select");
