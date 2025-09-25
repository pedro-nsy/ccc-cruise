// node tools/suppress-no-token.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-suppress-no-token";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) Inside the "if (!res.ok || json?.ok === false) { ... }" block,
//    inject a guard that returns quietly if NO_TOKEN is reported.
s = s.replace(
  /if\s*\(!res\.ok\s*\|\|\s*json\?\.\ok\s*===\s*false\)\s*\{\s*([^}]*)throw new Error\(([^)]*)\);\s*\}/m,
  (m, pre, expr) => {
    changed = true;
    return `if (!res.ok || json?.ok === false) {
      ${pre}
      if (json?.error === "NO_TOKEN" || json?.message === "NO_TOKEN") { return; }
      throw new Error(${expr});
    }`;
  }
);

// 2) In the catch block, avoid logging NO_TOKEN
s = s.replace(
  /if\s*\(e\?\.\s*name\s*!==\s*["']AbortError["']\)\s*console\.error\(\s*["']Load promos failed:\s*["']\s*,\s*e\?\.\s*message\s*\|\|\s*e\s*\);/,
  'if (e?.name !== "AbortError" && e?.message !== "NO_TOKEN") console.error("Load promos failed:", e?.message || e);'
);

if (!changed) {
  console.log("No changes were necessary (file may already suppress NO_TOKEN).");
} else {
  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ NO_TOKEN errors are now suppressed. Backup:", path.basename(BAK));
}
