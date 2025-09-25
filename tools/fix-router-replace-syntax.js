// node tools/fix-router-replace-syntax.js
const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-fix-router-replace";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");

// 1) Fix the broken call: router.replace(url.toString(, { scroll: false }))
s = s.replace(
  /router\.replace\(\s*url\.toString\(\s*,\s*\{\s*scroll:\s*false\s*\}\s*\)\s*\)/g,
  "router.replace(url.toString(), { scroll: false })"
);

// 2) If we only had router.replace(url.toString()), add {scroll:false}
s = s.replace(
  /router\.replace\(\s*url\.toString\(\)\s*\)/g,
  "router.replace(url.toString(), { scroll: false })"
);

// 3) If we had router.replace(url) earlier, also add {scroll:false}
s = s.replace(
  /router\.replace\(\s*url\s*\)/g,
  "router.replace(url, { scroll: false })"
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Fixed router.replace() syntax and added { scroll: false }. Backup:", path.basename(bak));
