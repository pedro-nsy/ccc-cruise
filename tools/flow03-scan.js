const fs = require("fs");
const path = require("path");

function read(p){ return fs.existsSync(p) ? fs.readFileSync(p,"utf8") : ""; }
function listFiles(dir, acc=[]) {
  if (!fs.existsSync(dir)) return acc;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir,f);
    const st = fs.statSync(p);
    if (st.isDirectory()) listFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

console.log("FLOW-03 Scanner\n");

const page = path.join("src","app","booking","travelers","page.tsx");
if (!fs.existsSync(page)) { console.log("! Missing:", page); process.exit(0); }

const s = read(page);
console.log("• Travelers page:", page, "\n");

const files = ["src/app/booking/travelers/page.tsx"];
console.log("• Local files touched:"); for(const f of files) console.log("  -", f); console.log();

const apis = [];
if (s.includes('"/api/booking/has-ref"')) apis.push(['/api/booking/has-ref', 'guard']);
if (s.includes('"/api/booking/countries"')) apis.push(['/api/booking/countries','countries list']);
if (s.includes('"/api/booking/travelers"')) apis.push(['/api/booking/travelers','GET list / POST persist']);
if (s.includes('"/api/promo/apply"')) apis.push(['/api/promo/apply','apply promo to traveler']);
if (s.includes('"/api/promo/remove"')) apis.push(['/api/promo/remove','remove promo from traveler']);

console.log("• API endpoints found:");
for (const [p,why] of apis) console.log("  -", p, "(",why,")");
console.log();

function find(line) {
  const out=[]; s.split(/\r?\n/).forEach((ln,i)=>{ if(ln.includes(line)) out.push([i+1, ln.trim()]); });
  return out;
}

const navs = [...find('router.push("/booking/cabins")'), ...find('window.location.assign("/booking/cabins")')];
console.log("• Navigation to /booking/cabins:");
if (navs.length===0) console.log("  (none found)"); else navs.forEach(([i,ln])=>console.log(`  - line ${i}  ${ln}`));
console.log();

const rules = [];
if (/Adults must be 18\+/.test(s) || s.includes("Adults must be 18+ by")) rules.push("Adult ≥18 copy present");
if (s.includes("ageOn(")) rules.push("Age calculation present");
if (s.includes("Must be 0–17")) rules.push("Minor 0–17 copy present");
console.log("• Validation hints:");
rules.forEach(r=>console.log("  -", r));
find("const SAIL_START").forEach(([i,ln])=>console.log("  -", ln));
find("const SAIL_END").forEach(([i,ln])=>console.log("  -", ln));
console.log();

console.log("✓ Scan complete. If navigation wasn't found, apply the tiny nav patch next.");
