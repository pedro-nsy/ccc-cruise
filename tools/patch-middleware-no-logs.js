const fs = require("fs");
const path = require("path");

const FILE = path.join("middleware.ts");  // at project root
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-no-logs";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// remove any console.log debug lines like [MW] hit: ...
s = s.replace(/^\s*console\.log\([^)]*\);\s*$/mg, "");

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Cleaned middleware.ts debug logs. Backup:", BAK);
