export type HoldInfo = {
  createdAt?: string;
  expiresAt?: string;
  businessDays?: number; // 2 for 48h business-day holds
  hours?: number;        // 48
};

export function readDraft(): any {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("ccc-draft") || "{}"); }
  catch { return {}; }
}

export function getHold(): HoldInfo | null {
  const d = readDraft();
  const hold = d?.hold;
  if (!hold?.expiresAt) return null;
  return hold as HoldInfo;
}

export function isHoldExpired(): boolean {
  const h = getHold();
  if (!h?.expiresAt) return false;
  try { return Date.now() > new Date(h.expiresAt).getTime(); }
  catch { return false; }
}

export function holdDeadlineLabel(): string {
  const h = getHold();
  if (!h?.expiresAt) return "";
  try {
    const dt = new Date(h.expiresAt);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return dt.toLocaleString(undefined, opts);
  } catch { return h.expiresAt; }
}
