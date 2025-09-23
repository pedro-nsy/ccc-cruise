export type Role = "PUBLIC" | "EARLY_BIRD" | "ARTIST" | "SBS_STAFF" | "CCC_STAFF";
export type Category = "INTERIOR" | "OCEAN" | "BALCONY";

export const CURRENCY = process.env.CURRENCY || "MXN";

// Key rule dates (fixed by brief)
export const EB_CUTOFF = new Date("2025-10-15");        // EB ends Oct 15, 2025
export const ARTISTS_BALANCE_DUE = new Date("2025-12-15");
export const EB_BALANCE_DUE = new Date("2025-12-15");
export const PUBLIC_BALANCE_DUE = new Date("2026-01-10");

// Public price discount per role
export function priceForRole(publicPrice: number, role: Role, bookingCreatedAt: Date) {
  switch (role) {
    case "ARTIST":   return Math.round(publicPrice * 0.50); // 50% off
    case "EARLY_BIRD":
      return (bookingCreatedAt <= EB_CUTOFF)
        ? Math.round(publicPrice * 0.85)                    // 15% off
        : publicPrice;
    default:         return publicPrice;
  }
}

export function scheduleFor(
  role: Role,
  finalPrice: number,
  bookingCreatedAt: Date
) {
  const rows: { label: "DEPOSIT" | "SCHEDULED" | "BALANCE"; dueDate: string; amount: number }[] = [];
  const iso = (d: Date) => d.toISOString().slice(0,10);

  if (role === "ARTIST") {
    const dep = Math.round(finalPrice * 0.5);
    rows.push({ label: "DEPOSIT", dueDate: iso(bookingCreatedAt), amount: dep });
    rows.push({ label: "BALANCE", dueDate: iso(ARTISTS_BALANCE_DUE), amount: finalPrice - dep });
    return rows;
  }

  if (role === "EARLY_BIRD") {
    const dep = 3000;
    rows.push({ label: "DEPOSIT", dueDate: iso(bookingCreatedAt), amount: Math.min(dep, finalPrice) });
    // top-up to 50% by EB cutoff (if still EB)
    const half = Math.round(finalPrice * 0.5);
    const sched = Math.max(0, half - dep);
    if (sched > 0 && bookingCreatedAt <= EB_CUTOFF) {
      rows.push({ label: "SCHEDULED", dueDate: iso(EB_CUTOFF), amount: sched });
    }
    const paidSoFar = rows.reduce((s,r)=>s+r.amount,0);
    rows.push({ label: "BALANCE", dueDate: iso(EB_BALANCE_DUE), amount: finalPrice - paidSoFar });
    return rows;
  }

  // PUBLIC
  const dep = 3000;
  rows.push({ label: "DEPOSIT", dueDate: iso(bookingCreatedAt), amount: Math.min(dep, finalPrice) });
  // +13,000 within 30 days
  const due30 = new Date(bookingCreatedAt); due30.setDate(due30.getDate()+30);
  const addl = Math.max(0, Math.min(13000, finalPrice - dep));
  if (addl > 0) rows.push({ label: "SCHEDULED", dueDate: iso(due30), amount: addl });
  const paidSoFar = rows.reduce((s,r)=>s+r.amount,0);
  rows.push({ label: "BALANCE", dueDate: iso(PUBLIC_BALANCE_DUE), amount: finalPrice - paidSoFar });
  return rows;
}
