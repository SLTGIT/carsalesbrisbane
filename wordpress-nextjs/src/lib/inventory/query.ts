import type { DealerVehicle } from "@/types/inventory";
import {
  DEFAULT_INVENTORY_SORT,
  type InventoryFilterState,
  type InventorySort,
} from "@/types/inventory";
import { slugifyInventoryPart } from "@/lib/inventory/slug";
import {
  vehicleDisplayFuelType,
  vehicleDisplayTransmission,
} from "@/lib/inventory/vehicle-specs";
import {
  mergePathAugmentIntoFilters,
  pathSlugForInventoryListing,
  serializeOmitKeysForPathFacet,
} from "@/lib/inventory/search-path-slugs";
import { resolveMakeModelFromPathSlugs } from "@/lib/inventory/search-make-model-paths";

function toStr(v: string | string[] | undefined): string {
  if (v === undefined) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

function toStrArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseIntOrNull(s: string | undefined): number | null {
  if (s === undefined || s === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

const SORTS: InventorySort[] = [
  "best",
  "price-asc",
  "price-desc",
  "year-desc",
  "year-asc",
  "odometer-asc",
];

export function parseInventorySearchParams(
  raw: Record<string, string | string[] | undefined>
): InventoryFilterState {
  const sortRaw = toStr(raw.sort).toLowerCase();
  const sort = SORTS.includes(sortRaw as InventorySort)
    ? (sortRaw as InventorySort)
    : DEFAULT_INVENTORY_SORT;

  /** List/grid is client-only (not in the URL). */
  const view: "grid" | "list" = "list";

  const makeRaw = toStr(raw.make).trim();
  const modelRaw = toStr(raw.model).trim();
  return {
    q: toStr(raw.q),
    condition: toStr(raw.condition),
    make: makeRaw ? makeRaw.toLowerCase() : "",
    model: modelRaw ? modelRaw.toLowerCase() : "",
    bodyType: toStrArray(raw.bodyType),
    fuelType: toStrArray(raw.fuelType),
    bodyColour: toStrArray(raw.bodyColour),
    driveType: toStrArray(raw.driveType),
    transmission: toStrArray(raw.transmission),
    type: toStrArray(raw.type),
    minPrice: parseIntOrNull(toStr(raw.minPrice)),
    maxPrice: parseIntOrNull(toStr(raw.maxPrice)),
    minYear: parseIntOrNull(toStr(raw.minYear)),
    maxYear: parseIntOrNull(toStr(raw.maxYear)),
    sort,
    view,
    page: Math.max(1, parseIntOrNull(toStr(raw.page)) ?? 1),
  };
}

/** True when URL/query applies inventory filters beyond pagination and sort. */
export function hasActiveInventoryFilters(f: InventoryFilterState): boolean {
  if (f.q.trim()) return true;
  if (f.condition.trim()) return true;
  if (f.make.trim()) return true;
  if (f.model.trim()) return true;
  if (f.bodyType.length) return true;
  if (f.fuelType.length) return true;
  if (f.bodyColour.length) return true;
  if (f.driveType.length) return true;
  if (f.transmission.length) return true;
  if (f.type.length) return true;
  if (f.minPrice !== null || f.maxPrice !== null) return true;
  if (f.minYear !== null || f.maxYear !== null) return true;
  return false;
}

function norm(s: string | undefined | null): string {
  return (s ?? "").trim();
}

export function priceNum(v: DealerVehicle): number {
  const p =
    v.Pricing?.AdvertisedPrice?.trim() || v.Pricing?.DriveAwayPrice?.trim();
  if (!p) return 0;
  const n = Number(String(p).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function filterDealerVehicles(
  vehicles: DealerVehicle[],
  f: InventoryFilterState
): DealerVehicle[] {
  const q = f.q.trim().toLowerCase();

  return vehicles.filter((v) => {
    if (f.condition && norm(v.Condition) !== f.condition) return false;
    if (
      f.make &&
      norm(v.Make).toLowerCase() !== f.make.toLowerCase()
    )
      return false;
    if (f.model.trim() && norm(v.Model).toLowerCase() !== f.model.trim().toLowerCase())
      return false;
    if (f.bodyType.length > 0) {
      const b = norm(v.BodyType);
      if (!b || !f.bodyType.includes(b)) return false;
    }
    if (f.fuelType.length > 0) {
      // Match the corrected powertrain, so the "Hybrid" facet actually returns
      // hybrids the feed filed under "Petrol - Unleaded".
      const x = norm(vehicleDisplayFuelType(v));
      if (!x || !f.fuelType.includes(x)) return false;
    }
    if (f.bodyColour.length > 0) {
      const x = norm(v.BodyColour);
      if (!x || !f.bodyColour.includes(x)) return false;
    }
    if (f.driveType.length > 0) {
      const x = norm(v.DriveType);
      if (!x || !f.driveType.includes(x)) return false;
    }
    if (f.transmission.length > 0) {
      const x = norm(vehicleDisplayTransmission(v));
      if (!x || !f.transmission.includes(x)) return false;
    }
    if (f.type.length > 0) {
      const x = norm(v.Type);
      if (!x || !f.type.includes(x)) return false;
    }

    const p = priceNum(v);
    if (f.minPrice !== null && p > 0 && p < f.minPrice) return false;
    if (f.maxPrice !== null && p > 0 && p > f.maxPrice) return false;

    const y = v.ManufactureYear;
    if (f.minYear !== null && y < f.minYear) return false;
    if (f.maxYear !== null && y > f.maxYear) return false;

    if (q) {
      const hay = [
        v.Description,
        v.Make,
        v.Model,
        v.BodyType,
        v.FuelType,
        v.SKU,
        v.Comments,
        v.Location,
      ]
        .join(" ")
        .toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      if (!tokens.every((t) => hay.includes(t))) return false;
    }

    return true;
  });
}

export function sortDealerVehicles(
  vehicles: DealerVehicle[],
  sort: InventorySort
): DealerVehicle[] {
  const copy = [...vehicles];
  switch (sort) {
    case "price-asc":
      copy.sort((a, b) => priceNum(a) - priceNum(b));
      break;
    case "price-desc":
      copy.sort((a, b) => priceNum(b) - priceNum(a));
      break;
    case "year-desc":
      copy.sort((a, b) => b.ManufactureYear - a.ManufactureYear);
      break;
    case "year-asc":
      copy.sort((a, b) => a.ManufactureYear - b.ManufactureYear);
      break;
    case "odometer-asc":
      copy.sort((a, b) => {
        const ao = a.Odometer ?? 999999999;
        const bo = b.Odometer ?? 999999999;
        return ao - bo;
      });
      break;
    default:
      break;
  }
  return copy;
}

export function countByField(
  vehicles: DealerVehicle[],
  field: keyof DealerVehicle
): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of vehicles) {
    const raw = v[field];
    const key =
      typeof raw === "string" ? raw.trim() : raw != null ? String(raw) : "";
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/**
 * Facet counts over a derived value rather than a raw feed key — used where the
 * displayed value differs from the feed (recovered powertrain, simplified
 * transmission), so facet labels match what the cards show.
 */
export function countBySelector(
  vehicles: DealerVehicle[],
  select: (v: DealerVehicle) => string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of vehicles) {
    const key = select(v).trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function mapToOptions(
  map: Map<string, number>,
  labelFn?: (v: string) => string
): { value: string; label: string; count: number }[] {
  return [...map.entries()]
    .map(([value, count]) => ({
      value,
      label: labelFn ? labelFn(value) : value,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function priceYearBounds(vehicles: DealerVehicle[]): {
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
} {
  let minP = Infinity;
  let maxP = 0;
  let minY = Infinity;
  let maxY = 0;
  for (const v of vehicles) {
    const p = priceNum(v);
    if (p > 0) {
      minP = Math.min(minP, p);
      maxP = Math.max(maxP, p);
    }
    const y = v.ManufactureYear;
    if (Number.isFinite(y)) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minP)) minP = 0;
  if (!Number.isFinite(minY)) minY = new Date().getFullYear() - 30;
  if (!Number.isFinite(maxY)) maxY = new Date().getFullYear();
  return {
    minPrice: Math.floor(minP / 1000) * 1000,
    maxPrice: Math.ceil(maxP / 1000) * 1000 || 200000,
    minYear: minY,
    maxYear: maxY,
  };
}

export const PER_PAGE = 12;

/** Build a record suitable for parseInventorySearchParams from URLSearchParams */
export function urlSearchParamsToRecord(
  sp: URLSearchParams
): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  const keys = new Set(sp.keys());
  for (const key of keys) {
    const all = sp.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

export type InventoryFacetOmit =
  | "condition"
  | "make"
  | "model"
  | "bodyType"
  | "fuelType"
  | "bodyColour"
  | "driveType"
  | "transmission"
  | "type"
  | "price"
  | "year"
  | "q";

/** Clone filter state with some dimensions cleared (for facet counts). */
export function omitInventoryFilters(
  f: InventoryFilterState,
  omit: InventoryFacetOmit[]
): InventoryFilterState {
  const n = { ...f };
  if (omit.includes("condition")) n.condition = "";
  if (omit.includes("make")) n.make = "";
  if (omit.includes("model")) n.model = "";
  if (omit.includes("bodyType")) n.bodyType = [];
  if (omit.includes("fuelType")) n.fuelType = [];
  if (omit.includes("bodyColour")) n.bodyColour = [];
  if (omit.includes("driveType")) n.driveType = [];
  if (omit.includes("transmission")) n.transmission = [];
  if (omit.includes("type")) n.type = [];
  if (omit.includes("price")) {
    n.minPrice = null;
    n.maxPrice = null;
  }
  if (omit.includes("year")) {
    n.minYear = null;
    n.maxYear = null;
  }
  if (omit.includes("q")) n.q = "";
  return n;
}

/** Serialize filters to a query string (no leading `?`). */
export function serializeInventoryFilters(
  f: InventoryFilterState,
  opts?: { omitMake?: boolean; omitKeys?: Set<string> },
): string {
  const omit = opts?.omitKeys ?? new Set<string>();
  const skipMake = Boolean(opts?.omitMake) || omit.has("make");
  const p = new URLSearchParams();
  const q = f.q.trim();
  if (q) p.set("q", q);
  if (f.condition) p.set("condition", f.condition);
  if (f.make && !skipMake) p.set("make", f.make.trim().toLowerCase());
  if (f.model.trim() && !omit.has("model"))
    p.set("model", f.model.trim().toLowerCase());
  if (!omit.has("bodyType")) {
    for (const bt of f.bodyType) p.append("bodyType", bt);
  }
  if (!omit.has("fuelType")) {
    for (const ft of f.fuelType) p.append("fuelType", ft);
  }
  if (!omit.has("bodyColour")) {
    for (const c of f.bodyColour) p.append("bodyColour", c);
  }
  if (!omit.has("driveType")) {
    for (const d of f.driveType) p.append("driveType", d);
  }
  if (!omit.has("transmission")) {
    for (const t of f.transmission) p.append("transmission", t);
  }
  if (!omit.has("type")) {
    for (const ty of f.type) p.append("type", ty);
  }
  if (!omit.has("minPrice") && f.minPrice !== null)
    p.set("minPrice", String(f.minPrice));
  if (!omit.has("maxPrice") && f.maxPrice !== null)
    p.set("maxPrice", String(f.maxPrice));
  if (!omit.has("minYear") && f.minYear !== null)
    p.set("minYear", String(f.minYear));
  if (!omit.has("maxYear") && f.maxYear !== null)
    p.set("maxYear", String(f.maxYear));
  if (f.sort !== DEFAULT_INVENTORY_SORT) p.set("sort", f.sort);
  if (f.page > 1) p.set("page", String(f.page));
  return p.toString();
}

/**
 * When the URL is `/search/{slug}?…`, query string may omit dimensions that
 * are implied by the path (make or a single inventory facet).
 */
export function mergeInventoryFiltersWithPathAugment(
  filters: InventoryFilterState,
  pathAugment: Partial<InventoryFilterState> | null,
): InventoryFilterState {
  if (!pathAugment || Object.keys(pathAugment).length === 0) return filters;
  return mergePathAugmentIntoFilters(filters, pathAugment);
}

/** Strip path-implied filters so the full inventory can be shown (e.g. facet SRP miss). */
export function clearPathAugmentFromFilters(
  filters: InventoryFilterState,
  augment: Partial<InventoryFilterState>,
): InventoryFilterState {
  const out = { ...filters, page: 1 };
  if (augment.make?.trim()) out.make = "";
  if (augment.model?.trim()) out.model = "";
  if (augment.bodyType?.length) out.bodyType = [];
  if (augment.fuelType?.length) out.fuelType = [];
  if (augment.bodyColour?.length) out.bodyColour = [];
  if (augment.driveType?.length) out.driveType = [];
  if (augment.transmission?.length) out.transmission = [];
  if (augment.type?.length) out.type = [];
  if (
    augment.minPrice !== null &&
    augment.minPrice !== undefined &&
    augment.maxPrice !== null &&
    augment.maxPrice !== undefined
  ) {
    out.minPrice = null;
    out.maxPrice = null;
  }
  if (
    augment.minYear !== null &&
    augment.minYear !== undefined &&
    augment.maxYear !== null &&
    augment.maxYear !== undefined
  ) {
    out.minYear = null;
    out.maxYear = null;
  }
  return out;
}

/**
 * When the URL is `/search/{makeSlug}?…`, query string may omit `make`;
 * merge the path-derived make into filter state for parsing + navigation.
 */
export function mergeInventoryFiltersWithPathMake(
  filters: InventoryFilterState,
  pathMakeFilter: string | null,
): InventoryFilterState {
  if (!pathMakeFilter?.trim()) return filters;
  return mergeInventoryFiltersWithPathAugment(filters, {
    make: pathMakeFilter.trim().toLowerCase(),
  });
}

/**
 * Canonical inventory listing URL: `/search/{slug}` when make or a single
 * facet is set (slug matches feed-derived path rules), otherwise `/search?…`.
 * Query-only `/search?make=` still parses correctly; this href prefers the path form.
 */
export function inventoryListingHref(
  f: InventoryFilterState,
  vehicles?: DealerVehicle[],
): string {
  const makeTrimmed = f.make?.trim();
  if (makeTrimmed) {
    const makeSlug = slugifyInventoryPart(makeTrimmed);
    if (!makeSlug) {
      const qs = serializeInventoryFilters(f);
      return qs ? `/search?${qs}` : "/search";
    }
    const modelTrimmed = f.model?.trim();
    if (modelTrimmed) {
      const modelSlug = slugifyInventoryPart(modelTrimmed);
      if (modelSlug) {
        const pathOk =
          !vehicles ||
          resolveMakeModelFromPathSlugs(makeSlug, modelSlug, vehicles) !== null;
        if (pathOk) {
          const omitKeys = new Set(["make", "model"]);
          const qs = serializeInventoryFilters(f, {
            omitMake: true,
            omitKeys,
          });
          return qs
            ? `/search/${makeSlug}/${modelSlug}?${qs}`
            : `/search/${makeSlug}/${modelSlug}`;
        }
      }
    }
    const qs = serializeInventoryFilters(f, { omitMake: true });
    return qs ? `/search/${makeSlug}?${qs}` : `/search/${makeSlug}`;
  }

  const facetPath = pathSlugForInventoryListing(f, vehicles);
  if (facetPath) {
    const omitKeys = serializeOmitKeysForPathFacet(facetPath.facet);
    const qs = serializeInventoryFilters(f, { omitKeys });
    return qs ? `/search/${facetPath.slug}?${qs}` : `/search/${facetPath.slug}`;
  }

  const qs = serializeInventoryFilters(f);
  return qs ? `/search?${qs}` : "/search";
}

/** UI-first href that always stays on `/search?...` query-string format. */
export function inventoryListingQueryHref(f: InventoryFilterState): string {
  const qs = serializeInventoryFilters(f);
  return qs ? `/search?${qs}` : "/search";
}

/**
 * When `basePathname` is set (e.g. CMS SRP at `/use-car-hyundai`), inventory links
 * stay on that path with a query string; otherwise use {@link inventoryListingQueryHref}.
 */
export function inventoryListingHrefForContext(
  basePathname: string | null | undefined,
  f: InventoryFilterState,
): string {
  const trimmed = basePathname?.trim();
  if (trimmed) {
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const qs = serializeInventoryFilters(f);
    return qs ? `${path}?${qs}` : path;
  }
  return inventoryListingQueryHref(f);
}
