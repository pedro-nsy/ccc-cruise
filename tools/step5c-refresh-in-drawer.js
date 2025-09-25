const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
let s = fs.readFileSync(FILE, "utf8");
const bak = FILE + ".bak-refresh-in-drawer";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

const re = /const\s+toggleStatus\s*=\s*async\s*\(\s*id:\s*string\|number,\s*to:\s*"active"\|"disabled"\s*\)\s*=>\s*\{\s*[\s\S]*?\};/m;

if (!re.test(s)) {
  console.error("Could not find toggleStatus function to patch.");
  process.exit(1);
}

const replacement = `const toggleStatus = async (id: string|number, to: "active"|"disabled") => {
    const res = await model.toggleStatus(id, to);
    if (res.ok) {
      const target = (to === "active" ? "active" : "archived");
      toast.success(target === "active" ? "Code activated" : "Code archived");
      try { await model.fetchList(); } catch {}

      // If the drawer is open for this id, update status + reload usage in place.
      setOpenRow((prev) => {
        if (!prev) return prev;
        if (String(prev.id) !== String(id)) return prev;
        return { ...prev, status: target as any };
      });

      if (openId && String(openId) === String(id)) {
        try {
          setUsageLoading(true);
          const { ok, items } = await model.loadUsage(id);
          setUsage(ok ? items : []);
        } catch { /* noop */ }
        finally { setUsageLoading(false); }
      }
    } else {
      toast.error("Update failed");
    }
  };`;

s = s.replace(re, replacement);
fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched page.tsx to live-refresh drawer after Archive/Activate. Backup:", bak);
