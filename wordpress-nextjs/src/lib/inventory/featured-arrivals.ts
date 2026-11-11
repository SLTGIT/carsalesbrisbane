import type { DealerVehicle } from "@/types/inventory";
import { isBike } from "@/lib/dealer-solutions/fetch-inventory";
import { priceNum } from "./query";

const DEFAULT_LIMIT = 4;

/**
 * Pick vehicles for the home “featured arrivals” row: priced stock, photo preferred,
 * then newest year, then higher price.
 */
export function pickFeaturedArrivalVehicles(
  vehicles: DealerVehicle[],
  limit = DEFAULT_LIMIT
): DealerVehicle[] {
  return [...vehicles]
    .filter((v) => priceNum(v) > 0 && !isBike(v))
    .sort((a, b) => {
      const ap = a.Photos?.[0]?.PhotoUrl?.trim() ? 1 : 0;
      const bp = b.Photos?.[0]?.PhotoUrl?.trim() ? 1 : 0;
      if (bp !== ap) return bp - ap;
      if (b.ManufactureYear !== a.ManufactureYear)
        return b.ManufactureYear - a.ManufactureYear;
      return priceNum(b) - priceNum(a);
    })
    .slice(0, limit);
}

/** Rough indicative weekly payment (matches common dealer-site rounding). */
export function estimatedWeeklyFinance(priceAud: number): number {
  if (!Number.isFinite(priceAud) || priceAud <= 0) return 0;
  return Math.max(25, Math.round(priceAud / 221));
}
