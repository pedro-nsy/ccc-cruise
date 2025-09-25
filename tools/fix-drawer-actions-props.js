const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}

let s = fs.readFileSync(FILE, "utf8");
const bak = FILE + ".bak-drawer-actions";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

// If the DetailsDrawer usage already has onToggleStatus, do nothing.
if (s.includes("<DetailsDrawer") && s.includes("onToggleStatus=")) {
  console.log("• onToggleStatus already present on <DetailsDrawer />; no changes");
} else {
  // Inject props into EVERY DetailsDrawer opening tag (self-closing or not).
  const re = /<DetailsDrawer\b[^>]*?(\/>|>)/g;
  let m, out = "", last = 0, changes = 0;
  while ((m = re.exec(s)) !== null) {
    const start = m.index;
    const end = re.lastIndex;
    let tag = s.slice(start, end);

    // Skip if already has the prop (safety)
    if (/onToggleStatus\s*=/.test(tag)) {
      out += s.slice(last, end);
      last = end;
      continue;
    }

    // Insert props just before the closing of the opening tag.
    tag = tag.replace(/\/?>$/, (close) =>
      ` onToggleStatus={onToggleStatus} onCopyCode={(c)=>navigator.clipboard.writeText(c)}${close}`
    );

    out += s.slice(last, start) + tag;
    last = end;
    changes++;
  }
  out += s.slice(last);

  if (changes > 0) {
    fs.writeFileSync(FILE, out, "utf8");
    console.log(`✓ Patched ${FILE}. Injected props on ${changes} <DetailsDrawer> tag(s). Backup: ${bak}`);
  } else {
    console.log("! No <DetailsDrawer> opening tag matched. Please paste the line here if you need a hand.");
  }
}
