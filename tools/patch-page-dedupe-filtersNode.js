const fs = require("fs"), path = require("path");
const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-dedupe";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Find the ListTable JSX region and dedupe filtersNode props inside it
s = s.replace(/<ListTable([\s\S]*?)\/>/m, (block) => {
  let seen = false;
  const cleaned = block.replace(/(\s*filtersNode=\{[\s\S]*?\})/g, (m) => {
    if (seen) return "";
    seen = true;
    return m;
  });
  return cleaned;
});

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ page.tsx: deduped filtersNode if duplicated. Backup:", BAK);
