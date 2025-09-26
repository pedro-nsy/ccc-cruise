const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-8.5-hook";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Remove the early return that blocks fetches without token
s = s.replace(/\s*\/\/\s*wait for token before hitting protected API[\s\S]*?\n\s*if\s*\(\s*!token\s*\)\s*return;\s*/m, "\n");

// (Optional) If the comment text differs slightly, also target the simple pattern:
s = s.replace(/\n\s*if\s*\(\s*!token\s*\)\s*return;\s*/g, "\n");

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", BAK);
