// node tools/patch-filtersbar-clear-link-exact.js
const fs = require("fs");
const path = require("path");

const TARGET = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(TARGET)) {
  console.error("Not found:", TARGET);
  process.exit(1);
}
const bak = TARGET + ".bak-clear-link-exact";
if (!fs.existsSync(bak)) fs.copyFileSync(TARGET, bak);

let s = fs.readFileSync(TARGET, "utf8");

// 1) Replace the inline Clear <button> with a link <a href="/admin/promos?page=1"...>
s = s.replace(
  /<div className="flex items-center justify-end gap-2"><button([^>]+)>Search<\/button><button[^>]*onClick=\{\s*\(\)\s*=>\s*\{\s*setQ\\(""\);\s*setType\(""\);\s*setStatus\(""\);\s*setUsed\(""\);\s*setTimeout\(\s*\(\)\s*=>\s*onSearch\(\)\s*,\s*0\s*\);\s*\}\s*\}\s*\n?>Clear<\/button><\/div>/m,
  (m, searchAttrs) => {
    const searchBtn = `<button${searchAttrs}>Search</button>`;
    const clearLink =
      `<a href="/admin/promos?page=1" ` +
      `className="btn btn-ghost text-sm px-3 py-2" ` +
      `onClick={() => { setQ(""); setType(""); setStatus(""); setUsed(""); }}` +
      `>Clear</a>`;
    return `<div className="flex items-center justify-end gap-2">${searchBtn}${clearLink}</div>`;
  }
);

// 2) Remove the trailing, duplicate "Clear filters" block at the bottom (outside component)
s = s.replace(
/\s*<div className="mt-4 flex justify-end">\s*<a\s*href="\/admin\/promos\?page=1"[\s\S]*?Clear filters[\s\S]*?<\/div>\s*$/m,
"\n"
);

fs.writeFileSync(TARGET, s, "utf8");
console.log("✓ FiltersBar.tsx updated: Clear is now a link; duplicate bottom block removed. Backup:", path.basename(bak));
