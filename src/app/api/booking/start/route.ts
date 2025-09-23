import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { newRef } from "@/lib/utils/ref";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const full_name = String(body.full_name || "");
    const phone = String(body.phone || "");

    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    // upsert app_users by email
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from("app_users")
      .upsert({ email, full_name, phone }, { onConflict: "email" })
      .select("*")
      .single();
    if (userErr) throw userErr;

    const reference = newRef();
    const { data: booking, error: bookErr } = await supabaseAdmin
      .from("bookings")
      .insert([{ reference, lead_user_id: userRow.id }])
      .select("*")
      .single();
    if (bookErr) throw bookErr;

    return NextResponse.json({ booking }, { status: 201 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}

