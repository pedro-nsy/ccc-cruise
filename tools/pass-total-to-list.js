const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-step1c-pass-total";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// Add total={model.total} to <ListTable ... />
if (!/total=\{model\.total\}/.test(s)) {
  s = s.replace(
    /<ListTable([\s\S]*?)\/>/m,
    (m, attrs) => {
      if (/total=\{/.test(attrs)) return m;
      changed = true;
      return `<ListTable${attrs}\n        total={model.total}\n      />`;
    }
  );
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ page.tsx now passes total to ListTable. Backup:", path.basename(bak));
