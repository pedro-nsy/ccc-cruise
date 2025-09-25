// node tools/clear-as-link.js
const fs = require("fs");
const path = require("path");

const TARGET = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(TARGET)) {
  console.error("Not found:", TARGET);
  process.exit(1);
}
const bak = TARGET + ".bak-clear-link";
if (!fs.existsSync(bak)) fs.copyFileSync(TARGET, bak);

let s = fs.readFileSync(TARGET, "utf8");
const before = s;

// Replace any Clear <button>…</button> we added with a link <a …>Clear</a>
const clearBtnRe = /<button[^>]*>\s*Clear\s*<\/button>/g;
s = s.replace(
  clearBtnRe,
  `<a
  href="/admin/promos?page=1"
  className="btn btn-ghost text-sm px-3 py-2"
  onClick={() => { setQ(""); setType(""); setStatus(""); setUsed(""); }}
>
  Clear
</a>`
);

if (s === before) {
  console.log("No Clear <button> found to replace (maybe already a link).");
  process.exit(0);
}

fs.writeFileSync(TARGET, s, "utf8");
console.log("✓ Replaced Clear button with link. Backup:", path.basename(bak));
