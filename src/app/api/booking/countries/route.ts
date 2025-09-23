import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("countries")
    .select("code,name,priority")
    .order("priority", { ascending: false })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, countries: data }, { status: 200 });
}
