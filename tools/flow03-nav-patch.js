const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","travelers","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-flow03-nav";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
if (!/useRouter\(\)/.test(s)) {
  console.error("Router not found in file; manual review needed.");
  process.exit(1);
}

if (/router\.push\(\s*["']\/booking\/cabins["']\s*\)/.test(s)) {
  console.log("• Navigation already present; no change.");
} else {
  s = s.replace(
    /setSaved\("ok"\);\s*\n\s*\}\s*finally\s*\{/,
    'setSaved("ok");\n      // Navigate to Cabins on successful save\n      try { const { startTransition } = await import("react"); startTransition(() => router.push("/booking/cabins")); setTimeout(() => { if (typeof window!=="undefined" && window.location.pathname.includes("/booking/travelers")) window.location.assign("/booking/cabins"); }, 200); } catch {}\n    } finally {'
  );
  console.log("✓ Added navigation to /booking/cabins after successful save.");
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", BAK);
