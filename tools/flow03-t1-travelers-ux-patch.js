const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","travelers","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-flow03-t1";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Add useRef to React import
s = s.replace(
  /import \{([^}]*?)\} from "next\/navigation";([\s\S]*?)import \{([^}]*?)\} from "react";/,
  (m, a, mid, b) => {
    const cleaned = b.includes("useRef") ? b : (b.trim().length ? b.trim() + ", useRef" : "useRef");
    return `import { ${a} } from "next/navigation";${mid}import { ${cleaned} } from "react";`;
  }
);

// 2) Ensure we have a cardRefs map after promo state
s = s.replace(
  /const \[wantsPromo,[\s\S]*?\}\)\);\s*\n/,
  (m) => m + `\n  // Refs to each traveler card for scroll/focus on validation errors\n  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});\n\n`
);

// 3) Replace validate() with version that gates promos
s = s.replace(
  /function validate\(\)\s*\{[\s\S]*?\n\}\n/,
  `
  function validate(): Record<number, string> {
    const errs: Record<number, string> = {};
    for (const t of travelers) {
      const first = (t.first_name ?? "").trim();
      const last  = (t.last_name  ?? "").trim();
      const nat   = (t.nationality_code ?? "").trim();
      const dob   = (t.dob ?? "").trim();

      if (!first || !last) { errs[t.idx] = "Please enter first and last names (as on passport)."; continue; }
      if (!/^[A-Z]{2}$/.test(nat)) { errs[t.idx] = "Choose a nationality."; continue; }
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dob)) { errs[t.idx] = "Enter a valid date of birth (YYYY-MM-DD)."; continue; }

      if (t.is_adult) {
        const age = ageOn(SAIL_START, dob);
        if (age < 18) { errs[t.idx] = "Adults must be 18+ by Apr 5, 2026."; continue; }
      } else {
        const age = ageOn(SAIL_END, dob);
        if (age < 0 || age > 17) { errs[t.idx] = "Minors must be 0–17 by Apr 12, 2026."; continue; }
      }

      // Promo gating
      const checked = !!wantsPromo[t.idx];
      if (checked) {
        const raw = (promoInputs[t.idx] || "").trim();
        if (!raw) { errs[t.idx] = "Enter a promo code or uncheck the box."; continue; }
        const applied = t.promo?.code?.trim().toUpperCase() || "";
        if (!applied || applied !== raw.toUpperCase()) {
          errs[t.idx] = "Validate this code before continuing.";
          continue;
        }
      }
    }
    return errs;
  }
`
);

// 4) Update save() to scroll/focus first errored traveler
s = s.replace(
  /async function save\([\s\S]*?\)\s*\{\s*e\.preventDefault\(\);\s*const v = validate\(\);\s*setErrors\(v\);\s*if \(Object\.keys\(v\)\.length\) \{[\s\S]*?\}\s*setSaving\(true\);/,
  (m) => {
    return `async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setErrors(v);

    if (Object.keys(v).length) {
      setSaved("fail");
      // Scroll to first offender & focus its first input/select
      const keys = Object.keys(v).map(Number).filter(n => !Number.isNaN(n));
      if (keys.length) {
        const firstIdx = Math.min(...keys);
        const el = cardRefs.current[firstIdx];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            const input = el.querySelector("input, select") as HTMLElement | null;
            input?.focus();
          }, 250);
        }
      }
      return;
    }
    setSaving(true);`;
  }
);

// 5) Add ref prop to each traveler card wrapper
s = s.replace(
  /<div key=\{t\.idx\} className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">/,
  `<div
                key={t.idx}
                ref={(node) => { cardRefs.current[t.idx] = node; }}
                className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">`
);

// 6) Add bottom banners (duplicate) before the bottom buttons row
s = s.replace(
  /\n\s*<div className="flex items-center justify-between">\s*\n\s*<a href="\/booking\/group-size" className="btn btn-ghost">Back<\/a>/,
  `
      {/* Bottom banners (duplicate of top status) */}
      {saved === "ok" && (
        <div className="rounded-xl border bg-neutral-50 p-4 text-sm">Saved.</div>
      )}
      {saved === "fail" && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Please fix the fields highlighted above and try again.
        </div>
      )}

      <div className="flex items-center justify-between">
        <a href="/booking/group-size" className="btn btn-ghost">Back</a>`
);

// 7) Keep the button label constant ("Continue") while disabled during save
s = s.replace(
  /\{saving \? "Saving…"\s*:\s*"Continue"\}/g,
  "Continue"
);

// Also handle any variant that already is just a string (no-op safe)
s = s.replace(
  /<button([^>]+)>\s*Saving…\s*<\/button>/g,
  `<button$1>Continue</button>`
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", BAK);
