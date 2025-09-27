import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Simple, readable ref like BK-AB12CD3 (no 0/O/I/1)
function makeBookingRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "BK-";
  for (let i = 0; i < 7; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

type Payload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappOk?: boolean;
};

function isValidEmail(v: string) { return /\S+@\S+\.\S+/.test(v); }
function isValidPhone(v: string) {
  const trimmed = v.replace(/\s+/g, "");
  return /^\+?[0-9\-()]{10,17}$/.test(trimmed);
}

// Prefill: return lead details for current ccc_ref
export async function GET(req: NextRequest) {
  try {
    const ref = req.cookies.get("ccc_ref")?.value || "";
    if (!ref) return NextResponse.json({ ok:false, error:"No ref" }, { status: 401 });
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("leads")
      .select("first_name, last_name, email, phone, whatsapp_opt_in")
      .eq("booking_ref", ref)
      .maybeSingle();
    if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok:false, error:"Lead not found" }, { status: 404 });

    return NextResponse.json({
      ok:true,
      firstName: data.first_name || "",
      lastName:  data.last_name  || "",
      email:     data.email      || "",
      phone:     data.phone      || "",
      whatsappOk: !!data.whatsapp_opt_in
    }, { status: 200 });
  } catch (err:any) {
    return NextResponse.json({ ok:false, error: err?.message || "Server error" }, { status: 500 });
  }
}

// Create or reuse lead on Start
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Payload>;
    const firstName = (body.firstName || "").toString().trim().toUpperCase();
    const lastName  = (body.lastName  || "").toString().trim().toUpperCase();
    const email     = (body.email     || "").toString().trim().toLowerCase();
    const phone     = (body.phone     || "").toString().trim();
    const whatsappOk = !!body.whatsappOk;

    if (!firstName || !lastName) {
      return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ ok: false, error: "Invalid phone" }, { status: 400 });
    }

    const existingRef = req.cookies.get("ccc_ref")?.value || "";
    const supabase = supabaseServer();

    if (existingRef) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("booking_ref")
        .eq("booking_ref", existingRef)
        .maybeSingle();

      if (existingLead?.booking_ref) {
        const { error: upErr } = await supabase.from("leads").update({
          status: "lead",
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          whatsapp_opt_in: whatsappOk,
        }).eq("booking_ref", existingRef);

        if (upErr) {
          return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
        }

        const res = NextResponse.json({ ok: true, ref: existingRef }, { status: 200 });
        res.cookies.set({ name:"ccc_ref", value:existingRef, httpOnly:true, sameSite:"lax", path:"/", maxAge:60*60*24*14 });
        return res;
      }
    }

    // No usable cookie — create fresh lead + new ref
    const ref = makeBookingRef();
    const { error } = await supabase.from("leads").insert({
      booking_ref: ref,
      status: "lead",
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      whatsapp_opt_in: whatsappOk,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true, ref }, { status: 200 });
    res.cookies.set({ name:"ccc_ref", value:ref, httpOnly:true, sameSite:"lax", path:"/", maxAge:60*60*24*14 });
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
