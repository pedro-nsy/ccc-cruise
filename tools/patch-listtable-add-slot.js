const fs = require("fs"), path = require("path");
const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-slot";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);
let s = fs.readFileSync(FILE, "utf8");

// 1) add filtersNode prop to the params + types
s = s.replace(
  /export default function ListTable\(\{\s*([\s\S]*?)\}\s*:\s*\{\s*([\s\S]*?)\}\s*\)\s*\{/m,
  (m, params, types) => {
    const p = params.trim().replace(/\s+$/,"");
    const t = types.trim().replace(/\s+$/,"");
    const newParams = p.includes("filtersNode") ? p : (p + (p ? ", " : "") + "filtersNode");
    const newTypes  = t.includes("filtersNode") ? t : (t + (t ? ", " : "") + "filtersNode?: React.ReactNode");
    return `export default function ListTable({ ${newParams} }: { ${newTypes} }) {`;
  }
);

// 2) render filtersNode inside the section, above the header grid
s = s.replace(
  /return\s*\(\s*<section([^>]*)>\s*\n\s*{\s*\/\*\s*Header:/m,
  (m, attrs) => `return (\n    <section${attrs}>\n      {filtersNode ? <div className="mb-4">{filtersNode}</div> : null}\n      {/* Header:`
);

if (!/filtersNode\s*\?/.test(s)) {
  // fallback: insert before the header grid explicitly
  s = s.replace(
    /return\s*\(\s*<section([^>]*)>\s*\n\s*<div className="grid grid-cols-4/m,
    (m2, attrs2) => `return (\n    <section${attrs2}>\n      {filtersNode ? <div className="mb-4">{filtersNode}</div> : null}\n      `
  );
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ ListTable now accepts and renders filtersNode. Backup:", BAK);
