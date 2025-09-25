const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","api","booking","start","route.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-idempotent";
const src0 = fs.readFileSync(FILE, "utf8");
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = src0;

// Patch anchor: right before current insert + cookie set, detect existing cookie and upsert
const anchor = "const supabase = supabaseServer();\n    const ref = makeBookingRef();";
if (!s.includes(anchor)) {
  console.error("Anchor not found; route changed. Paste the file and I’ll tailor the patch.");
  process.exit(1);
}

const inject = `
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
        res.cookies.set({
          name: "ccc_ref",
          value: existingRef,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 14,
        });
        return res;
      }
    }

    // No usable cookie — create fresh lead + new ref
    const ref = makeBookingRef();
`;

s = s.replace(anchor, inject);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched /api/booking/start to be idempotent per ccc_ref. Backup:", bak);
