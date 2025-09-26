const fs = require("fs"), path = require("path");
const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-table";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);
let s = fs.readFileSync(FILE, "utf8");

// Add filtersNode prop to function signature
s = s.replace(
  /export default function ListTable\(\{\s*([^}]*)\}\s*:\s*\{\s*([^}]*)\}\s*\)\s*\{/m,
  (m, params, types) => {
    const p = params.trim();
    const t = types.trim();
    const hasParam = /(^|,\s*)filtersNode\s*:/.test(m) || /(^|,\s*)filtersNode\s*(,|\})/.test(p);
    const newParams = hasParam ? p : (p.replace(/\s+$/,"") + (p ? ", " : "") + "filtersNode");
    const newTypes  = t.includes("filtersNode") ? t : (t.replace(/\s+$/,"") + (t ? ", " : "") + "filtersNode?: React.ReactNode");
    return `export default function ListTable({ ${newParams} }: { ${newTypes} }) {`;
  }
);

// Render filtersNode above the header grid inside the main section
s = s.replace(
  /return\s*\(\s*<section([\s\S]*?)>\s*\/\*\s*Header:/m,
  (m, before) => {
    return `return (\n    <section${before}>\n      {filtersNode ? <div className="mb-4">{filtersNode}</div> : null}\n      {/* Header:`;
  }
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched ListTable to accept filtersNode. Backup:", BAK);
