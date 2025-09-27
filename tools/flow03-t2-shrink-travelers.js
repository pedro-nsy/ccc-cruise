const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","booking","group-size","route.ts");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
const BAK = FILE + ".bak-t2-shrink";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// We’ll inject our shrink+release block right before the success return.
const successReturnPattern = /return\s+NextResponse\.json\(\s*\{\s*ok:\s*true\s*\}\s*,\s*\{\s*status:\s*200\s*\}\s*\)\s*;\s*$/m;

if (!successReturnPattern.test(s)) {
  console.error("Could not find the success return in POST. Aborting to be safe.");
  process.exit(1);
}

const inject = `
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
return NextResponse.json({ ok: true }, { status: 200 });`;

s = s.replace(successReturnPattern, inject);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE);
console.log("  Backup:", BAK);
