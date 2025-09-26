const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","booking","cabins","options","route.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-prices";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Fix template literal keys for price map (remove the backslashes)
s = s.replace(
  /priceMap\.set\(`\$\{r\.category\}\|\\\$\{r\.occupancy\}`,\s*r\.price_cents\);/,
  'priceMap.set(`${r.category}|${r.occupancy}`, Number(r.price_cents));'
);

// 2) Fix pp() to use the same correct key
s = s.replace(
  /function pp\([^)]+\)\s*\{\s*return priceMap\.get\(`\$\{category\}\|\\\$\{occ\}`\) \?\? 0;\s*\}/,
  'function pp(category, occ) { return Number(priceMap.get(`${category}|${occ}`) ?? 0); }'
);

// Optional: if earlier versions formatted slightly differently, apply a more permissive fallback:
if (!/priceMap\.set\(`\$\{r\.category\}\|\$\{r\.occupancy\}`/.test(s)) {
  s = s.replace(/\|\\\$\{r\.occupancy\}/g, '|${r.occupancy}');
  s = s.replace(/\|\\\$\{occ\}/g, '|${occ}');
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", BAK);
