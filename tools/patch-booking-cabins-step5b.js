const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","cabins","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-step5b";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
let changes = 0;

// 1) Helper line (remove "Select a layout." and use exact copy)
{
  const before = s;
  s = s.replace(/Select a layout\.\s*/,"");
  s = s.replace(/to a cabin next\./,"to a cabin on the next step.");
  if (s !== before) changes++;
}

// 2) Secondary line in each card
{
  const before = s;
  s = s.replace(/you can adjust assignments on the next step\./g, "assign travelers to a cabin on the next step.");
  if (s !== before) changes++;
}

// 3) Remove the right-side Estimated total block
{
  const before = s;
  s = s.replace(
    /[ \t]*<div className="text-right">\s*<div className="text-sm text-neutral-600">Estimated total<\/div>\s*<div className="text-xl font-semibold">\{L\.totalLabel\}<\/div>\s*<\/div>\s*/g,
    ""
  );
  if (s !== before) changes++;
}

// 4) Wrap ONLY the layouts grid (the one that maps selectedCategory.layouts) in a box
//    Open wrapper before the specific grid:
{
  // Find the grid that contains selectedCategory.layouts.map(...)
  let idx = -1, from = 0, wrapped = false;
  while (true) {
    idx = s.indexOf('className="grid grid-cols-1 gap-4"', from);
    if (idx === -1) break;
    const lookahead = s.indexOf("selectedCategory.layouts.map", idx);
    if (lookahead !== -1 && lookahead - idx < 4000) {
      // Insert wrapper before this grid
      s = s.slice(0, idx - 5) + // back up to the '<' of <div ...
          '<div className="rounded-2xl border p-4 sm:p-5">\n            ' +
          s.slice(idx - 5);
      wrapped = true;
      break;
    }
    from = idx + 1;
  }
  // Close wrapper right after the grid closes, before ')}'
  if (wrapped) {
    s = s.replace(/<\/div>\s*\r?\n\s*\)\}/, '</div>\n          </div>\n        )}');
    changes++;
  } else {
    console.log("Note: layouts grid not found for wrapping — left as-is.");
  }
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "| backup:", BAK, "| changes:", changes);
