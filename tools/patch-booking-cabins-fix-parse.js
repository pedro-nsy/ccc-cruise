const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","cabins","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-fix-parse";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
let changes = 0;

/**
 * Remove the stray `)}` and the extra `</div>` that immediately follows
 * after the promo chips block in the category card.
 * This fixes the mis-nested JSX that leads to the “Unexpected token” at `)}`.
 */
{
  const before = s;
  // Remove one occurrence of `)}\n</div>` with arbitrary whitespace/newlines between
  s = s.replace(/\)\}\s*\r?\n\s*<\/div>\s*\r?\n\s*/m, "\n");
  if (s !== before) changes++;
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "| backup:", BAK, "| changes:", changes);
