// node tools/fix-clear-flushsync.js
const fs = require("fs");
const path = require("path");

const TARGET = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(TARGET)) { console.error("Not found:", TARGET); process.exit(1); }
const bak = TARGET + ".bak-clear-flushsync";
if (!fs.existsSync(bak)) fs.copyFileSync(TARGET, bak);

let s = fs.readFileSync(TARGET, "utf8");

// 1) ensure import { flushSync } from 'react-dom'
if (!/from\s+["']react-dom["']/.test(s)) {
  // insert after first import line
  s = s.replace(/(^import[^\n]*\n)/, `$1import { flushSync } from "react-dom";\n`);
} else if (!/flushSync/.test(s)) {
  // extend existing react-dom import
  s = s.replace(/import\s*\{([^}]*)\}\s*from\s*["']react-dom["'];?/, (m, names) => {
    const list = names.split(",").map(x=>x.trim()).filter(Boolean);
    if (!list.includes("flushSync")) list.push("flushSync");
    return `import { ${list.join(", ")} } from "react-dom";`;
  });
}

// 2) replace Clear handler to flush then search
const handlerRe = /onClick=\{\(\)\s*=>\s*\{\s*setQ\(""\);\s*setType\(""\);\s*setStatus\(""\);\s*setUsed\(""\);\s*(setTimeout\(\s*=>\s*onSearch\(\)\s*,\s*0\s*\)|onSearch\(\));\s*\}\s*\}/;
s = s.replace(handlerRe,
  'onClick={() => { flushSync(() => { setQ(""); setType(""); setStatus(""); setUsed(""); }); onSearch(); }}'
);

fs.writeFileSync(TARGET, s, "utf8");
console.log("✓ Clear now uses flushSync so the table refreshes on first click. Backup:", path.basename(bak));
