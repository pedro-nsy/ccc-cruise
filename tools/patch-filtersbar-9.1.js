const fs = require("fs"), path = require("path");
const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-filters";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);
let s = fs.readFileSync(FILE, "utf8");

// Add embedded prop to the param list (default false)
s = s.replace(
  /export default function FiltersBar\(\{\s*([^}]*)\}\s*:\s*\{\s*([^}]*)\}\s*\)\s*\{/m,
  (m, params, types) => {
    // Inject embedded into params with default and into types as optional
    const newParams = params.trim().replace(/\s+$/,"").replace(/\}\s*$/,"");
    const withEmbedded = newParams.includes("embedded") ? newParams : (newParams + (newParams.trim().length ? ", " : "") + "embedded = false");
    const newTypes = types.includes("embedded") ? types : (types + ", embedded?: boolean");
    return `export default function FiltersBar({ ${withEmbedded} }: { ${newTypes} }) {`;
  }
);

// Make the outer sticky wrapper conditional
s = s.replace(
  /<div className="sticky top-20 z-10">/m,
  `<div className={embedded ? "" : "sticky top-20 z-10"}>`
);

// Make the outer card wrapper conditional
s = s.replace(
  /<div className="rounded-2xl border bg-white\/80 backdrop-blur p-6 space-y-4">/m,
  `<div className={embedded ? "" : "rounded-2xl border bg-white/80 backdrop-blur p-6 space-y-4"}>`
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched FiltersBar for embedded mode. Backup:", BAK);
