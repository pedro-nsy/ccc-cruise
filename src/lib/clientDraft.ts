export type Draft = {
  id: string; ref: string;
  lead?: { name: string; email: string; phone: string; lang: "en"|"de" };
  promo?: { count: 0|1|2|3; codes: string[]; flags: { sbs: boolean; artist: boolean; ccc: boolean } };
  group?: { adults: number; minors: number[] }; // minors: ages
  travelers?: Array<{ name: string; dob?: string; nationality?: string; gender?: string; role?: "PUBLIC"|"EARLY_BIRD"|"ARTIST"|"SBS_STAFF"|"CCC_STAFF" }>;
  cabins?: { category: "INTERIOR"|"OCEAN"|"BALCONY"; layout: Array<{ occupancy:number; travelerIdx:number[] }> };
  payChoice?: { amount: "deposit"|"full" };
  addOns?: string[];
  paymentMethod?: "card"|"offline";
};

const KEY = "cccBooking";

export function initDraft(): Draft {
  const existing = readDraft();
  if (existing) return existing;
  const d: Draft = { id: crypto.randomUUID(), ref: "CCC-" + Math.random().toString(36).slice(2,8).toUpperCase() };
  localStorage.setItem(KEY, JSON.stringify(d));
  return d;
}
export function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export function writeDraft(patch: Partial<Draft>) {
  const cur = readDraft() ?? initDraft();
  const next = { ...cur, ...patch,
    lead: patch.lead ?? cur.lead,
    promo: patch.promo ?? cur.promo,
    group: patch.group ?? cur.group,
    travelers: patch.travelers ?? cur.travelers,
    cabins: patch.cabins ?? cur.cabins,
    payChoice: patch.payChoice ?? cur.payChoice,
    addOns: patch.addOns ?? cur.addOns,
    paymentMethod: patch.paymentMethod ?? cur.paymentMethod
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
export function clearDraft() { localStorage.removeItem(KEY); }