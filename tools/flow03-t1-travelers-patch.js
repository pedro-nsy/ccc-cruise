const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","travelers","page.tsx");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
const BAK = FILE + ".bak-t1";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Ensure useRef is imported
s = s.replace(
  /import\s+\{\s*useEffect\s*,\s*useMemo\s*,\s*useState\s*\}\s*from\s*"react";/,
  'import { useEffect, useMemo, useRef, useState } from "react";'
);

// 2) Add cardRefs after wantsPromo state (component scope)
s = s.replace(
  /(const \[wantsPromo,[^\n]+\]\s*=\s*useState<[^\n]+>\(\{\}\);\s*)/,
  `$1\n  // Refs: map traveler idx -> card element for scroll/focus on errors\n  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});\n`
);

// 3) Add ref prop to each traveler card div
s = s.replace(
  /<div key=\{t\.idx\} className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">/,
  `<div key={t.idx} ref={(node) => { cardRefs.current[t.idx] = node; }} className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">`
);

// 4) In save(), add promo gating + scroll/focus to first offender
s = s.replace(
  /const v = validate\(\);\s*setErrors\(v\);\s*if \(Object\.keys\(v\)\.length\) \{ setSaved\("fail"\); return; \}/,
  `const v = validate();
    setErrors(v);

    // Promo gating per traveler: if "Apply a promo code" is checked…
    for (const t of travelers) {
      const idx = t.idx;
      if (wantsPromo[idx]) {
        const typed = (promoInputs[idx] || "").trim();
        // empty input → block submit
        if (!typed) {
          v[idx] = v[idx] || "Enter a promo code (or uncheck the box).";
        } else {
          const typedUpper = typed.toUpperCase();
          // typed but not validated to attach onto traveler → block submit
          if (!t.promo || t.promo.code !== typedUpper) {
            v[idx] = v[idx] || "Validate this code before continuing.";
          }
        }
      }
    }
    setErrors(v);

    if (Object.keys(v).length) {
      setSaved("fail");
      // Scroll to first offender & focus first input/select in that card
      const keys = Object.keys(v).map(Number).filter(n => !Number.isNaN(n));
      if (keys.length) {
        const firstIdx = Math.min(...keys);
        const el = cardRefs.current[firstIdx];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            const input = el.querySelector("input, select");
            if (input && input instanceof HTMLElement) input.focus();
          }, 250);
        }
      }
      return;
    }`
);

// 5) Duplicate the top status banners near the bottom (before buttons)
s = s.replace(
  /\n\s*<\/div>\s*\n\s*<div className="flex items-center justify-between">/,
  `
      </div>

      {/* Bottom banners (duplicate of top status) */}
      {saved === "ok" && (
        <div className="rounded-xl border bg-neutral-50 p-4 text-sm mt-2">Saved.</div>
      )}
      {saved === "fail" && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 mt-2">
          Please fix the fields highlighted above and try again.
        </div>
      )}

      <div className="flex items-center justify-between">`
);

// 6) Keep button label constant; only disable during save
s = s.replace(
  /\{saving \? "Saving…"\s*:\s*"Continue"\}/,
  "Continue"
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "\\nBackup:", BAK);
