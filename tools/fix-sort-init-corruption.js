// node tools/fix-sort-init-corruption.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-sort-fix";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");

// 1) Remove the corrupted token "sort, dir" glued to useEffect
s = s.replace(/sort,\s*dir\s*useEffect\(/g, "useEffect(");

// 2) Ensure we import useSearchParams from next/navigation
if (/from\s+["']next\/navigation["']/.test(s) && !/useSearchParams/.test(s)) {
  s = s.replace(
    /from\s+["']next\/navigation["'];?/,
    (m) => m.replace('{', '{ useSearchParams, ').replace('import ', 'import ')
  );
} else if (!/from\s+["']next\/navigation["']/.test(s)) {
  // Add a new import if missing entirely
  s = `import { useSearchParams } from "next/navigation";\n` + s;
}

// 3) Ensure we create sp, sort, dir once (near the top of the hook)
if (!/const\s+sp\s*=\s*useSearchParams\(\)/.test(s)) {
  // Insert after the first occurrence of "useRouter(" or near other hooks
  s = s.replace(
    /(const\s+\w+\s*=\s*useRouter\(\)\s*;)/,
    `$1\n  const sp = useSearchParams();`
  );
}
if (!/const\s+sort\s*=/.test(s) || !/const\s+dir\s*=/.test(s)) {
  // Place right after sp definition
  s = s.replace(
    /(const\s+sp\s*=\s*useSearchParams\(\)\s*;)/,
    `$1\n  const sort = (sp.get("sort") || "created").toLowerCase();\n  const dir  = (sp.get("dir") === "asc" ? "asc" : "desc");`
  );
}

// 4) Ensure API URL includes sort/dir (handle common variable names)
if (!/searchParams\.set\(["']sort["']/.test(s)) {
  s = s.replace(
    /(const\s+(u|apiUrl)\s*=\s*new\s+URL\(["']\/api\/admin\/promos["'][^)]*\)\s*;)/,
    `$1\n  $2.searchParams.set("sort", sort);\n  $2.searchParams.set("dir", dir);`
  );
}

// 5) Make sure effects depend on sort/dir (without corrupting code)
s = s.replace(
  /useEffect\(\s*\((?:.|\n)*?\)\s*=>\s*\{([\s\S]*?)\},\s*\[([\s\S]*?)\]\s*\)/g,
  (m, body, deps) => {
    let d = deps;
    if (!/\bsort\b/.test(d)) d = d.replace(/\s*\]$/, (x) => (d.trim().length ? ", sort]" : "sort]"));
    if (!/\bdir\b/.test(d))  d = d.replace(/\s*\]$/, (x) => (d.trim().length ? ", dir]"  : "dir]"));
    return `useEffect(() => {${body}}, [${d}])`;
  }
);

// 6) Tiny cleanup: avoid duplicate declarations if any patch earlier added them
s = s.replace(/\n\s*const\s+sort\s*=.*\n(?=[\s\S]*const\s+sort\s*=)/, "\n");
s = s.replace(/\n\s*const\s+dir\s*=.*\n(?=[\s\S]*const\s+dir\s*=)/, "\n");

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Fixed corrupted useEffect token and ensured sort/dir are defined & used. Backup:", path.basename(bak));
