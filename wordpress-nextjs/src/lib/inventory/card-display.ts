import type { VehicleListing } from "@/types/inventory";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removePhrase(s: string, phrase: string): string {
  const p = phrase.trim();
  if (!p) return s;
  return s
    .replace(new RegExp(`\\b${escapeRegExp(p)}\\b`, "gi"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeLeadingToken(s: string, token: string): string {
  const t = token.trim();
  if (!t) return s;
  return s.replace(new RegExp(`^${escapeRegExp(t)}\\b\\s*`, "i"), "").trim();
}

/**
 * Strip stock, colour, transmission, body type, and other feed fields from title
 * remainder so only the variant / trim name is left (e.g. "Ascent Sport").
 */
function stripListingFieldsFromTrimRemainder(
  remainder: string,
  listing: VehicleListing,
): string {
  let s = remainder.replace(/\s+/g, " ").trim();
  if (!s) return "";

  if (listing.stock_number) {
    s = removeLeadingToken(s, listing.stock_number);
    s = removePhrase(s, listing.stock_number);
  }

  const phrases = [
    listing.transmission,
    listing.body_type,
    listing.fuel_type,
    listing.drive_type,
    listing.type_code,
    listing.body_colour,
    listing.trim_colour,
    listing.condition,
  ]
    .map((p) => p.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const phrase of phrases) {
    s = removePhrase(s, phrase);
  }

  return s.replace(/\s+/g, " ").trim();
}

/** Primary card line: "Make, Model" (screenshot-style). */
export function vehicleCardHeadline(listing: VehicleListing): string {
  const make = listing.make?.trim();
  const model = listing.model?.trim();
  if (make && model) return `${make}, ${model}`;
  if (make) return make;
  if (model) return model;
  const t = listing.title?.trim();
  return t || "Vehicle";
}

/**
 * Trim / variant text from the listing title with year, make, and model stripped.
 */
export function vehicleCardTrimFromTitle(listing: VehicleListing): string {
  const title = listing.title?.trim() || "";
  const year = listing.year;
  const make = listing.make?.trim() || "";
  const model = listing.model?.trim() || "";

  let s = title;
  const yr = year ? String(year) : "";
  if (yr && s.startsWith(yr)) {
    s = s.slice(yr.length).trim();
    if (s.startsWith("-") || s.startsWith(",")) s = s.slice(1).trim();
  }

  if (make) {
    const next = s.replace(new RegExp(`^${escapeRegExp(make)}\\s+`, "i"), "").trim();
    if (next.length < s.length) s = next;
  }
  if (model) {
    let next = s.replace(new RegExp(`^${escapeRegExp(model)}\\b\\s*`, "i"), "").trim();
    if (next.length < s.length) s = next;
    next = s.replace(new RegExp(`^${escapeRegExp(model)}\\b\\s*`, "i"), "").trim();
    if (next.length < s.length) s = next;
  }

  return stripListingFieldsFromTrimRemainder(s, listing);
}

/**
 * Card headline: "YEAR Make Model Badge Series", e.g.
 * "2019 Toyota Corolla Ascent Sport Hybrid ZWE211R".
 *
 * Built in `vehicle-name.ts` so cards, the VDP and structured data all agree.
 * Falls back to year/make/model, then to the raw feed title.
 */
export function vehicleCardHeadlineYearMakeModelTrim(
  listing: VehicleListing,
): string {
  console.log(listing);
  
  const headline = listing.headline?.trim();
  if (headline) return headline;

  const year =
    listing.year != null && listing.year > 0 ? String(listing.year) : "";
  const parts = [year, listing.make?.trim(), listing.model?.trim()].filter(
    Boolean,
  );
  if (parts.length) return parts.join(" ");
  return vehicleCardHeadline(listing);
}

/**
 * Card title line — "YEAR Make Model", e.g. "2020 Mazda CX-8".
 *
 * The badge and series move to {@link vehicleCardTrimLine}, so the two lines
 * read as a car and then its variant instead of one long run of words. Falls
 * back to the full headline when year, make and model are all missing.
 */
export function vehicleCardPrimaryLine(listing: VehicleListing): string {
  const year =
    listing.year != null && listing.year > 0 ? String(listing.year) : "";
  const parts = [year, listing.make?.trim(), listing.model?.trim()].filter(
    Boolean,
  );
  if (parts.length) return parts.join(" ");
  return vehicleCardHeadlineYearMakeModelTrim(listing);
}

/**
 * Card second line: the variant — badge then series, e.g. "Sport KG2WLA".
 *
 * Both come pre-separated from the name parser. A record the parser could not
 * split falls back to the trim recovered from the raw title, and a vehicle with
 * neither returns "" so the card renders no second line rather than a blank one.
 */
export function vehicleCardTrimLine(listing: VehicleListing): string {
  const parts = [listing.badge?.trim(), listing.series?.trim()].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return vehicleCardTrimFromTitle(listing);
}

/**
 * Short feature pills for list cards (feed has no equipment list).
 *
 * These values also exist as spec rows, so the list card drops the matching
 * rows rather than printing body type and drive type twice per card.
 */
export function vehicleCardFeatureTags(
  listing: VehicleListing,
  max = 2,
): string[] {
  const candidates = [
    listing.body_type?.trim(),
    listing.drive_type?.trim(),
    // listing.fuel_type?.trim(),
  ].filter(Boolean) as string[];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Secondary line: trim / variant text without repeating year + make + model at the start.
 */
export function vehicleCardSubtitle(listing: VehicleListing): string {
  const s = vehicleCardTrimFromTitle(listing);
  if (s) return s;
  const parts = [
    listing.year ? String(listing.year) : "",
    listing.body_type?.trim() || "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function vehicleCardOdometerLabel(listing: VehicleListing): string | null {
  if (listing.odometer != null && listing.odometer > 0) {
    return `${listing.odometer.toLocaleString("en-AU")} km`;
  }
  return null;
}
