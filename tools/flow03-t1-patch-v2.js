const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","travelers","page.tsx");
const BAK  = FILE + ".bak-t1-v2";

if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Ensure useRef is imported
s = s.replace(
  /import\s+\{\s*useEffect,\s*useMemo,\s*useState\s*\}\s+from\s+"react";/,
  'import { useEffect, useMemo, useRef, useState } from "react";'
);

// 2) Insert a top-level cardRefs after wantsPromo state
s = s.replace(
  /(const \[wantsPromo,[^\n]+\}\);[^\n]*\/\/ checkbox per traveler[^\n]*\n)/,
  `$1\n  // Refs to each traveler card for scroll/focus on validation errors\n  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});\n\n`
);

// 3) Remove the accidental in-function cardRefs inside setField (keep the closing brace)
s = s.replace(
  /\n\s*\/\/ Refs to each traveler card[\s\S]*?const cardRefs[^\n]*\n/,
  "\n"
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "\nBackup:", BAK);
