const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-typefix";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Fix the broken type annotation: ", embedded?: boolean })" -> " embedded?: boolean; })"
s = s.replace(/\n\s*,\s*embedded\?\:\s*boolean\s*\}\)/, "\n  embedded?: boolean; })");

// (Optional safety) If the annotation block ends with "... onSearch: () => void; })" and no embedded line,
// append it properly.
if (/onSearch:\s*\(\)\s*=>\s*void;\s*\}\)\s*\{/.test(s) && !/embedded\?\:\s*boolean/.test(s)) {
  s = s.replace(/onSearch:\s*\(\)\s*=>\s*void;\s*\}\)\s*\{/, "onSearch: () => void; embedded?: boolean; }){");
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Fixed FiltersBar type annotation. Backup:", BAK);
