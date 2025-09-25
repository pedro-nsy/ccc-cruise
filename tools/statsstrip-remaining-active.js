const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","StatsStrip.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-remaining-active";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Insert active_open read (tolerant)
if (!/activeOpen/.test(s)) {
  s = s.replace(
    /const caps: CapsObj = \{[\s\S]*?\};\n/,
    `$&
  // Prefer active_open for Remaining (cap - active_open), fallback to consumed
  const activeOpen: StatObj = {
    early_bird: (stats as any)?.active_open?.early_bird ?? 0,
    artist:     (stats as any)?.active_open?.artist     ?? 0,
    staff:      (stats as any)?.active_open?.staff      ?? 0,
  };\n`
  );

  // replace remaining calc to use activeOpen
  s = s.replace(
    /const remaining = \{\s*early_bird:[\s\S]*?};\n/,
    `const remaining = {
    early_bird: typeof caps.early_bird === "number" ? Math.max(0, caps.early_bird - (activeOpen.early_bird ?? consumed.early_bird)) : null,
    artist:     typeof caps.artist     === "number" ? Math.max(0, caps.artist     - (activeOpen.artist     ?? consumed.artist))     : null,
  };\n`
  );
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ StatsStrip now uses active_open for Remaining (fallback to consumed). Backup:", path.basename(BAK));
