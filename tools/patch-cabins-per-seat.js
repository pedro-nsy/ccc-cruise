const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","booking","cabins","options","route.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-per-seat";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) If the function exists, replace its body to charge per *seat*.
if (s.includes("function publicTotalCents")) {
  s = s.replace(
/function publicTotalCents\\(category: CategoryKey, layout: Layout\\) \\{[\\s\\S]*?\\}/m,
`function publicTotalCents(category: CategoryKey, layout: Layout) {
  return (layout.doubles * 2) * pp(category, "DOUBLE")
       + (layout.triples * 3) * pp(category, "TRIPLE")
       + (layout.quads   * 4) * pp(category, "QUADRUPLE");
}`
  );
} else {
  console.error("Did not find publicTotalCents() — aborting to avoid bad write.");
  process.exit(1);
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", BAK);
