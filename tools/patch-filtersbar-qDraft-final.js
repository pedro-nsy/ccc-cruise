const fs = require("fs"), path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-qDraft-final";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Add qDraft state + sync immediately after the function opens (if missing)
if (!/const\s*\[\s*qDraft\s*,\s*setQDraft\s*\]/.test(s)) {
  s = s.replace(
    /(export default function FiltersBar\([^)]*\)\s*\{\s*)/,
    `$1
  // local draft for the search box; apply on Search/Enter
  const [qDraft, setQDraft] = useState(q);
  useEffect(() => { setQDraft(q); }, [q]);
`
  );
}

// 2) Ensure Clear also resets qDraft (only if Clear handler exists)
s = s.replace(
  /setQ\(""\);\s*setType\(""\);\s*setStatus\(""\);\s*setUsed\(""\);/,
  'setQ(""); setType(""); setStatus(""); setUsed(""); setQDraft("");'
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ FiltersBar: defined qDraft + synced; Clear resets draft. Backup:", BAK);
