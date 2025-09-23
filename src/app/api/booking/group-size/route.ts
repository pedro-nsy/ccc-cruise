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
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
