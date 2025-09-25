// node tools/scan-promos-bookingwide.js  (run from /web)
const fs = require("fs");
const path = require("path");
const ROOT = path.join("src","app","admin","promos");
const NEEDLES = [
  /booking[-\s]?wide/i,
  /entire booking/i,
  /\bparty size\b/i,
  /\bparty\b/i,                 // catches “party” label if used for booking-wide
  /applies to .*booking/i,
  /per booking/i
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

let hits = 0;
for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, "utf8");
  let any = false;
  for (const re of NEEDLES) { if (re.test(src)) { any = true; break; } }
  if (any) {
    console.log("\n" + file);
    const lines = src.split(/\r?\n/);
    lines.forEach((line,i)=>{
      for (const re of NEEDLES) {
        if (re.test(line)) {
          hits++; console.log(String(i+1).padStart(4," "), "│", line.trim());
          break;
        }
      }
    });
  }
}
console.log(hits ? `\nFound ${hits} match(es).` : "No booking-wide wording found.");
