export const runtime = "edge"; // edge is fine for anon client

import { NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabase-browser";

export async function GET() {
  try {
    const supabase = supabaseBrowser();
    // Try a simple public call. If you have a known public table, change to that:
    //   const { data, error } = await supabase.from("your_public_table").select("id").limit(1);
    // For a universal probe (no table required), fetch auth settings:
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return NextResponse.json({ ok: true, sessionKnown: !!data?.session });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}