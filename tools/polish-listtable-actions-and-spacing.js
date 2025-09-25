const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-ui-polish-2";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Tighten row/header spacing a bit
s = s
  // header cells
  .replace(/px-3 py-2/g, "px-3 py-1.5")
  // row container padding (only for row lines, not header)
  .replace(/className="grid grid-cols-12 items-center"/g, 'className="grid grid-cols-12 items-center py-1.5"');

// 2) Make consumed a real disabled button (no underline/blue)
s = s.replace(
  /{p\.status === "consumed" \? \([\s\S]*?\)\s*:\s*p\.status === "active"[\s\S]*?}/m,
  `
{p.status === "consumed" ? (
  <button
    type="button"
    className="btn btn-ghost text-sm px-3 py-1.5 opacity-60 cursor-not-allowed no-underline hover:no-underline"
    title="Consumed codes cannot be archived"
    disabled
  >
    Consumed
  </button>
) : p.status === "active" || p.status === "reserved" ? (
  <button
    type="button"
    className="btn btn-ghost text-sm px-3 py-1.5"
    onClick={() => onToggleStatus(p.id, "archived")}
  >
    Archive
  </button>
) : (
  <button
    type="button"
    className="btn btn-primary text-sm px-3 py-1.5"
    onClick={() => onToggleStatus(p.id, "active")}
  >
    Activate
  </button>
)}
`
);

// 3) Ensure Details stays icon-only and centered nicely
s = s.replace(
  /<button\s+type="button"\s+className="btn btn-ghost[^"]*"\s+title="Details"[\s\S]*?<\/button>/m,
  `<button
    type="button"
    className="btn btn-ghost inline-flex items-center justify-center p-2"
    title="Details"
    onClick={() => onOpenDetails(p)}
  >
    <Info className="w-4 h-4" />
  </button>`
);

// 4) Subtle header look (already neutral-50 + border); keep it but ensure text-xs everywhere
if (!/grid grid-cols-12 rounded-xl bg-neutral-50 border/.test(s)) {
  s = s.replace(
    /<div className="grid grid-cols-12[^"]*">/,
    '<div className="grid grid-cols-12 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-600">'
  );
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Polished actions + spacing in ListTable.tsx. Backup:", path.basename(BAK));
