// Run from: C:\Users\pedro\Documents\code\ccc-cruise\web
// node tools/fix-promos-status-pill-and-actions.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join("src", "app", "admin", "promos"); // cwd is /web
const EXT_OK = new Set([".ts", ".tsx"]);
let changed = 0;
const touched = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (EXT_OK.has(path.extname(p))) processFile(p);
  }
}

// Only edit files that likely render the status chip or actions
const CANDIDATE_NAMES = [
  "chips", "statuschip", "status-chip",
  "listtable", "actions", "row", "menu", "toolbar"
];

function processFile(file) {
  const lower = path.basename(file).toLowerCase();
  if (!CANDIDATE_NAMES.some(n => lower.includes(n))) return;

  const orig = fs.readFileSync(file, "utf8");
  let next = orig;

  // --- Status pill: never display "disabled"; show "Archived"
  // (targets labels/text only; we already migrated logic elsewhere)
  next = next.replace(/>disabled</g, ">Archived<");
  next = next.replace(/"disabled"/g, "\"archived\""); // e.g., label maps
  next = next.replace(/'disabled'/g, "'archived'");   // e.g., case 'disabled'

  // If some chip prints lowercase status directly, map at render-time words
  next = next.replace(/>Disabled</g, ">Archived<");

  // --- Action verbs: prefer Activate / Archive (replace Unarchive)
  next = next.replace(/>Unarchive</g, ">Activate<");
  next = next.replace(/"Unarchive"/g, "\"Activate\"");
  next = next.replace(/'Unarchive'/g, "'Activate'");

  // Keep Archive as-is (we set earlier)

  if (next === orig) return;
  const bak = file + ".bak-pill-actions";
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, orig, "utf8");
  fs.writeFileSync(file, next, "utf8");
  changed++; touched.push(file);
}

if (!fs.existsSync(ROOT)) {
  console.error(`Not found: ${ROOT}`);
  process.exit(1);
}

walk(ROOT);

if (changed === 0) {
  console.log("No changes were needed in likely pill/action files.");
} else {
  console.log(`Updated ${changed} file(s):`);
  for (const f of touched) console.log(" - " + f);
  console.log("Backups written with .bak-pill-actions suffix.");
}
