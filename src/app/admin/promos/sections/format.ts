export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso as string; }
}
export function yesNo(n: number) { return n > 0 ? "Yes" : "No"; }
export function prettyPhone(s?: string | null) {
  if (!s) return "—";
  const digits = s.replace(/[^\d+]/g, "");
  const m = digits.match(/^(\+?\d{1,3})?(\d{3})?(\d{3,4})?(\d{4})?$/);
  if (!m) return s;
  const cc = m[1] || ""; const a = m[2] || ""; const b = m[3] || ""; const c = m[4] || "";
  if (cc && a && b && c) return `${cc} (${a}) ${b}-${c}`;
  return s!;
}
