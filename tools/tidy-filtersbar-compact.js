// node tools/tidy-filtersbar-compact.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
const bak = FILE + ".bak-tidy-compact";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");
const before = s;

// 1) Make inputs/selects text-sm and compact paddings
s = s.replace(
  /className="([^"]*?)px-3 py-2([^"]*?)"/g,
  (m, pre, post) => `className="${pre}px-2.5 py-1.5 text-sm${post}"`
);

// 2) Ensure Search button is compact
s = s.replace(
  /<button([^>]*?)>\s*Search\s*<\/button>/g,
  (m, attrs) => {
    if (/text-sm/.test(attrs)) return m; // already compact
    return `<button${attrs.replace(
      /className="([^"]+)"/,
      (mm, cls) =>
        `className="${cls} text-sm px-3 py-1.5"`
    )}>Search</button>`;
  }
);

// 3) Ensure Clear link/button is compact too
s = s.replace(
  /<a([^>]*?)>\s*Clear\s*<\/a>/g,
  (m, attrs) => {
    if (/text-sm/.test(attrs)) return m;
    return `<a${attrs.replace(
      /className="([^"]+)"/,
      (mm, cls) =>
        `className="${cls} text-sm px-3 py-1.5"`
    )}>Clear</a>`;
  }
);

// 4) Reduce big grid gap (gap-4 → gap-3)
s = s.replace(/gap-4/g, "gap-3");

if (s === before) {
  console.log("No changes made (already compact?)");
  process.exit(0);
}
fs.writeFileSync(FILE, s, "utf8");
console.log("✓ FiltersBar compact tidy applied. Backup:", path.basename(bak));
