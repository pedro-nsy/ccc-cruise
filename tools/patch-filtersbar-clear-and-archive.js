// node tools/patch-filtersbar-clear-and-archive.js
const fs = require("fs");
const path = require("path");

const TARGET = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(TARGET)) {
  console.error("Not found:", TARGET);
  process.exit(1);
}
const bak = TARGET + ".bak-step1a-final";
if (!fs.existsSync(bak)) fs.copyFileSync(TARGET, bak);

let src = fs.readFileSync(TARGET, "utf8");
let changed = false;

// 1) Replace "Disabled" option with "Archived"
const beforeStatus = src;
src = src.replace(/<option value="disabled">Disabled<\/option>/, `<option value="archived">Archived</option>`);
if (src !== beforeStatus) { changed = true; console.log("• Status option: Disabled → Archived"); }

// 2) Add Enter-to-search on the input (only if not already present)
if (!/onKeyDown=\{.*=>.*onSearch\(\)/s.test(src)) {
  src = src.replace(
    /(<input[\s\S]*?onChange=\{e => setQ\(e\.target\.value\)\}[\s\S]*?\/>)/,
    (m) => m.replace(/\/>$/, `\n            onKeyDown={e => e.key === 'Enter' && onSearch()}\n          />`)
  );
  changed = true;
  console.log("• Input: Enter triggers onSearch()");
}

// 3) Replace the single Search button with a side-by-side Search + Clear
//    We keep your existing button, add compact classes, and append a Clear button.
const searchBtnRe = /<button\s+type="button"\s+className="([^"]*)"\s+onClick=\{onSearch\}\s*>\s*Search\s*<\/button>/m;
if (searchBtnRe.test(src)) {
  src = src.replace(searchBtnRe, (m, classes) => {
    // add compact sizing if not already there
    const extra = ["text-sm","px-3","py-2"].filter(c => !classes.includes(c)).join(" ");
    const newClasses = extra ? `${classes} ${extra}` : classes;
    const searchBtn = `<button type="button" className="${newClasses}" onClick={onSearch}>Search</button>`;
    const clearBtn  = `<button type="button" className="btn btn-ghost text-sm px-3 py-2" onClick={() => { setQ(""); setType(""); setStatus(""); setUsed(""); onSearch(); }}>Clear</button>`;
    return `<div className="flex items-center justify-end gap-2">${searchBtn}${clearBtn}</div>`;
  });
  changed = true;
  console.log("• Added Clear button next to Search (compact sizing applied)");
} else {
  console.log("i Couldn’t match the Search button pattern — no change there.");
}

if (!changed) {
  console.log("No changes were needed.");
  process.exit(0);
}

fs.writeFileSync(TARGET, src, "utf8");
console.log("✓ FiltersBar.tsx updated. Backup at:", path.basename(bak));
