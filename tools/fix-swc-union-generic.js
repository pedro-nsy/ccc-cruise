// node tools/fix-swc-union-generic.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-fix-swc-union";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) Add a named alias FilterPatch after the UsageRow type (or near top)
if (!/type\s+FilterPatch\s*=\s*Partial<\{/.test(s)) {
  const insertAfter = /export\s+type\s+UsageRow\s*=\s*\{[\s\S]*?\};/m;
  const alias =
`\nexport type FilterPatch = Partial<{
  q: string;
  type: "" | "early_bird" | "artist" | "staff";
  status: "" | "active" | "archived" | "reserved" | "consumed";
  used: "" | "yes" | "no";
}>;\n`;
  if (insertAfter.test(s)) {
    s = s.replace(insertAfter, m => m + alias);
  } else {
    // fallback: put it after the Promo type if UsageRow not found
    const afterPromo = /export\s+type\s+Promo\s*=\s*\{[\s\S]*?\};/m;
    if (afterPromo.test(s)) s = s.replace(afterPromo, m => m + alias);
    else s = s.replace(/("use client";?)/, `$1\n${alias}`);
  }
  changed = true;
}

// 2) Replace the inline Partial<{...}> in setFilters with FilterPatch
const inlinePartialRe =
/useCallback\(\s*\(partial:\s*Partial<\{\s*q\s*:\s*string;[\s\S]*?used\s*:\s*""\s*\|\s*"yes"\s*\|\s*"no"\s*;\s*\}\s*>\s*\)\s*=>/m;

if (inlinePartialRe.test(s)) {
  s = s.replace(inlinePartialRe, 'useCallback((partial: FilterPatch) =>');
  changed = true;
} else {
  // If it failed to match, try a looser replacement that targets setFilters line
  s = s.replace(
    /const\s+setFilters\s*=\s*useCallback\(\s*\(partial:\s*[^)]*\)\s*=>/m,
    'const setFilters = useCallback((partial: FilterPatch) =>'
  );
  changed = true;
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Simplified setFilters type via named alias. Backup:", path.basename(BAK));
