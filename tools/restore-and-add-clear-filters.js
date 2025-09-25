// Run from: C:\Users\pedro\Documents\code\ccc-cruise\web
// node tools/restore-and-add-clear-filters.js
const fs = require("fs");
const path = require("path");

const DIR = path.join("src","app","admin","promos","sections");
const TARGET = path.join(DIR, "FiltersBar.tsx");
const BACKUP = path.join(DIR, "FiltersBar.tsx.bak-step1a");

if (!fs.existsSync(BACKUP)) {
  console.error("Backup not found:", BACKUP);
  process.exit(1);
}
if (!fs.existsSync(TARGET)) {
  console.error("Target not found:", TARGET);
  process.exit(1);
}

// 1) Restore original file
const orig = fs.readFileSync(BACKUP, "utf8");
const pre = fs.readFileSync(TARGET, "utf8");
const restoreBak = TARGET + ".bak-before-restore";
if (!fs.existsSync(restoreBak)) fs.writeFileSync(restoreBak, pre, "utf8");
fs.writeFileSync(TARGET, orig, "utf8");

// 2) Re-open restored content and inject a minimal "Clear filters" link if missing
let src = fs.readFileSync(TARGET, "utf8");
if (src.includes("Clear filters")) {
  console.log("Clear filters already present; nothing to inject.");
  process.exit(0);
}

// Insert right before the first closing </section>
const insertBlock = `
  <div className="mt-4 flex justify-end">
    <a
      href="/admin/promos?page=1"
      className="rounded-xl border px-4 py-2.5 bg-white hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      Clear filters
    </a>
  </div>
`;

const closeIdx = src.indexOf("</section>");
if (closeIdx === -1) {
  console.log("No </section> tag found; appending Clear filters block at end of file.");
  src += "\n" + insertBlock + "\n";
} else {
  src = src.slice(0, closeIdx) + insertBlock + "\n" + src.slice(closeIdx);
}

const afterBak = TARGET + ".bak-after-clear";
if (!fs.existsSync(afterBak)) fs.writeFileSync(afterBak, src, "utf8"); // snapshot of injected version
fs.writeFileSync(TARGET, src, "utf8");

console.log("✓ Restored FiltersBar.tsx and added a minimal Clear filters link.");
console.log("Backups:");
console.log(" - Original before this script:", restoreBak);
console.log(" - After adding Clear button:", afterBak);
