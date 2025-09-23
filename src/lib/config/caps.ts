export type Category = "INTERIOR" | "OCEAN" | "BALCONY";

/** ---------- CAP LIMITS (from Pedro) ---------- **/
export const EB_CAPS: Record<Category, number> = {
  INTERIOR: 62,
  OCEAN: 22,
  BALCONY: 62,
};

export const ARTIST_CAPS: Record<Category, number> = {
  INTERIOR: 50,
  OCEAN: 20,
  BALCONY: 50,
};

/** 
 * Placeholder global usage counters until Supabase is wired.
 * IMPORTANT: These should be read from server later.
 * For now we assume 0 used (everything available).
 */
let ebUsed: Record<Category, number> = { INTERIOR: 0, OCEAN: 0, BALCONY: 0 };
let artistUsed: Record<Category, number> = { INTERIOR: 0, OCEAN: 0, BALCONY: 0 };

/** Read remaining headcount for EB/Artist */
export function getEbRemaining(cat: Category): number {
  const cap = EB_CAPS[cat] ?? 0;
  const used = ebUsed[cat] ?? 0;
  return Math.max(cap - used, 0);
}

export function getArtistRemaining(cat: Category): number {
  const cap = ARTIST_CAPS[cat] ?? 0;
  const used = artistUsed[cat] ?? 0;
  return Math.max(cap - used, 0);
}

/** 
 * Local-only setters so we can simulate claims during a hold.
 * In Supabase phase, these will be replaced by an API call that atomically claims headcount.
 */
export function simulateClaimEb(cat: Category, count: number) {
  ebUsed[cat] = Math.max(0, (ebUsed[cat] ?? 0) + count);
}
export function simulateClaimArtist(cat: Category, count: number) {
  artistUsed[cat] = Math.max(0, (artistUsed[cat] ?? 0) + count);
}

/** Reset (for dev) */
export function __resetCapsForDev() {
  ebUsed = { INTERIOR: 0, OCEAN: 0, BALCONY: 0 };
  artistUsed = { INTERIOR: 0, OCEAN: 0, BALCONY: 0 };
}

/** Claim EB/Artist headcount for a category. Returns granted counts (<= requested). */
export function claimPerPersonCaps(cat: Category, request: { eb: number; artist: number }) {
  const ebRem = getEbRemaining(cat);
  const arRem = getArtistRemaining(cat);
  const ebGrant = Math.max(0, Math.min(request.eb || 0, ebRem));
  const arGrant = Math.max(0, Math.min(request.artist || 0, arRem));
  // consume locals (server will replace later)
  simulateClaimEb(cat, ebGrant);
  simulateClaimArtist(cat, arGrant);
  return { eb: ebGrant, artist: arGrant };
}
