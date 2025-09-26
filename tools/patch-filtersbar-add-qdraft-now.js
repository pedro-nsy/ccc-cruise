const fs = require("fs"), path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-qDraft-insert";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Only insert once
if (!/const\s*\[\s*qDraft\s*,\s*setQDraft\s*\]/.test(s)) {
  // Insert right after function opening brace
  s = s.replace(
    /(export default function FiltersBar\([^)]*\)\s*\{\s*)/,
    `$1
  // local draft for the search box; apply on Search or Enter
  const [qDraft, setQDraft] = useState(q);
  useEffect(() => { setQDraft(q); }, [q]);
`
  );
}

// (Optional tidy) If Clear already calls setQDraft twice, reduce to one
s = s.replace(/setQDraft\(""\);\s*setQDraft\(""\);/g, 'setQDraft("");');

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ FiltersBar: added qDraft state + sync. Backup:", BAK);
