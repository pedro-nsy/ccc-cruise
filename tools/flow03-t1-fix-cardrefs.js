const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","travelers","page.tsx");
const BAK  = FILE + ".bak-cardrefs-fix";

if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Ensure useRef is imported (idempotent)
s = s.replace(
  /import\s+\{\s*useEffect,\s*useMemo,\s*(?:useRef,\s*)?useState\s*\}\s+from\s+"react";/,
  'import { useEffect, useMemo, useRef, useState } from "react";'
);

// Insert a top-level cardRefs after wantsPromo state (only if not already present)
if (!/const\s+cardRefs\s*=\s*useRef<\s*Record<number,\s*HTMLDivElement\s*\|\s*null>\s*>\(\{\}\);/.test(s)) {
  s = s.replace(
    /(const \[wantsPromo,[^\n]+\}\);\s*\/\/ checkbox per traveler[^\n]*\n)/,
    `$1\n  // Refs to each traveler card for scroll/focus on validation errors\n  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});\n\n`
  );
}

// Remove the accidental inner declaration inside setField (comment + const)
s = s.replace(
  /\n\s*\/\/\s*Refs to each traveler card[\s\S]*?const\s+cardRefs\s*=\s*useRef<[\s\S]*?>\(\{\}\);\s*\n/m,
  "\n"
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "\nBackup:", BAK);
