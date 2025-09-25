const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-nojump";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
let s = fs.readFileSync(FILE, "utf8");

// 1) Ensure router.replace(..., { scroll: false })
s = s.replace(
  /router\.replace\(\s*url\.toString\(\)\s*\)/g,
  "router.replace(url.toString(), { scroll: false })"
);

// 2) Make the Th click handler prevent default + stop propagation
//    Replace onClick={() => setUrl(col)}   -->   onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUrl(col); }}
s = s.replace(
  /onClick=\{\s*\(\)\s*=>\s*setUrl\(([^)]+)\)\s*\}/g,
  "onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUrl($1); }}"
);

// 3) Ensure the header control is an explicit button type="button"
s = s.replace(
  /<button([^>]*?)onClick=/g,
  (m, attrs) => {
    if (/type=/.test(attrs)) return m; // already has a type
    return `<button type="button"${attrs}onClick=`;
  }
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched ListTable.tsx to prevent scroll on sort clicks. Backup:", path.basename(bak));
