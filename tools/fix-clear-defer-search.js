// node tools/fix-clear-defer-search.js
const fs = require("fs");
const path = require("path");

const TARGET = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(TARGET)) {
  console.error("Not found:", TARGET);
  process.exit(1);
}
const bak = TARGET + ".bak-clear-defer";
if (!fs.existsSync(bak)) fs.copyFileSync(TARGET, bak);

let s = fs.readFileSync(TARGET, "utf8");
const before = s;

// replace the inline Clear handler we added earlier
s = s.replace(
  /onClick=\{\(\)\s*=>\s*\{\s*setQ\(""\);\s*setType\(""\);\s*setStatus\(""\);\s*setUsed\(""\);\s*onSearch\(\);\s*\}\s*\}/,
  'onClick={() => { setQ(""); setType(""); setStatus(""); setUsed(""); setTimeout(() => onSearch(), 0); }}'
);

if (s === before) {
  console.log("No matching Clear handler found (maybe already fixed).");
  process.exit(0);
}

fs.writeFileSync(TARGET, s, "utf8");
console.log("✓ Updated FiltersBar.tsx to defer onSearch() after Clear. Backup:", path.basename(bak));
