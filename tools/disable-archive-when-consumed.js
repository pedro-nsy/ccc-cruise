// Run from: C:\Users\pedro\Documents\code\ccc-cruise\web
// node tools/disable-archive-when-consumed.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}

const src = fs.readFileSync(FILE, "utf8");
let out = src;
let changes = 0;

// 1) <button ...>Archive</button>
out = out.replace(
  /<button([^>]*)>(\s*)Archive(\s*)<\/button>/g,
  (m, attrs, pre, post) => {
    changes++;
    // If already disabled, keep it; otherwise add prop
    const hasDisabled = /\bdisabled=/.test(attrs);
    const newAttrs = hasDisabled
      ? attrs
      : `${attrs} disabled={row.status==='consumed'}`;
    return `<button${newAttrs}>${pre}{row.status==='consumed' ? 'Archived (locked)' : 'Archive'}${post}</button>`;
  }
);

// 2) <a ...>Archive</a> (some UIs use anchors as buttons)
out = out.replace(
  /<a([^>]*)>(\s*)Archive(\s*)<\/a>/g,
  (m, attrs, pre, post) => {
    changes++;
    const hasDisabled = /\bdisabled=/.test(attrs);
    const newAttrs = hasDisabled
      ? attrs
      : `${attrs} disabled={row.status==='consumed'}`;
    return `<a${newAttrs}>${pre}{row.status==='consumed' ? 'Archived (locked)' : 'Archive'}${post}</a>`;
  }
);

// 3) <DropdownMenuItem ...>Archive</DropdownMenuItem> (shadcn style)
out = out.replace(
  /<DropdownMenuItem([^>]*)>(\s*)Archive(\s*)<\/DropdownMenuItem>/g,
  (m, attrs, pre, post) => {
    changes++;
    const hasDisabled = /\bdisabled=/.test(attrs);
    const newAttrs = hasDisabled
      ? attrs
      : `${attrs} disabled={row.status==='consumed'}`;
    return `<DropdownMenuItem${newAttrs}>${pre}{row.status==='consumed' ? 'Archived (locked)' : 'Archive'}${post}</DropdownMenuItem>`;
  }
);

// Write if changed
if (changes === 0) {
  console.log("No 'Archive' JSX patterns were changed.");
  console.log("If your action uses a different component, tell me its tag (e.g. <MenuItem>) and I'll add it.");
  process.exit(0);
}

const bak = FILE + ".bak-consumed-guard";
if (!fs.existsSync(bak)) fs.writeFileSync(bak, src, "utf8");
fs.writeFileSync(FILE, out, "utf8");
console.log(`Updated ${FILE} — disabled Archive when consumed (changes: ${changes}). Backup: ${bak}`);
