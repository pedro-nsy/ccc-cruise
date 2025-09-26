const fs = require("fs"), path = require("path");
const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-dedupe-filtersNode-final";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);
let s = fs.readFileSync(FILE, "utf8");

s = s.replace(/<ListTable([\s\S]*?)>/m, (m, inside) => {
  let seen = false;
  const cleaned = inside.replace(/(\s*filtersNode=\{[\s\S]*?\})/g, (prop) => {
    if (seen) return "";
    seen = true;
    return prop;
  });
  return "<ListTable" + cleaned + ">";
});

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ page.tsx: duplicate filtersNode removed. Backup:", BAK);
