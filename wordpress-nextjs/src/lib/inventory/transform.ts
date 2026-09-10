import type { DealerVehicle, VehicleListing } from "@/types/inventory";
import { buildVehicleSlug } from "./slug";
import {
  vehicleDisplayFuelType,
  vehicleDisplayTransmission,
  vehicleDoors,
  vehicleEngine,
  vehicleHeadline,
  vehicleNameParts,
  vehicleRego,
  vehicleSeats,
} from "./vehicle-specs";

/** Coerce dealer feed price fields (string or number) — same source as `listing` / VDP. */
export function inventoryPriceField(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) return String(Math.round(raw));
  return String(raw).trim();
}

/** Normalise feed odometer (number, numeric string, or strings with separators). */
export function parseInventoryOdometerKm(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return Math.round(raw);
  }
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatAudPrice(raw: string | undefined): string {
  if (raw === undefined || raw === null || String(raw).trim() === "") return "";
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  if (Number.isNaN(n)) return `$${raw}`;
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

export function priceNumber(
  raw: string | number | undefined | null
): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? Math.round(raw) : null;
  }
  const t = String(raw)
    .replace(/\u202f|\u00a0/g, " ")
    .trim();
  if (t === "") return null;
  const n = Number(t.replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

/**
 * Parses the AUD amount actually shown on cards / VDP (`listing.formatted_price`
 * or `listing.drive_away_price` when drive-away mode is on).
 */
export function listingDisplayNumericPriceAud(
  listing: VehicleListing
): number | null {
  const shown =
    listing.show_drive_away && listing.drive_away_price
      ? listing.drive_away_price
      : listing.formatted_price;
  const n = priceNumber(shown || undefined);
  return n != null && n > 0 && Number.isFinite(n) ? n : null;
}

export function shortenLocation(loc: string): string {
  if (!loc?.trim()) return "";
  const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(", ");
  return loc.trim();
}

export function dealerVehicleToListing(v: DealerVehicle): VehicleListing {
  const advertised = inventoryPriceField(v.Pricing?.AdvertisedPrice);
  const driveAway = inventoryPriceField(v.Pricing?.DriveAwayPrice);
  const isDriveAway =
    Boolean(v.Pricing?.IsDriveAwayPrice) && Boolean(driveAway);
  const priceStr = advertised || driveAway || "";
  const photo = v.Photos?.[0]?.PhotoUrl ?? null;
  const make = v.Make?.trim() || "";
  const model = v.Model?.trim() || "";
  const title =
    v.Description?.trim() ||
    [v.ManufactureYear, make, model].filter(Boolean).join(" ");

  const egcRaw = inventoryPriceField(v.Pricing?.EGCPrice);
  const advN = priceNumber(advertised || driveAway || undefined);
  const egcN = priceNumber(egcRaw);
  const compare_at_price =
    egcRaw && egcN != null && advN != null && egcN > advN
      ? formatAudPrice(egcRaw)
      : null;

  const { badge, series } = vehicleNameParts(v);

  return {
    id: v.ItemID,
    slug: buildVehicleSlug(v),
    title,
    headline: vehicleHeadline(v),
    badge,
    series,
    make,
    model,
    featured_image: photo,
    condition: v.Condition || "Used",
    body_type: v.BodyType?.trim() || "",
    transmission: vehicleDisplayTransmission(v),
    transmission_raw: v.TransmissionType?.trim() || "",
    fuel_type: vehicleDisplayFuelType(v),
    fuel_type_raw: v.FuelType?.trim() || "",
    drive_type: v.DriveType?.trim() || "",
    engine: vehicleEngine(v),
    seats: vehicleSeats(v),
    doors: vehicleDoors(v),
    rego: vehicleRego(v),
    type_code: v.Type?.trim() || "",
    odometer: parseInventoryOdometerKm(v.Odometer),
    stock_number: v.SKU?.trim() || "",
    formatted_price: formatAudPrice(priceStr),
    compare_at_price,
    drive_away_price: driveAway ? formatAudPrice(driveAway) : null,
    show_drive_away: isDriveAway,
    location_short: shortenLocation(v.Location || ""),
    year: v.ManufactureYear,
    body_colour: v.BodyColour?.trim() || "",
    trim_colour: v.TrimColour?.trim() || "",
  };
}

/**
 * Split long dealer comments into readable paragraphs.
 */
export function splitVehicleDescription(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;

  const single = blocks[0] ?? "";
  if (single.length < 420) return [single];

  const sentences = single.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 1) return [single];

  const out: string[] = [];
  let buf = "";
  for (const sent of sentences) {
    const next = buf ? `${buf} ${sent}` : sent;
    if (next.length > 400 && buf) {
      out.push(buf.trim());
      buf = sent;
    } else {
      buf = next;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [single];
}

export function typeCodeLabel(code: string): string {
  const c = code?.toUpperCase();
  if (c === "CAR") return "Car";
  if (c === "TRU") return "Truck";
  if (c === "OTH") return "Other";
  return code || "";
}
