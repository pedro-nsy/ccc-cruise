const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","page.tsx");
const BAK  = FILE + ".bak-contract4a";

function die(msg){ console.error(msg); process.exit(1); }
if (!fs.existsSync(FILE)) die("Not found: " + FILE);

// backup (only once)
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Use `quantity` (not `qty`) in the payload sent to createCodes
//    Target the specific payload shape:  type: genType, qty,
const before1 = s;
s = s.replace(/type:\s*genType\s*,\s*qty\s*,/m, "type: genType, quantity: qty,");
const did1 = (before1 !== s);

// 2) Use data.count for success messaging (not data.created)
//    We change the specific line: const created = data?.created ?? 0;
const before2 = s;
s = s.replace(/const\s+created\s*=\s*data\?\.\s*created\s*\?\?\s*0\s*;/m, "const created = data?.count ?? 0;");
const did2 = (before2 !== s);

if (!did1 && !did2) {
  console.log("No changes applied. (Patterns not found — file may already be patched.)");
} else {
  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched", FILE);
  if (did1) console.log("  - Replaced payload key: qty → quantity");
  if (did2) console.log("  - Switched success metric: data.created → data.count");
  console.log("Backup:", BAK);
}
