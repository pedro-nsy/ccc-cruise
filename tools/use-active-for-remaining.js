const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","admin","promos","route.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-remaining-active";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Ensure we select active_open from the summary view
s = s.replace(
  /from\("promo_codes_summary"\)\s*\.select\("type,\s*created,\s*consumed"\)/,
  'from("promo_codes_summary").select("type, created, consumed, active_open")'
);

// Keep JSON shape but carry active_open alongside
if (!/active_open/.test(s)) {
  s = s.replace(
    /const created: Record<string, number>\s*=/,
    'const activeOpen: Record<string, number> = Object.fromEntries(types.map(t=>[t,0]));\n  $&'
  );

  s = s.replace(
    /\(sums\|\|\[\]\)\.forEach\(r => \{\s*if \(r\?\.type\) \{\s*created\[r\.type\]\s*=\s*Number\(r\.created\)\s*\|\|\s*0;\s*consumed\[r\.type\]\s*=\s*Number\(r\.consumed\)\s*\|\|\s*0;\s*\}\s*\}\);\s*/,
    `(sums||[]).forEach(r => {
    if (r?.type) {
      created[r.type]    = Number(r.created)      || 0;
      consumed[r.type]   = Number(r.consumed)     || 0;
      activeOpen[r.type] = Number(r.active_open)  || 0;
    }
  });\n`
  );

  s = s.replace(
    /stats:\s*\{\s*created,\s*consumed,\s*caps\s*\}\s*\}\);/,
    'stats: { created, consumed, caps, active_open: activeOpen } });'
  );
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ API updated: stats.active_open included (Remaining = cap - active_open). Backup:", path.basename(BAK));
