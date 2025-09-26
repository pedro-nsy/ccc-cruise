const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");

function backup(file, tag){
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  return bak;
}

function run() {
  if (!fs.existsSync(FILE)) { console.log("! FiltersBar not found:", FILE); return; }
  const BAK = backup(FILE, "no-onsearch");
  let s = fs.readFileSync(FILE, "utf8");

  // Remove 'onSearch();' after router.replace(...) in apply() and clearAll()
  s = s.replace(/router\.replace\([^)]+\);\s*\n\s*onSearch\(\);\s*/g, match => {
    return match.replace(/\s*onSearch\(\);\s*/g, ""); // keep the replace, drop onSearch()
  });

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched FiltersBar to avoid double navigation. Backup:", BAK);
}

run();
