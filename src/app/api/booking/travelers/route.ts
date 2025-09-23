import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type TravelerUpsert = {
  idx: number;
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  nationalityCode: string; // ISO alpha-2
};

function toUTCDate(d: string) {
  // Parse YYYY-MM-DD as UTC midnight to avoid TZ drift
  return new Date(d + "T00:00:00Z");
}
function ageOn(dateISO: string, dobISO: string) {
  const d = toUTCDate(dateISO);
  const b = toUTCDate(dobISO);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  const m = d.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && d.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

async function getSailingWindow(supabase: any) {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "sailing_window")
    .single();
  if (error || !data?.value) throw new Error("Missing sailing_window setting");
  const start = data.value.start as string; // "2026-04-05"
  const end = data.value.end as string;     // "2026-04-12"
  return { start, end };
}

export async function GET(req: NextRequest) {
  const ref = req.cookies.get("ccc_ref")?.value;
  if (!ref) return NextResponse.json({ ok: false, error: "MISSING_REF" }, { status: 401 });

  const supabase = supabaseServer();

  // Get lead to know group size + minor ages + lead names
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("booking_ref, adults, minors, minor_ages, first_name, last_name")
    .eq("booking_ref", ref)
    .single();

  if (leadErr || !lead) return NextResponse.json({ ok: false, error: "LEAD_NOT_FOUND" }, { status: 404 });

  const target = (lead.adults ?? 0) + (lead.minors ?? 0);

  // Ensure traveler placeholders exist and match target size (adults first)
  const { data: existing, error: exErr } = await supabase
    .from("travelers")
    .select("id, idx, is_adult, minor_age, first_name, last_name, dob, nationality_code")
    .eq("booking_ref", ref)
    .order("idx", { ascending: true });

  if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });

  // Build missing rows
  const rows: any[] = [];
  for (let i = 0; i < target; i++) {
    const found = existing?.find((t: any) => t.idx === i);
    if (!found) {
      const isAdult = i < (lead.adults ?? 0);
      const minorAge = !isAdult ? (lead.minor_ages?.[i - (lead.adults ?? 0)] ?? null) : null;
      rows.push({
        booking_ref: ref, idx: i, is_adult: isAdult, minor_age: minorAge,
        first_name: null, last_name: null, dob: null, nationality_code: "MX"
      });
    }
  }
  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("travelers").insert(rows);
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  // Prefill traveler 0 with lead names if empty
  const t0 = existing?.find((t: any) => t.idx === 0);
  if ((lead.first_name || lead.last_name) && (!t0 || (!t0.first_name && !t0.last_name))) {
    await supabase.from("travelers")
      .update({
        first_name: (lead.first_name ?? null),
        last_name:  (lead.last_name ?? null)
      })
      .eq("booking_ref", ref)
      .eq("idx", 0);
  }

  // Return fresh set
  const { data: out, error: outErr } = await supabase
    .from("travelers")
    .select("idx,is_adult,minor_age,first_name,last_name,dob,nationality_code")
    .eq("booking_ref", ref)
    .order("idx", { ascending: true });

  if (outErr) return NextResponse.json({ ok: false, error: outErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, travelers: out }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const ref = req.cookies.get("ccc_ref")?.value;
  if (!ref) return NextResponse.json({ ok: false, error: "MISSING_REF" }, { status: 401 });

  const supabase = supabaseServer();
  const { start, end } = await getSailingWindow(supabase);

  const body = (await req.json()) as { travelers: TravelerUpsert[] };
  if (!Array.isArray(body?.travelers)) {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  // Load existing rows to know which idx is adult/minor
  const { data: rows, error: loadErr } = await supabase
    .from("travelers")
    .select("idx,is_adult,minor_age")
    .eq("booking_ref", ref)
    .order("idx", { ascending: true });

  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });

  const errors: Record<number, string> = {};
  for (const t of body.travelers) {
    if (t.idx == null) { errors[-1] = "Missing idx"; continue; }
    const row = rows?.find((r: any) => r.idx === t.idx);
    if (!row) { errors[t.idx] = "Traveler not found"; continue; }

    const first = (t.firstName ?? "").trim().toUpperCase();
    const last  = (t.lastName  ?? "").trim().toUpperCase();
    const nat   = (t.nationalityCode ?? "").trim().toUpperCase();
    const dob   = (t.dob ?? "").trim();

    if (!first || !last) { errors[t.idx] = "Name required (first and last)."; continue; }
    if (!/^[A-Z]{2}$/.test(nat)) { errors[t.idx] = "Invalid nationality."; continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) { errors[t.idx] = "Invalid DOB."; continue; }

    // Age validation: Adults 18+ by start; Minors 0–17 by end
    const adultAge = ageOn(start, dob);
    const minorAge = ageOn(end, dob);
    if (row.is_adult) {
      if (adultAge < 18) { errors[t.idx] = "Adult must be 18+ by Apr 5, 2026."; continue; }
    } else {
      if (minorAge < 0 || minorAge > 17) { errors[t.idx] = "Minor must be 0–17 by Apr 12, 2026."; continue; }
    }
  }
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  // Apply updates
  for (const t of body.travelers) {
    const first = t.firstName.trim().toUpperCase();
    const last  = t.lastName.trim().toUpperCase();
    const nat   = t.nationalityCode.trim().toUpperCase();
    const dob   = t.dob.trim();

    const { error: upErr } = await supabase
      .from("travelers")
      .update({ first_name: first, last_name: last, nationality_code: nat, dob })
      .eq("booking_ref", ref)
      .eq("idx", t.idx);

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  // Mark lead progress
  await supabase.from("leads").update({ status: "travelers_added" }).eq("booking_ref", ref);

  return NextResponse.json({ ok: true }, { status: 200 });
}
