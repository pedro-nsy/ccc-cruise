// node tools/fix-sorting-in-hook.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
const bak = FILE + ".bak-step1b-fix";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) Ensure we import/use useSearchParams (Next app router)
if (!/useSearchParams/.test(s)) {
  // add import
  s = s.replace(
    /from\s+"next\/navigation";/,
    (m) => m.replace(';', ', useSearchParams;')
  );
  // add a params instance near other hooks
  if (!/const\s+sp\s*=\s*useSearchParams\(\)/.test(s)) {
    s = s.replace(
      /(\n\s*const\s+\w+\s*=\s*useRouter\(\).*?\n)/s,
      `$1  const sp = useSearchParams();\n`
    );
  }
  changed = true;
}

// 2) Define sort/dir from URL (defaults: created/desc)
if (!/const\s+sort\s*=/.test(s) || !/const\s+dir\s*=/.test(s)) {
  s = s.replace(
    /(const\s+sp\s*=\s*useSearchParams\(\)\s*;?)/,
    `$1
  const sort = (sp.get("sort") || "created").toLowerCase();
  const dir  = (sp.get("dir") === "asc" ? "asc" : "desc");`
  );
  changed = true;
}

// 3) When constructing the API URL, add sort/dir
// Try the common patterns for the URL variable name (u or apiUrl)
if (!/searchParams\.set\(["']sort["']/.test(s)) {
  s = s.replace(
    /(const\s+(u|apiUrl)\s*=\s*new\s+URL\(["']\/api\/admin\/promos["'][^)]*\)\s*;)/,
    `$1
  $2.searchParams.set("sort", sort);
  $2.searchParams.set("dir", dir);`
  );
  changed = true;
}

// 4) Ensure fetch effect re-runs when sort/dir change.
// Add sort/dir to *every* useEffect dependency array in this file.
s = s.replace(
  /useEffect\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[([\s\S]*?)\]\s*\)/g,
  (m, deps) => {
    // already present?
    if (/\bsort\b/.test(deps) && /\bdir\b/.test(deps)) return m;
    const withSort = /\bsort\b/.test(deps) ? deps : (deps.trim() ? deps.trim() + ", sort" : "sort");
    const withDir  = /\bdir\b/.test(withSort) ? withSort : (withSort.trim() ? withSort.trim() + ", dir" : "dir");
    changed = true;
    return m.replace(deps, withDir);
  }
);

if (!changed) {
  console.log("No changes applied (file may already include sort/dir + deps).");
  process.exit(0);
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Updated useAdminPromos.ts: now sends sort/dir and refetches on change. Backup:", path.basename(bak));
