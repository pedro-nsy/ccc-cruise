const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","sections","StatsStrip.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-use-incap";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Ensure we read in_cap and compute Remaining from it
if (!/inCap/.test(s)) {
  // inject inCap extraction next to created/consumed
  s = s.replace(
    /const consumed: StatObj = \{[\s\S]*?};\s*/,
    `$&\n  const inCap: StatObj = {\n    early_bird: Number(stats?.in_cap?.early_bird) || 0,\n    artist:     Number(stats?.in_cap?.artist)     || 0,\n    staff:      Number(stats?.in_cap?.staff)      || 0,\n  };\n`
  );
}

// replace any previous "remaining" calc to use inCap
s = s.replace(
  /Remaining:\s*\{[^\}]*\}/g,
  match => match // keep label, replace expression after :
    .replace(/Remaining:\s*\{[^}]*\}/, "Remaining: { typeof caps.early_bird === 'number' ? Math.max(0, caps.early_bird - inCap.early_bird) : '—' }")
);

// fix artist block explicitly if needed
if (!/caps\.artist/.test(s) || !/inCap\.artist/.test(s)) {
  s = s.replace(
    /Artist codes:[\s\S]*?<span key="r"[^>]*>.*?<\/span>,?/m,
    `Artist codes:"
          lines={[
            <span key="c">{created.artist} / {caps.artist ?? "—"} created</span>,
            <span key="u">{consumed.artist} / {created.artist} used</span>,
            <span key="r" className="text-xs text-neutral-600">Remaining: { typeof caps.artist === 'number' ? Math.max(0, caps.artist - inCap.artist) : "—" }</span>,
          ]}`
  );
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ StatsStrip now uses in_cap for Remaining. Backup:", path.basename(BAK));
