const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","travelers","page.tsx");
const BAK  = FILE + ".bak-t1-nav";

if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Make sure useRef is imported (defensive)
s = s.replace(
  /import\s*{\s*useEffect,\s*useMemo,\s*useState\s*}\s*from\s*"react";/,
  'import { useEffect, useMemo, useRef, useState } from "react";'
);

// 2) Ensure cardRefs exists (defensive): insert after wantsPromo state if missing
if (!/const\s+cardRefs\s*=\s*useRef/.test(s)) {
  s = s.replace(
    /const\s*\[\s*wantsPromo[\s\S]*?\};\s*\n/,
    (m) => m + `  // Refs: map traveler idx -> card element for scroll/focus on errors
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
`
  );
}

// 3) After a successful save, navigate to /booking/cabins
// Insert navigation right after: setSaved("ok");
s = s.replace(
  /setSaved\("ok"\);\s*\n(?!\s*\/\/ Navigate to Cabins)/,
  `setSaved("ok");
// Navigate to Cabins on successful save
try {
  const { startTransition } = await import("react");
  startTransition(() => router.push("/booking/cabins"));
  // Fallback in case transition is ignored
  setTimeout(() => {
    if (typeof window !== "undefined" && window.location.pathname.includes("/booking/travelers")) {
      window.location.assign("/booking/cabins");
    }
  }, 200);
} catch {}
`
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", BAK);
