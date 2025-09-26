import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest){
  const ref = req.cookies.get("ccc_ref")?.value;
  if (!ref) return NextResponse.json({ ok:false, error:"MISSING_REF" }, { status:401 });

  const body = await req.json().catch(()=>({}));
  const category = (body?.category||"").toString().toUpperCase();
  const layout = body?.layout && typeof body.layout === "object" ? body.layout : null;
  if (!category || !layout) return NextResponse.json({ ok:false, error:"INVALID_PAYLOAD" }, { status:400 });

  const sb = supabaseServer();
  const { error } = await sb
    .from("leads")
    .update({
      cabin_category: category,
      cabin_layout: layout,
      status: "cabins_selected",
    })
    .eq("booking_ref", ref);
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });

  // Also mirror to localStorage on client (page will do it) to keep CabinAssignmentEditor working for now.
  return NextResponse.json({ ok:true }, { status:200 });
}
