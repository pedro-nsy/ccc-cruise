export function newRef(prefix = "CCC") {
  const s = [...crypto.getRandomValues(new Uint8Array(6))]
    .map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 36])
    .join("");
  return `${prefix}-${s}`;
}
