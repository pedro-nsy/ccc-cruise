import type { PromoStatus, PromoType } from '@/lib/types/promo';
export type PromoType = 'early_bird' | 'artist' | 'staff';

/**
 * Canonical promo status vocabulary.
 * Admin may manually toggle Active <-> Archived.
 * 'reserved' and 'consumed' are system-driven via booking/payment flows.
 */
export type PromoStatus = 'active' | 'reserved' | 'consumed' | 'archived';

