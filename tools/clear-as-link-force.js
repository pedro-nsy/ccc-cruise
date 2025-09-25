// node tools/clear-as-link-force.js
const fs = require("fs");
const path = require("path");

const TARGET = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(TARGET)) {
  console.error("Not found:", TARGET);
  process.exit(1);
}
const bak = TARGET + ".bak-clear-link-force";
if (!fs.existsSync(bak)) fs.copyFileSync(TARGET, bak);

let src = fs.readFileSync(TARGET, "utf8");
const before = src;

// Regex: catch any JSX element with "Clear"
const clearRegex = /<[^>]*Clear[^>]*>Clear<\/[^>]+>/g;

src = src.replace(
  clearRegex,
  `<a
    href="/admin/promos?page=1"
    className="btn btn-ghost text-sm px-3 py-2"
    onClick={() => { setQ(""); setType(""); setStatus(""); setUsed(""); }}
  >
    Clear
  </a>`
);

if (src === before) {
  console.log("No Clear element found to replace. Please paste me the exact Clear JSX snippet from FiltersBar.tsx so I can target it exactly.");
  process.exit(0);
}

fs.writeFileSync(TARGET, src, "utf8");
console.log("✓ Replaced Clear element with link version. Backup:", path.basename(bak));
