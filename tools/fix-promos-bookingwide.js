// node tools/fix-promos-bookingwide.js  (run from /web)
const fs = require("fs");
const path = require("path");
const ROOT = path.join("src","app","admin","promos");

const REPLACEMENTS = [
  // common phrasing → traveler-only
  [/\bbooking[-\s]?wide\b/gi, "traveler-only"],
  [/\bentire booking\b/gi, "each traveler"],
  [/\bapplies to the entire booking\b/gi, "applies per traveler"],
  [/\bapplies to .* booking\b/gi, "applies per traveler"],
  [/\bper booking\b/gi, "per traveler"],
  [/\bparty size\b/gi, "traveler count"],
  [/\bparty\b/gi, "traveler(s)"],

  // details drawer hints (we’ll adjust if your file uses different copy)
  [/Reserved by Booking/gi, "Reserved by Traveler"],
  [/Consumed by Booking/gi, "Consumed by Traveler"],
  [/Reserved by\s*booking/gi, "Reserved by traveler"],
  [/Consumed by\s*booking/gi, "Consumed by traveler"],
];

function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

if (!fs.existsSync(ROOT)) { console.error("Not found:", ROOT); process.exit(1); }

let changed = 0, files = [];
for (const file of walk(ROOT)) {
  const orig = fs.readFileSync(file, "utf8");
  let next = orig;
  for (const [from,to] of REPLACEMENTS) next = next.replace(from, to);
  if (next !== orig) {
    const bak = file + ".bak-0.6";
    if (!fs.existsSync(bak)) fs.writeFileSync(bak, orig, "utf8");
    fs.writeFileSync(file, next, "utf8");
    changed++; files.push(file);
  }
}

console.log(changed ? `Updated ${changed} file(s):\n - ${files.join("\n - ")}` : "No changes were needed.");
console.log("Backups written with .bak-0.6 next to any edited file.");
