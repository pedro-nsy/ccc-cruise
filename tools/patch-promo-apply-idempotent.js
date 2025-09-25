const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","promo","apply","route.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }

const bak = FILE + ".bak-idempotent";
const s0 = fs.readFileSync(FILE, "utf8");
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = s0;

// Insert an early idempotent OK if traveler already has this code (unless consumed)
const anchor = 'if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });';
if (!s.includes(anchor)) {
  console.error("Anchor not found; file structure changed. Please paste the file and I'll tailor the patch.");
  process.exit(1);
}

const inject = `
  // Idempotent path: if this traveler already holds this code, accept (unless it's consumed)
  if (traveler.promo_code_id && String(traveler.promo_code_id) === String(promo.id)) {
    if (activeUse && activeUse.status === "consumed") {
      return NextResponse.json({ ok: false, error: "CODE_ALREADY_USED" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, code: promo.code, type: promo.type }, { status: 200 });
  }
`;

s = s.replace(anchor, anchor + inject);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched apply route for same-traveler idempotency. Backup:", bak);
