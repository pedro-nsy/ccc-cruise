// Run from: C:\Users\pedro\Documents\code\ccc-cruise\web
// node tools/fix-useAdminPromos-hook.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}

const src = fs.readFileSync(FILE, "utf8");
let out = src;
let changed = false;

// 1) Remove "disabled" from any union type or array
out = out.replace(/\b\|?\s*"disabled"/g, () => { changed = true; return ""; });

// 2) Default filter state: normalize allowed statuses
out = out.replace(
  /status:\s*["']disabled["']|status:\s*["']active["']|status:\s*["']archived["']|status:\s*["']reserved["']|status:\s*["']consumed["']|status:\s*["']all["']|status:\s*""/g,
  (m) => {
    changed = true;
    return "status: \"\"";
  }
);

// 3) If old URLs might include disabled, map them → archived
if (!out.includes("if (status === \"disabled\")")) {
  out = out.replace(
    /const url = new URL\(.*\);/,
    (m) => `${m}\n  // Legacy mapping: disabled → archived\n  if (status === "disabled") status = "archived";`
  );
  changed = true;
}

if (!changed) {
  console.log("No disabled traces found; file already clean.");
  process.exit(0);
}

const bak = FILE + ".bak-0.8";
if (!fs.existsSync(bak)) fs.writeFileSync(bak, src, "utf8");
fs.writeFileSync(FILE, out, "utf8");
console.log("✓ Updated useAdminPromos.ts — disabled removed, default filters set, legacy mapping added if missing.");
