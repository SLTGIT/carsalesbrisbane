"use client";

import { useRouter } from "next/navigation";
import type { InventoryFilterState, InventorySort } from "@/types/inventory";
import { DEFAULT_INVENTORY_SORT } from "@/types/inventory";
import { inventoryListingHrefForContext } from "@/lib/inventory/query";
import { useInventorySearchUrl } from "@/components/vehicles/InventorySearchUrlContext";
import { useStableInventoryFilters } from "@/components/vehicles/useStableInventoryFilters";
import { useClientMounted } from "@/hooks/useClientMounted";

interface InventoryToolbarProps {
  total: number;
  sort: InventorySort;
  /** e.g. "SUV" → "SUV not found 51 used vehicles found" */
  notFoundLabel?: string | null;
}

export default function InventoryToolbar({
  total,
  sort,
  notFoundLabel,
}: InventoryToolbarProps) {
  const router = useRouter();
  const mounted = useClientMounted();
  const current = useStableInventoryFilters();
  const { resultsView, setResultsView, listingBasePathname } =
    useInventorySearchUrl();
  const activeView = mounted ? resultsView : "list";

  const setSort = (nextSort: InventorySort) => {
    const next: InventoryFilterState = {
      ...current,
      sort: nextSort,
      page: 1,
    };
    router.push(inventoryListingHrefForContext(listingBasePathname, next));
  };

  return (
    <div className="inventory-toolbar">
      <p className="inventory-toolbar-count">
        {notFoundLabel ? (
          <span>{notFoundLabel} not found </span>
        ) : null}
        <strong>{total.toLocaleString("en-AU")}</strong>
        <span> used vehicles found</span>
      </p>
      <div className="inventory-toolbar-actions">
        <label className="inventory-sort-wrap">
          <span className="visually-hidden">Sort by</span>
          <select
            className="inventory-sort-select"
            value={sort}
            onChange={(e) =>
              setSort((e.target.value || DEFAULT_INVENTORY_SORT) as InventorySort)
            }
            aria-label="Sort by"
          >
            <option value="best">— Best match —</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="year-desc">Year: Newest first</option>
            <option value="year-asc">Year: Oldest first</option>
            <option value="odometer-asc">Odometer: Low to High</option>
          </select>
        </label>
        <div className="inventory-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`inventory-view-btn ${activeView === "grid" ? "is-active" : ""}`}
            onClick={() => setResultsView("grid")}
            aria-pressed={activeView === "grid"}
            title="Grid view"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
            </svg>
          </button>
          <button
            type="button"
            className={`inventory-view-btn ${activeView === "list" ? "is-active" : ""}`}
            onClick={() => setResultsView("list")}
            aria-pressed={activeView === "list"}
            title="List view"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
