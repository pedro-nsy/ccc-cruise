const fs = require("fs"), path = require("path");
const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-wire";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);
let s = fs.readFileSync(FILE, "utf8");

// Ensure FiltersBar import exists (it should already via relative path in sections)
if (!/FiltersBar/.test(s)) {
  s = s.replace(
    /import\s+Header[\s\S]*?from\s+"\.\/sections\/Header";/,
    (m)=> m + `\nimport FiltersBar from "./sections/FiltersBar";`
  );
}

// Remove any standalone <FiltersBar ... /> render (if still present)
s = s.replace(/\n\s*<FiltersBar[\s\S]*?\/>\s*\n/g, "\n");

// Inject filtersNode prop into the first <ListTable ...> occurrence
s = s.replace(
  /<ListTable(\s|\n)/m,
  `<ListTable\n        filtersNode={<FiltersBar embedded
          q={model.filters.q}
          type={model.filters.type}
          status={model.filters.status}
          used={model.filters.used}
          setQ={(v)=>model.setFilters({ q: v })}
          setType={(v)=>model.setFilters({ type: v as any })}
          setStatus={(v)=>model.setFilters({ status: v as any })}
          setUsed={(v)=>model.setFilters({ used: v as any })}
          onSearch={onSearch}
        />}\n        `
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Page now passes FiltersBar as filtersNode to ListTable. Backup:", BAK);
