const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","format.ts");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}

let s = fs.readFileSync(FILE, "utf8");
let changed = 0;

// 1) Replace the literal backslash-n before fmtDateTime with a real newline.
if (s.includes("\\nexport function fmtDateTime")) {
  s = s.replace(/\\nexport function fmtDateTime/g, "\nexport function fmtDateTime");
  changed++;
}

// 2) As a safety net, if anyone has other accidental literal "\nexport function ..." lines, fix those too.
if (s.includes("\\nexport function ")) {
  s = s.replace(/\\nexport function /g, "\nexport function ");
  changed++;
}

// 3) Ensure the file ends with a newline (nice to have).
if (!s.endsWith("\n")) s += "\n";

fs.writeFileSync(FILE, s, "utf8");
console.log(`✓ Patched ${FILE}. Changes applied: ${changed}`);
