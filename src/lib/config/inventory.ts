export type Category = "INTERIOR" | "OCEAN" | "BALCONY";

export type Inventory = {
  total: number;
  doubleOnly: number;
  flex: number; // can be 2/3/4
};

export const CATEGORY_INVENTORY: Record<Category, Inventory> = {
  BALCONY:  { total: 145, doubleOnly: 95, flex: 50 },
  OCEAN:    { total:  50, doubleOnly: 40, flex: 10 },
  INTERIOR: { total: 145, doubleOnly: 95, flex: 50 },
};

/**
 * Placeholder "used" counters — to be replaced by Supabase later.
 * For now we assume 0 used (full availability) so the logic is visible and testable.
 */
let usedTotals: Record<Category, { total: number; doubles: number; flexUsed: number }> = {
  BALCONY:  { total: 0, doubles: 0, flexUsed: 0 },
  OCEAN:    { total: 0, doubles: 0, flexUsed: 0 },
  INTERIOR: { total: 0, doubles: 0, flexUsed: 0 },
};

export function getRemaining(cat: Category) {
  const base = CATEGORY_INVENTORY[cat];
  const used = usedTotals[cat] ?? { total: 0, doubles: 0, flexUsed: 0 };
  const remTotal = Math.max(base.total - used.total, 0);
  const remDoubleOnly = Math.max(base.doubleOnly - used.doubles, 0);
  const remFlex = Math.max(base.flex - used.flexUsed, 0);
  return { total: remTotal, doubleOnly: remDoubleOnly, flex: remFlex };
}

/**
 * Check if a layout fits in remaining inventory.
 * needs: number of 2/3/4-berth cabins required by the layout
 */
export function canSatisfyLayout(cat: Category, needs: { d2: number; d3: number; d4: number }) {
  const rem = getRemaining(cat);
  const totalNeeded = needs.d2 + needs.d3 + needs.d4;
  if (totalNeeded > rem.total) {
    return { ok: false, reason: "Category sold out for your layout size" };
  }

  // Triples/quads must come from flex pool
  const triplesPlusQuads = needs.d3 + needs.d4;
  if (triplesPlusQuads > rem.flex) {
    return { ok: false, reason: "No flex cabins left for triples/quads" };
  }

  // Doubles can be satisfied by double-only first, then flex remainder
  const doublesFromDoubleOnly = Math.min(needs.d2, rem.doubleOnly);
  const doublesStillNeeded = needs.d2 - doublesFromDoubleOnly;
  const flexLeftAfterTQ = rem.flex - triplesPlusQuads; // flex capacity remaining after allocating 3/4
  if (doublesStillNeeded > Math.max(flexLeftAfterTQ, 0)) {
    return { ok: false, reason: "Not enough double cabins left" };
  }

  return { ok: true as const, reason: "" };
}

// Dev utilities (simulate state until DB)
export function __devSetUsed(cat: Category, value: { total?: number; doubles?: number; flexUsed?: number }) {
  usedTotals[cat] = { ...usedTotals[cat], ...value };
}
export function __devResetUsed() {
  usedTotals = {
    BALCONY:  { total: 0, doubles: 0, flexUsed: 0 },
    OCEAN:    { total: 0, doubles: 0, flexUsed: 0 },
    INTERIOR: { total: 0, doubles: 0, flexUsed: 0 },
  };
}
