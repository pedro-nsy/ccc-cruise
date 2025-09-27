const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","booking","cabins","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-step5-fixjsx";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
let changes = 0;

/**
 * 1) Fix mis-nested JSX in the Promo chips block inside the Category card.
 *    We target from the comment marker to the end of the top-row flex container.
 */
{
  const promoBlockRx =
    /\{\/\* Promo chips \(right\) — only show chips for promo types present \*\/\}[\s\S]*?<\/div>\s*\n\s*<\/div>/;

  if (promoBlockRx.test(s)) {
    s = s.replace(promoBlockRx, `
                  {/* Promo chips (right) — only show chips for promo types present */}
                  {(cat.hasArtist || cat.hasEb) && (
                    <div className="flex items-center gap-2">
                      {cat.hasArtist && (
                        <span className="inline-flex items-center rounded-xl px-2.5 py-1 border text-xs bg-green-50 text-green-700 border-green-200">
                          Artist: {cat.artistRemaining} left
                        </span>
                      )}
                      {cat.hasEb && (
                        <span className="inline-flex items-center rounded-xl px-2.5 py-1 border text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Early Bird: {cat.ebRemaining} left
                        </span>
                      )}
                    </div>
                  )}
                </div>`);
    changes++;
  } else {
    console.log("Note: Promo chips block pattern not found — leaving as-is.");
  }
}

/**
 * 2) Close the layouts wrapper div before the ternary ends.
 *    After the grid </div>, ensure there is an extra </div> to close the wrapper,
 *    right before the closing `)}` of the ternary branch.
 */
{
  const wrapperOpenIdx = s.indexOf('<div className="rounded-2xl border p-4 sm:p-5">');
  if (wrapperOpenIdx !== -1) {
    // From the wrapper open, look for the specific tail "</div>\n        )}" and insert one extra </div>
    const tailRx = /<\/div>\s*\r?\n\s*\)\}/;
    const segment = s.slice(wrapperOpenIdx);
    if (tailRx.test(segment)) {
      const fixed = segment.replace(tailRx, '</div>\n          </div>\n        )}');
      s = s.slice(0, wrapperOpenIdx) + fixed;
      changes++;
    } else {
      console.log("Note: Wrapper closing pattern not found — leaving as-is.");
    }
  } else {
    console.log("Note: Layouts wrapper not found — leaving as-is.");
  }
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "| backup:", BAK, "| changes:", changes);
