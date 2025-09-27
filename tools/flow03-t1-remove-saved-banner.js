const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","travelers","page.tsx");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
const BAK = FILE + ".bak-no-saved-banner";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Stop setting the success state
s = s.replace(/^\s*setSaved\(\s*["']ok["']\s*\);\s*$/m, "");

// 2) Remove any JSX block that renders the success banner (“Saved.”)
const savedBannerBlock = /\{\s*saved\s*===\s*["']ok["']\s*&&\s*\([\s\S]*?Saved\.[\s\S]*?\)\s*\}\s*/g;
s = s.replace(savedBannerBlock, "");

// 3) Optional tidy: remove now-empty comment lines related to the bottom banner section
s = s.replace(/^\s*\{\s*\/\*+\s*Bottom banners.*?\*\/\s*\}\s*$/m, "");

// Write back
fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE);
console.log("  Backup:", BAK);
