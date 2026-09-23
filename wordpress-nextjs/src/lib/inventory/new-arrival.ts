import type { DealerVehicle } from "@/types/inventory";

/**
 * Feed `LastUpdated` as epoch ms, or `null` when absent or unreadable. Takes
 * `unknown` because the feed's type for this field is unverified.
 * Australian "28/08/2026" is read explicitly — `Date.parse` would take it as
 * US month/day. Everything else (ISO and friends) goes through `Date.parse`;
 * offset-less values land in server-local time, which is fine for ordering
 * since every vehicle is parsed the same way.
 */
export function parseLastUpdatedMs(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const au = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (au) {
    return Date.UTC(+au[3], +au[2] - 1, +au[1], +(au[4] ?? 0), +(au[5] ?? 0), +(au[6] ?? 0));
  }
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : ms;
}

export function dealerVehicleLastUpdatedMs(v: DealerVehicle): number | null {
  return parseLastUpdatedMs(v.LastUpdated);
}

/**
 * When the vehicle arrived in stock: the feed's ReceiptDate (the day the
 * dealer received it), falling back to LastUpdated only if a vehicle lacks it.
 * LastUpdated moves on every edit, so it badged long-held stock as new.
 */
export function dealerVehicleArrivalMs(v: DealerVehicle): number | null {
  return parseLastUpdatedMs(v.ReceiptDate) ?? parseLastUpdatedMs(v.LastUpdated);
}

/**
 * How recent `LastUpdated` must be for the "New Arrival" badge, in days.
 * Only stock touched within this window is badged, so the badge keeps meaning
 * something — with it off, every vehicle carrying a readable date qualifies.
 * Set to `null` to badge them all.
 *
 * Affects the badge only — the "New Arrivals" sort still ranks every vehicle
 * by `LastUpdated`, latest first, however old.
 */
export const NEW_ARRIVAL_WINDOW_DAYS: number | null = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A vehicle counts as a "New Arrival" when the feed gives it a readable
 * `LastUpdated` date within {@link NEW_ARRIVAL_WINDOW_DAYS} days of now.
 * Kept in one place so the VDP badge and the SRP card badge cannot drift apart.
 */
export function isNewArrival(
  lastUpdated: unknown,
  windowDays: number | null = NEW_ARRIVAL_WINDOW_DAYS,
  now: number = Date.now(),
): boolean {
  const ms = parseLastUpdatedMs(lastUpdated);
  if (ms == null) return false;
  if (windowDays == null) return true;
  return now - ms <= windowDays * DAY_MS;
}
