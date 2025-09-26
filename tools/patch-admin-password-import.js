const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","password","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-8.4-import";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");
s = s.replace(`from "@/src/lib/adminSession"`, `from "@/lib/adminSession"`);
fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched import in", FILE, "Backup:", bak);
