import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const ref = req.cookies.get("ccc_ref")?.value;
  if (!ref) return NextResponse.json({ ok: false, error: "MISSING_REF" }, { status: 401 });

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("leads")
    .select("booking_ref,status,first_name,last_name,email,phone,whatsapp_opt_in,adults,minors,minor_ages,updated_at")
    .eq("booking_ref", ref)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ ok: true, lead: data }, { status: 200 });
}
