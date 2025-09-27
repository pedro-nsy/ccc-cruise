import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type Payload = { adults: number; minors: number; minorAges: number[] };

function validate(p: Payload) {
  const errors: Record<string, string> = {};
  const total = (p.adults ?? 0) + (p.minors ?? 0);

  if (!Number.isInteger(p.adults) || p.adults < 1) errors.adults = "At least one adult is required.";
  if (!Number.isInteger(p.minors) || p.minors < 0) errors.minors = "Invalid number of minors.";
  if (p.minors > (p.adults ?? 0) * 3) errors.minors = "You can have up to 3 minors per adult.";
  if (total > 10) errors.total = "For now, the maximum group size is 10 travelers.";
  if ((p.minors ?? 0) !== (p.minorAges?.length ?? 0)) errors.minorAges = "Please specify each minor's age.";
  if (Array.isArray(p.minorAges)) {
    for (const age of p.minorAges) {
      if (!Number.isInteger(age) || age < 0 || age > 17) {
        errors.minorAges = "Each minor's age must be between 0 and 17.";
        break;
      }
    }
  }
  return errors;
}

export async function GET(req: NextRequest) {
  try {
    const ref = req.cookies.get("ccc_ref")?.value || "";
    if (!ref) return NextResponse.json({ ok:false, error:"No ref" }, { status: 401 });

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("leads")
      .select("adults, minors, minor_ages")
      .eq("booking_ref", ref)
      .maybeSingle();

    if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok:false, error:"Lead not found" }, { status: 404 });

    const adults = Number.isInteger(data.adults) ? data.adults : null;
    const minors = Number.isInteger(data.minors) ? data.minors : null;
    const minorAges = Array.isArray(data.minor_ages) ? data.minor_ages : [];

    return NextResponse.json({ ok:true, adults, minors, minorAges }, { status: 200 });
  } catch (err:any) {
    return NextResponse.json({ ok:false, error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ref = req.cookies.get("ccc_ref")?.value;
    if (!ref) return NextResponse.json({ ok: false, error: "MISSING_REF" }, { status: 400 });

    const body = (await req.json()) as Partial<Payload>;
    const p: Payload = {
      adults: Number(body.adults ?? 0),
      minors: Number(body.minors ?? 0),
      minorAges: Array.isArray(body.minorAges) ? body.minorAges.map((n) => Number(n)) : [],
    };

    const errors = validate(p);
    if (Object.keys(errors).length) {
      return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("leads")
      .update({
        adults: p.adults,
        minors: p.minors,
        minor_ages: p.minorAges,
        status: "size_selected",
      })
      .eq("booking_ref", ref);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    
// --- FLOW-03 T2: shrink travelers + release reserved promos on trim ---
{
  const M = p.adults + p.minors;

  // Fetch travelers to trim (idx >= M) for this booking
  const { data: toTrim, error: trimFetchErr } = await supabase
    .from("travelers")
    .select("id, idx, promo_code_id")
    .eq("booking_ref", ref)
    .gte("idx", M);

  if (!trimFetchErr && Array.isArray(toTrim) && toTrim.length > 0) {
    // Collect promo_code_ids from trimmed travelers (dedup), only where present
    const promoIds = Array.from(new Set(toTrim
      .map(t => t.promo_code_id)
      .filter(v => v !== null && v !== undefined)));

    // Release any still-reserved usages tied to this booking for those codes
    if (promoIds.length > 0) {
      await supabase
        .from("promo_usages")
        .update({ status: "released", released_at: new Date().toISOString() })
        .in("promo_code_id", promoIds)
        .eq("booking_ref", ref)
        .eq("status", "reserved");
    }

    // Delete the trimmed traveler rows
    await supabase
      .from("travelers")
      .delete()
      .in("id", toTrim.map(t => t.id));
  }
}
// --- end T2 block ---
return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
