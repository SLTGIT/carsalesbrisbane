/**
 * Vehicle headline construction: YEAR MAKE MODEL BADGE SERIES.
 *
 * Dealer Solutions packs the whole specification into one `Description` string:
 *
 *   "2019 Toyota Corolla ZWE211R Ascent Sport E-CVT Hybrid White 1 Speed
 *    Constant Variable Hatchback"
 *
 * Only "Ascent Sport" (badge) and "ZWE211R" (series) belong in a headline. The
 * rest is specification tail that repeats fields we already show in the spec
 * grid. This module strips that tail while preserving powertrain words, which
 * are part of how a buyer identifies the car.
 *
 * Every step degrades to a shorter answer rather than throwing, so a vehicle
 * with a missing or oddly formatted Description still renders a headline.
 */

export interface VehicleNameParts {
  /** Badge / variant, e.g. "Ascent Sport Hybrid", "GXL", "XLT". */
  badge: string;
  /** Manufacturer series code, e.g. "ZWE211R". Empty when not detected. */
  series: string;
}

export interface VehicleNameContext {
  /** Feed `Description` — the packed name line. */
  description?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  bodyType?: string | null;
  bodyColour?: string | null;
  trimColour?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  driveType?: string | null;
  condition?: string | null;
  stockNumber?: string | null;
  /** Dedicated feed badge/variant field, when the export carries one. */
  feedBadge?: string | null;
  /** Dedicated feed series field, when the export carries one. */
  feedSeries?: string | null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tidy(s: string): string {
  return s
    .replace(/[\s,]+/g, " ")
    .replace(/\s*-\s*(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeLeading(s: string, phrase?: string | null): string {
  const p = (phrase ?? "").trim();
  if (!p) return s;
  const next = s.replace(new RegExp(`^${escapeRegExp(p)}\\b[\\s,-]*`, "i"), "");
  return next.length < s.length ? next.trim() : s;
}

function removePhrase(s: string, phrase?: string | null): string {
  const p = (phrase ?? "").trim();
  if (!p) return s;
  return s.replace(new RegExp(`\\b${escapeRegExp(p)}\\b`, "gi"), " ");
}

/**
 * Powertrain words are protected before the tail strip runs, so no future
 * addition to the noise list can silently delete "Hybrid" from a headline.
 */
const POWERTRAIN_GUARD =
  /\b(?:plug[\s-]?in\s+hybrid|phev|hybrids?|electric|bev|mhev|hydrogen|fcev)\b/gi;

/**
 * Private-use sentinels, so a placeholder can never be confused with a real
 * number — "Breakout 114" must survive the round trip intact.
 */
const GUARD_OPEN = "";
const GUARD_CLOSE = "";

function protectPowertrain(s: string): { text: string; tokens: string[] } {
  const tokens: string[] = [];
  const text = s.replace(POWERTRAIN_GUARD, (m) => {
    tokens.push(m);
    return `${GUARD_OPEN}${tokens.length - 1}${GUARD_CLOSE}`;
  });
  return { text, tokens };
}

function restorePowertrain(s: string, tokens: string[]): string {
  return s.replace(
    new RegExp(`${GUARD_OPEN}(\\d+)${GUARD_CLOSE}`, "g"),
    (_, i: string) => tokens[Number(i)] ?? "",
  );
}

/**
 * Specification tail patterns, in application order. Model-year stamps run
 * before engine capacity so "16.5MY" is consumed as a stamp, not a capacity.
 */
const NOISE_PATTERNS: RegExp[] = [
  // Model-year stamps: MY22, MY 22, 2022MY, 2020.25MY, 16.5MY
  /\b(?:my\s?\d{2,4}|\d{2,4}(?:\.\d{1,2})?\s?my)\b/gi,
  // Gear counts: "6 Speed", "8sp", "10 Speed"
  /\b\d{1,2}\s*(?:speed|sp)\b/gi,
  // Door counts: "5dr", "4 door", "2-door"
  /\b\d\s*-?\s*(?:dr|door)s?\b/gi,
  // Engine capacity: "2.0i", "1.8L", "3.6". A hyphen suffix means it is a badge
  // ("2.0i-S" on the Impreza), so the lookahead keeps those intact.
  /\b\d\.\d\s?[a-z]{0,3}\b(?!-)/gi,
  /\b\d{3,4}\s?cc\b/gi,
  // Transmission mechanisms
  /\b(?:sports?\s+automatic\s+dual\s+clutch|sports?\s+automatic|constant\s+variable|dual\s+clutch|automatic|manual|spts\s+auto|spts|auto|e-?cvt|cvt|dct|dsg|tiptronic|steptronic|x-?tronic|skyactiv-?drive|multitronic|powershift)\b/gi,
  // Drive types
  /\b(?:fulltime\s+4wd|i-?activ\s+awd|4\s?x\s?[24]|[24]wd|4wd|awd|fwd|rwd)\b/gi,
  // Body descriptors
  /\b(?:single\s+cab\s+chassis|dual\s+cab\s+chassis|double\s+cab|dual\s+cab|single\s+cab|extended\s+cab|cab\s+chassis|pick-?up|hatchback|sedan|wagon|utility|coupe|convertible|suv|van|ute|cruiser)\b/gi,
];

/**
 * A manufacturer series code: uppercase, at least four characters, mixing
 * letters with two or more digits (ZWE211R, VDJ200R, W164, TFS40J).
 *
 * Deliberately conservative — badges like "SR5", "GXL" and "XLT" must not
 * match. A series code we fail to recognise simply keeps its position in the
 * badge text, so nothing is ever lost.
 */
function isSeriesCode(token: string): boolean {
  if (!/^[A-Z][A-Z0-9.]{3,9}$/.test(token)) return false;
  const digits = (token.match(/\d/g) ?? []).length;
  const letters = (token.match(/[A-Z]/g) ?? []).length;
  return digits >= 2 && letters >= 1;
}

/**
 * Removes specification tail noise, preserving powertrain words.
 *
 * Compound spec phrases are stripped BEFORE exact feed values, because removing
 * the DriveType "AWD" first would split "i-ACTIV AWD" and orphan "i-ACTIV".
 */
function stripSpecTail(text: string, fieldValues: string[] = []): string {
  const { text: guarded, tokens } = protectPowertrain(text);
  let cleaned = guarded;
  for (const re of NOISE_PATTERNS) cleaned = cleaned.replace(re, " ");
  for (const v of fieldValues) cleaned = removePhrase(cleaned, v);
  return tidy(restorePowertrain(cleaned, tokens));
}

function parseFromDescription(ctx: VehicleNameContext): VehicleNameParts {
  let s = tidy(ctx.description ?? "");
  if (!s) return { badge: "", series: "" };

  const year = ctx.year != null && ctx.year > 0 ? String(ctx.year) : "";
  if (year) s = s.replace(new RegExp(`^${year}\\b[\\s,-]*`), "").trim();

  s = removeLeading(s, ctx.make);
  s = removeLeading(s, ctx.model);

  // Longest first, so "Sports Automatic Dual Clutch" goes before "Automatic".
  const fieldValues = [
    ctx.stockNumber,
    ctx.bodyColour,
    ctx.trimColour,
    ctx.bodyType,
    ctx.transmission,
    ctx.fuelType,
    ctx.driveType,
    ctx.condition,
  ]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const cleaned = stripSpecTail(s, fieldValues);

  // Dealer Solutions places the series code immediately after the model, so
  // only a leading code is lifted out. Anything further along stays in feed
  // order — on the W164 ML320 the second code is the badge, not the series.
  const tokens2 = cleaned.split(" ").filter(Boolean);
  let series = "";
  if (tokens2.length > 1 && isSeriesCode(tokens2[0])) {
    series = tokens2.shift() ?? "";
  }

  return { badge: tidy(tokens2.join(" ")), series };
}

/**
 * Badge and series for a vehicle. Dedicated feed fields win; the packed
 * Description is only the fallback.
 */
export function extractVehicleNameParts(
  ctx: VehicleNameContext,
): VehicleNameParts {
  // The feed's own badge still carries spec tail — Dealer Solutions supplies
  // "Ascent Sport E-CVT Hybrid", where E-CVT is the transaxle, not the badge.
  // Clean it the same way as a parsed badge so "Hybrid" survives and E-CVT does not.
  const feedBadge = stripSpecTail((ctx.feedBadge ?? "").trim());
  const feedSeries = (ctx.feedSeries ?? "").trim();
  if (feedBadge && feedSeries) return { badge: feedBadge, series: feedSeries };

  const parsed = parseFromDescription(ctx);
  return {
    badge: feedBadge || parsed.badge,
    series: feedSeries || parsed.series,
  };
}

/**
 * The headline shown on cards, the VDP and structured data:
 * "2019 Toyota Corolla Ascent Sport Hybrid ZWE211R".
 *
 * Falls back to the raw Description when year/make/model are all absent, so a
 * malformed record still shows the dealer's own text rather than nothing.
 */
export function buildVehicleHeadline(ctx: VehicleNameContext): string {
  const { badge, series } = extractVehicleNameParts(ctx);
  const year = ctx.year != null && ctx.year > 0 ? String(ctx.year) : "";
  const parts = [
    year,
    (ctx.make ?? "").trim(),
    (ctx.model ?? "").trim(),
    badge,
    series,
  ].filter(Boolean);

  return parts.length ? parts.join(" ") : tidy(ctx.description ?? "");
}
