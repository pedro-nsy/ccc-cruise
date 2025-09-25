// node tools/fix-hook-add-sort-dir.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-step1b-sortdir";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) Ensure we read sort/dir from URL search params (if not already)
if (!/sp\.get\(["']sort["']\)/.test(s) || !/sp\.get\(["']dir["']\)/.test(s)) {
  // After the line that defines sp = useSearchParams() or new URLSearchParams(...)
  s = s.replace(
    /(const\s+sp\s*=\s*useSearchParams\(\)\s*;)/,
    `$1\n  const sort = (sp.get("sort") || "created").toLowerCase();\n  const dir = (sp.get("dir") === "asc" ? "asc" : "desc");`
  );
  // If your hook uses new URL(window.location.href), add a similar block near there:
  s = s.replace(
    /(const\s+url\s*=\s*new URL\([^)]+\)\s*;)/,
    `$1\n  const sp = url.searchParams; const sort = (sp.get("sort") || "created").toLowerCase(); const dir = (sp.get("dir") === "asc" ? "asc" : "desc");`
  );
  changed = true;
}

// 2) Make sure sort/dir get appended to the API URL query
// Find where we construct the /api/admin/promos URL and set params
if (!/searchParams\.set\(["']sort["']/.test(s)) {
  s = s.replace(
    /(const\s+u\s*=\s*new URL\(["']\/api\/admin\/promos["'][^)]*\)\s*;)/,
    `$1\n  u.searchParams.set("sort", sort);\n  u.searchParams.set("dir", dir);`
  );
  s = s.replace(
    /(const\s+apiUrl\s*=\s*new URL\(["']\/api\/admin\/promos["'][^)]*\)\s*;)/,
    `$1\n  apiUrl.searchParams.set("sort", sort);\n  apiUrl.searchParams.set("dir", dir);`
  );
  changed = true;
}

// 3) If there’s a whitelist of allowed params for the fetch, include sort/dir if missing
if (/allowed(Status|Type)/.test(s) && !/allowed.*sort/.test(s)) {
  s = s.replace(/(const\s+allowed[^\n]*=\s*new Set\(\[)([^\]]*)(\]\);)/,
    (m,a,b,c)=> a + b.replace(/\s+$/,'') + `, "sort", "dir"` + c
  );
  changed = true;
}

if (!changed) {
  console.log("No changes applied (file may already include sort/dir).");
  process.exit(0);
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Hook updated to include sort/dir in API fetch. Backup:", path.basename(bak));
