import type { DealerVehicle, InventoryFilterState } from "@/types/inventory";
import {
  filterDealerVehicles,
  inventoryListingQueryHref,
  parseInventorySearchParams,
  priceNum,
  vehicleSeatCount,
} from "./query";
import { dominantUsedCondition } from "./popular-body-types";

const emptyFilters: InventoryFilterState = parseInventorySearchParams({});

export type QuickSearchChip = {
  label: string;
  href: string;
  count: number;
};

function norm(s: string | undefined | null): string {
  return (s ?? "").trim();
}

type ChipDef = {
  label: string;
  match: (v: DealerVehicle) => boolean;
  /** Filters the chip's link applies, on top of the used-condition filter. */
  filters: (matches: DealerVehicle[]) => Partial<InventoryFilterState>;
};

const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];

/*
  How buyers actually start: a budget, a fuel, a shape, or a brand they trust.
  Each chip's filter values are read back from the vehicles that matched, so a
  link can never point at a spelling the feed does not use ("Utility" vs "Ute"),
  and chips with no stock behind them are dropped before render.
*/
const CHIPS: ChipDef[] = [
  {
    label: "Under $20k",
    match: (v) => {
      const p = priceNum(v);
      return p > 0 && p < 20000;
    },
    filters: () => ({ maxPrice: 20000 }),
  },
  {
    label: "Under $30k",
    match: (v) => {
      const p = priceNum(v);
      return p > 0 && p < 30000;
    },
    filters: () => ({ maxPrice: 30000 }),
  },
  {
    label: "4x4 utes",
    match: (v) => {
      const b = norm(v.BodyType).toLowerCase();
      const d = norm(v.DriveType).toLowerCase();
      const isUte =
        b.includes("ute") ||
        b.includes("utility") ||
        b.includes("cab chassis") ||
        b.includes("dual cab") ||
        b.includes("pickup");
      const is4x4 =
        d.includes("4wd") || d.includes("4x4") || d.includes("four wheel");
      return isUte && is4x4;
    },
    filters: (matches) => ({
      bodyType: uniq(matches.map((v) => norm(v.BodyType))),
      driveType: uniq(matches.map((v) => norm(v.DriveType))),
    }),
  },
  {
    label: "SUVs & wagons",
    match: (v) => {
      const b = norm(v.BodyType).toLowerCase();
      return b.includes("suv") || b.includes("wagon");
    },
    filters: (matches) => ({
      bodyType: uniq(matches.map((v) => norm(v.BodyType))),
    }),
  },
  {
    label: "7+ seats",
    match: (v) => (vehicleSeatCount(v) ?? 0) >= 7,
    filters: () => ({ minSeats: 7 }),
  },
  {
    label: "Diesel",
    match: (v) => norm(v.FuelType).toLowerCase().includes("diesel"),
    filters: (matches) => ({
      fuelType: uniq(matches.map((v) => norm(v.FuelType))),
    }),
  },
  {
    label: "Hybrid",
    match: (v) => norm(v.FuelType).toLowerCase().includes("hybrid"),
    filters: (matches) => ({
      fuelType: uniq(matches.map((v) => norm(v.FuelType))),
    }),
  },
  {
    label: "Automatic",
    match: (v) => norm(v.TransmissionType).toLowerCase().includes("auto"),
    filters: (matches) => ({
      transmission: uniq(matches.map((v) => norm(v.TransmissionType))),
    }),
  },
  {
    label: "Toyota",
    match: (v) => norm(v.Make).toLowerCase() === "toyota",
    filters: () => ({ make: "toyota" }),
  },
];

/**
 * Quick-start categories for the results page, built from current stock.
 * A chip only appears when at least one vehicle sits behind it.
 */
export function getQuickSearchChips(vehicles: DealerVehicle[]): QuickSearchChip[] {
  const condition = dominantUsedCondition(vehicles);
  const usedPool = filterDealerVehicles(vehicles, { ...emptyFilters, condition });

  return CHIPS.map((chip) => {
    const matches = usedPool.filter(chip.match);
    if (matches.length === 0) return null;
    const href = inventoryListingQueryHref({
      ...emptyFilters,
      condition,
      page: 1,
      ...chip.filters(matches),
    });
    return { label: chip.label, href, count: matches.length };
  }).filter((chip): chip is QuickSearchChip => chip !== null);
}
