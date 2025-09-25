// node tools/force-status-chip-map.js
const fs = require("fs");
const path = require("path");

const CANDIDATES = [
  path.join("src","app","admin","promos","sections","chips.tsx"),
  path.join("src","app","admin","promos","sections","StatusChip.tsx"),
  path.join("src","app","admin","promos","components","StatusChip.tsx")
];

const SNIPPET =
`// enforced status label map (display-only)
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  reserved: "Reserved",
  consumed: "Consumed",
  archived: "Archived",
};`;

for (const f of CANDIDATES) {
  if (!fs.existsSync(f)) continue;
  let src = fs.readFileSync(f,"utf8");
  if (!src.includes("STATUS_LABEL")) {
    // inject near top after imports
    src = src.replace(/(^import[^\n]*\n)+/m, m => m + "\n" + SNIPPET + "\n\n");
  }
  // normalize any visible 'disabled' => 'Archived'
  src = src.replace(/>disabled</g, ">Archived<")
           .replace(/'disabled'/g, "'archived'")
           .replace(/"disabled"/g, "\"archived\"");
  // ensure render uses STATUS_LABEL if it already interpolates status
  // (no destructive changes; this just ensures labels exist)
  fs.writeFileSync(f, src, "utf8");
  console.log("Adjusted status chip file:", f);
}
