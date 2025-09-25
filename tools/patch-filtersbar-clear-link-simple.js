// node tools/patch-filtersbar-clear-link-simple.js
const fs = require("fs");
const path = require("path");

const TARGET = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(TARGET)) {
  console.error("Not found:", TARGET);
  process.exit(1);
}
const bak = TARGET + ".bak-clear-link-simple";
if (!fs.existsSync(bak)) fs.copyFileSync(TARGET, bak);

let s = fs.readFileSync(TARGET, "utf8");
const before = s;

// 1) Remove any Clear <button>...</button> regardless of attributes/spacing
//    (Only remove buttons whose innerText is exactly "Clear")
s = s.replace(/<button\b[^>]*>\s*Clear\s*<\/button>/g, "");

// 2) Insert Clear <a> link immediately after the FIRST occurrence of "Search</button>"
const clearLink = `<a
  href="/admin/promos?page=1"
  className="btn btn-ghost text-sm px-3 py-2"
  onClick={() => { setQ(""); setType(""); setStatus(""); setUsed(""); }}
>Clear</a>`;

const idx = s.indexOf("Search</button>");
if (idx !== -1) {
  s = s.slice(0, idx + "Search</button>".length) + clearLink + s.slice(idx + "Search</button>".length);
} else {
  console.log("! Could not find 'Search</button>' to attach Clear link. No changes made.");
  process.exit(0);
}

// 3) Remove any trailing “Clear filters” block (if it exists)
s = s.replace(/<div[^>]*>\s*<a[^>]*>\s*Clear filters\s*<\/a>\s*<\/div>\s*$/m, "");

// Write back
fs.writeFileSync(TARGET, s, "utf8");
console.log("✓ FiltersBar.tsx updated: Clear button replaced with link next to Search. Backup:", path.basename(bak));
