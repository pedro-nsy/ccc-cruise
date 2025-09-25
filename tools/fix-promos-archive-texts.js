/// Run from: C:\Users\pedro\Documents\code\ccc-cruise\web
// node tools/fix-promos-archive-texts.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join("src", "app", "admin", "promos"); // <-- cwd is /web
const exts = new Set([".ts", ".tsx"]);
let changed = 0;
const touched = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (exts.has(path.extname(p))) processFile(p);
  }
}

function processFile(file) {
  const orig = fs.readFileSync(file, "utf8");
  let next = orig;

  // Toasts
  next = next.replace(/Code disabled/g, "Code archived");
  next = next.replace(/Code enabled/g, "Code unarchived");

  // Visible labels (chips, buttons)
  next = next.replace(/>Disabled</g, ">Archived<");
  next = next.replace(/"Disabled"/g, "\"Archived\"");
  next = next.replace(/'Disabled'/g, "'Archived'");

  next = next.replace(/>Disable</g, ">Archive<");
  next = next.replace(/"Disable"/g, "\"Archive\"");
  next = next.replace(/'Disable'/g, "'Archive'");

  next = next.replace(/>Enable</g, ">Unarchive<");
  next = next.replace(/"Enable"/g, "\"Unarchive\"");
  next = next.replace(/'Enable'/g, "'Unarchive'");

  if (next === orig) return;

  const bak = file + ".bak-archive-texts";
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, orig, "utf8");
  fs.writeFileSync(file, next, "utf8");
  touched.push(file);
  changed++;
}

if (!fs.existsSync(ROOT)) {
  console.error(`Not found: ${ROOT}`);
  process.exit(1);
}

walk(ROOT);

if (changed === 0) {
  console.log("No UI text changes were needed in /src/app/admin/promos.");
} else {
  console.log(`Updated ${changed} file(s):`);
  for (const f of touched) console.log(" - " + f);
  console.log("Backups created with suffix .bak-archive-texts next to each file.");
}

