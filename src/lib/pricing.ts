import { supabaseServer } from "@/lib/supabase-server";

export type Category = "INTERIOR" | "OCEANVIEW" | "BALCONY";
export type Occupancy = 2|3|4;

export type PriceRow = { category: Category; occupancy: "DOUBLE"|"TRIPLE"|"QUADRUPLE"; price_cents: number };

export async function fetchCurrentPrices() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("current_public_prices")
    .select("category,occupancy,price_cents");
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const r of (data || []) as PriceRow[]) {
    map.set(`${r.category}::${r.occupancy}`, r.price_cents);
  }
  return (cat: Category, occ: Occupancy) => {
    const key = `${cat}::${occ===2?"DOUBLE":occ===3?"TRIPLE":"QUADRUPLE"}`;
    const v = map.get(key);
    if (v == null) throw new Error("Missing price for " + key);
    return v;
  };
}

export function computeBestPlacementTotalCents(opts: {
  category: Category;
  occupancies: Occupancy[];
  basePrice: (cat: Category, occ: Occupancy) => number;
  promoCounts: { staff: number; artist: number; eb: number; none: number };
}) {
  const { category, occupancies, basePrice, promoCounts } = opts;

  // Build seat base prices for this layout/category
  const seats = occupancies.map(o => basePrice(category, o)).sort((a,b)=>b-a); // desc, most expensive first

  // Pre-calc interior deltas per occupancy for staff rule
  const interiorDeltas = new Map<Occupancy, number>([
    [2, Math.max(0, basePrice(category, 2) - basePrice("INTERIOR", 2))],
    [3, Math.max(0, basePrice(category, 3) - basePrice("INTERIOR", 3))],
    [4, Math.max(0, basePrice(category, 4) - basePrice("INTERIOR", 4))],
  ]);

  // Greedy assignment: apply Staff → Artist → EB → None on most expensive seats.
  let total = 0;
  let sLeft = promoCounts.staff|0,
      aLeft = promoCounts.artist|0,
      eLeft = promoCounts.eb|0;

  for (const seat of seats) {
    if (sLeft > 0) {
      // Staff pays upgrade delta vs interior for THIS seat's occupancy
      // We need which occupancy this seat was. Approximate by mapping price back → try 4,3,2
      let occ: Occupancy = 4;
      if (seat === basePrice(category, 4)) occ = 4;
      else if (seat === basePrice(category, 3)) occ = 3;
      else occ = 2;
      total += interiorDeltas.get(occ) || 0;
      sLeft--;
      continue;
    }
    if (aLeft > 0) { total += Math.round(seat * 0.5); aLeft--; continue; }
    if (eLeft > 0) { total += Math.round(seat * 0.85); eLeft--; continue; }
    total += seat;
  }
  return total;
}
