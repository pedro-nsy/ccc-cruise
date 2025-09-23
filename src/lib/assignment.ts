export type Assignment = { occupancies: (2|3|4)[]; cabins: Array<{ occupants: number[] }> };
export type Traveler = { isAdult: boolean };

export function isAssignmentValid(
  assignment: Assignment | null | undefined,
  travelers: Traveler[] | null | undefined
) {
  if (!assignment || !travelers || !travelers.length) return false;
  const { occupancies, cabins } = assignment;
  if (!occupancies?.length || !cabins?.length) return false;

  const totalSlots = occupancies.reduce((a,b)=>a+b,0);
  const assigned = cabins.flatMap(c=>c.occupants).filter(ix=>ix>=0);
  if (assigned.length !== travelers.length) return false;
  if (new Set(assigned).size !== assigned.length) return false;

  // adult-per-cabin
  for (const c of cabins) {
    const hasAdult = c.occupants.some(ix => ix >= 0 && travelers[ix]?.isAdult);
    if (!hasAdult) return false;
  }

  // capacity must match group size
  if (travelers.length !== totalSlots) return false;

  return true;
}
