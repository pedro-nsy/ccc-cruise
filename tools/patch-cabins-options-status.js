const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","booking","cabins","options","route.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-fix-confirmed";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Ensure we have the shared constant of capacity-consuming statuses.
if (!/CAPACITY_STATUSES/.test(s)) {
  s = s.replace(
    /(from\s+"@\/lib\/supabase-server";\s*\n)/,
    `$1\n// Bookings that consume ship capacity\nconst CAPACITY_STATUSES = ['DEPOSIT_CONFIRMED','ON_HOLD'] as const;\n`
  );
} else {
  s = s.replace(/CAPACITY_STATUSES\s*=\s*\[[^\]]*\]/, "CAPACITY_STATUSES = ['DEPOSIT_CONFIRMED','ON_HOLD']");
}

// 2) Normalize Supabase filters to use CAPACITY_STATUSES
s = s.replace(
  /\.eq\(\s*["']status["']\s*,\s*["']CONFIRMED["']\s*\)/g,
  `.in("status", CAPACITY_STATUSES as any)`
);
s = s.replace(
  /\.in\(\s*["']status["']\s*,\s*\[[^\]]*\]\s*\)/g,
  `.in("status", CAPACITY_STATUSES as any)`
);

// 3) If any raw SQL string still mentions CONFIRMED, map it to DEPOSIT_CONFIRMED.
//    (E.g., if a text SQL is built for a view/CTE)
s = s.replace(/'CONFIRMED'/g, `'DEPOSIT_CONFIRMED'`);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", BAK);
