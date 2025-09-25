const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","StatsStrip.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-centered";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Replace only the Block wrapper div
s = s.replace(
  /<div className="p-4">/,
  '<div className="p-4 flex flex-col items-center justify-center text-center space-y-1">'
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Centered StatsStrip Block content. Backup:", path.basename(BAK));
