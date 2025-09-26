const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","booking","cabins","options","route.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-oversell-statuses";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

/**
 * 1) Ensure we have a shared constant of statuses that count toward capacity.
 *    If a constant already exists, we normalize it; otherwise we inject one near the imports.
 */
if (!/CAPACITY_STATUSES/.test(s)) {
  s = s.replace(
    /(from\s+"@\/lib\/supabase-server";\s*\n)/,
    `$1\n// Bookings that consume ship capacity\nconst CAPACITY_STATUSES = ['DEPOSIT_CONFIRMED','ON_HOLD'] as const;\n`
  );
} else {
  s = s.replace(/CAPACITY_STATUSES\s*=\s*\[[^\]]*\]/, "CAPACITY_STATUSES = ['DEPOSIT_CONFIRMED','ON_HOLD']");
}

/**
 * 2) Replace any single-status filter like .eq("status",'DEPOSIT_CONFIRMED')
 *    with an .in("status", CAPACITY_STATUSES as any)
 */
s = s.replace(
  /\.eq\(\s*["']status["']\s*,\s*["']DEPOSIT_CONFIRMED["']\s*\)/g,
  `.in("status", CAPACITY_STATUSES as any)`
);

/**
 * 3) If code previously used an array literal for statuses, normalize it too.
 */
s = s.replace(
  /\.in\(\s*["']status["']\s*,\s*\[[^\]]*\]\s*\)/g,
  `.in("status", CAPACITY_STATUSES as any)`
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", BAK);
