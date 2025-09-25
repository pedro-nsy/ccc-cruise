// node tools/fix-sorting-live.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-step1b-live";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) Ensure we import/use useSearchParams
if (/from\s+["']next\/navigation["']/.test(s)) {
  if (!/useSearchParams/.test(s)) {
    s = s.replace(
      /from\s+["']next\/navigation["'];?/,
      (m) => m.replace("{", "{ useSearchParams, ")
    );
    changed = true;
  }
} else {
  s = `import { useSearchParams } from "next/navigation";\n` + s;
  changed = true;
}

// 2) Ensure sp, sort, dir are defined once near other hooks
if (!/const\s+sp\s*=\s*useSearchParams\(\)/.test(s)) {
  // insert after first useRouter or useState block
  s = s.replace(
    /(const\s+\w+\s*=\s*useRouter\(\)\s*;?)/,
    `$1\n  const sp = useSearchParams();`
  );
  changed = true;
}
if (!/const\s+sort\s*=/.test(s)) {
  s = s.replace(
    /(const\s+sp\s*=\s*useSearchParams\(\)\s*;?)/,
    `$1\n  const sort = (sp.get("sort") || "created").toLowerCase();`
  );
  changed = true;
}
if (!/const\s+dir\s*=/.test(s)) {
  s = s.replace(
    /(const\s+sort\s*=\s*\(sp\.get\("sort"\)[\s\S]*?\);\s*)/,
    `$1  const dir  = (sp.get("dir") === "asc" ? "asc" : "desc");\n`
  );
  changed = true;
}

// 3) Ensure our API URL includes sort/dir
// find creation of API URL for list (most common vars: u or apiUrl)
if (!/searchParams\.set\(["']sort["']/.test(s)) {
  s = s.replace(
    /(const\s+(u|apiUrl)\s*=\s*new\s+URL\(["']\/api\/admin\/promos["'][^)]*\)\s*;)/,
    `$1\n  $2.searchParams.set("sort", sort);\n  $2.searchParams.set("dir", dir);`
  );
  // In case variable name is different, try a generic fallback: first new URL('/api/admin/promos'
  if (!/searchParams\.set\(["']sort["']/.test(s)) {
    s = s.replace(
      /(const\s+([a-zA-Z_]\w*)\s*=\s*new\s+URL\(["']\/api\/admin\/promos["'][^)]*\)\s*;)/,
      `$1\n  $2.searchParams.set("sort", sort);\n  $2.searchParams.set("dir", dir);`
    );
  }
  changed = true;
}

// 4) Ensure fetchList useCallback depends on sort/dir
// Match ... useCallback(async () => { ... }, [ ... ])
s = s.replace(
  /useCallback\(\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[([\s\S]*?)\]\s*\)/g,
  (m, body, deps) => {
    let d = deps.trim();
    let did = false;
    if (!/\bsort\b/.test(d)) { d = d ? d + ", sort" : "sort"; did = true; }
    if (!/\bdir\b/.test(d))  { d = d ? d + ", dir"  : "dir";  did = true; }
    if (!did) return m;
    changed = true;
    return `useCallback(async () => {${body}}, [${d}])`;
  }
);

// 5) Ensure any useEffect that calls fetchList depends on sort/dir
s = s.replace(
  /useEffect\(\s*\(\)\s*=>\s*\{\s*([^}]*)fetchList\(\);?([\s\S]*?)\},\s*\[([\s\S]*?)\]\s*\)/g,
  (m, pre, post, deps) => {
    let d = deps.trim();
    let did = false;
    if (!/\bsort\b/.test(d)) { d = d ? d + ", sort" : "sort"; did = true; }
    if (!/\bdir\b/.test(d))  { d = d ? d + ", dir"  : "dir";  did = true; }
    if (!did) return m;
    changed = true;
    return `useEffect(() => { ${pre}fetchList();${post} }, [${d}])`;
  }
);

if (!changed) {
  console.log("No changes applied (hook may already include sort/dir and correct deps).");
  process.exit(0);
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Hook patched: reads sort/dir, includes them in fetch URL, and refetches on change. Backup:", path.basename(bak));
