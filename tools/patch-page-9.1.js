const fs = require("fs"), path = require("path");
const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-page";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);
let s = fs.readFileSync(FILE, "utf8");

// Remove the standalone <FiltersBar ... /> block (greedy-safe up to the self-closing tag)
s = s.replace(
  /\n\s*<FiltersBar[\s\S]*?\/>\s*\n/m,
  "\n"
);

// Inject filtersNode prop into the <ListTable .../> call
s = s.replace(
  /<ListTable\s*\n\s*/m,
  `<ListTable\n        filtersNode={<FiltersBar embedded\n          q={model.filters.q}\n          type={model.filters.type}\n          status={model.filters.status}\n          used={model.filters.used}\n          setQ={(v)=>model.setFilters({ q: v })}\n          setType={(v)=>model.setFilters({ type: v as any })}\n          setStatus={(v)=>model.setFilters({ status: v as any })}\n          setUsed={(v)=>model.setFilters({ used: v as any })}\n          onSearch={onSearch}\n        />}\n        `
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Embedded FiltersBar into ListTable and removed standalone. Backup:", BAK);
