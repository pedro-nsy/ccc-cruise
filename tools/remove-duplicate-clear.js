// node tools/remove-duplicate-clear.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-remove-dup-clear";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");
const before = s;

// 1) Remove the old Clear <button> that uses setTimeout(() => onSearch(), 0)
s = s.replace(
  /<button[^>]*onClick=\{\s*\(\)\s*=>\s*\{\s*setQ\(""\);\s*setType\(""\);\s*setStatus\(""\);\s*setUsed\(""\);\s*setTimeout\(\s*\(\)\s*=>\s*onSearch\(\)\s*,\s*0\s*\);\s*\}\s*\}\s*>\s*Clear\s*<\/button>/m,
  ""
);

// 2) Safety: if any other Clear <button> remains, remove it too (we keep the <a> link Clear)
s = s.replace(/<button\b[^>]*>\s*Clear\s*<\/button>/g, "");

// Done
if (s === before) {
  console.log("No duplicate Clear <button> found (file already clean).");
  process.exit(0);
}
fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Removed duplicate Clear button. Backup:", path.basename(bak));
