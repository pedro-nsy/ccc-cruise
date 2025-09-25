// node tools/no-scroll-on-sort.js
const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-no-scroll";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
const before = s;

// Replace router.replace(url) with router.replace(url, { scroll: false })
s = s.replace(
  /router\.replace\(\s*([^)]+)\s*\)/g,
  "router.replace($1, { scroll: false })"
);

if (s === before) {
  console.log("i No router.replace(...) found to patch (or already no-scroll).");
} else {
  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched router.replace to { scroll: false }. Backup:", path.basename(BAK));
}
