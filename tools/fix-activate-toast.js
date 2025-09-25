// Run from: C:\Users\pedro\Documents\code\ccc-cruise\web
// node tools/fix-activate-toast.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join("src", "app", "admin", "promos"); // cwd is /web
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

  // Only change the success toast text
  next = next.replace(/Code unarchived/g, "Code activated");

  if (next === orig) return;
  const bak = file + ".bak-activate-toast";
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
  console.log("No toast texts needed changes in /src/app/admin/promos.");
} else {
  console.log(`Updated ${changed} file(s):`);
  for (const f of touched) console.log(" - " + f);
  console.log("Backups created with .bak-activate-toast next to each file.");
}
