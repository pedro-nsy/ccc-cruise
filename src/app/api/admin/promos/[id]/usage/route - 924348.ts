import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req);
  if ("error" in gate) return gate.error;

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("promo_usages")
    .select("id, booking_ref, traveler_id, status, reserved_at, consumed_at, released_at, created_at, updated_at")
    .eq("promo_code_id", params.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data || [] });
}
