"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useCallback, type ReactNode } from "react";
import type {
  FilterOptionCount,
  InventoryFacets,
  InventoryFilterState,
} from "@/types/inventory";
import { inventoryListingHrefForContext } from "@/lib/inventory/query";
import { useInventorySearchUrl } from "@/components/vehicles/InventorySearchUrlContext";
import { useStableInventoryFilters } from "@/components/vehicles/useStableInventoryFilters";
import RangeSlider from "./RangeSlider";

interface InventoryFiltersSidebarProps {
  facets: InventoryFacets;
  bounds: {
    minPrice: number;
    maxPrice: number;
    minYear: number;
    maxYear: number;
  };
}

function navigate(
  router: ReturnType<typeof useRouter>,
  listingBasePathname: string | null,
  f: InventoryFilterState,
) {
  router.push(inventoryListingHrefForContext(listingBasePathname, f));
}

function clearFilterDimensions(f: InventoryFilterState): InventoryFilterState {
  return {
    ...f,
    q: "",
    condition: "",
    make: "",
    model: "",
    bodyType: [],
    fuelType: [],
    bodyColour: [],
    driveType: [],
    transmission: [],
    type: [],
    minPrice: null,
    maxPrice: null,
    minYear: null,
    maxYear: null,
    page: 1,
  };
}

export default function InventoryFiltersSidebar({
  facets,
  bounds,
}: InventoryFiltersSidebarProps) {
  const router = useRouter();
  const current = useStableInventoryFilters();
  const { listingBasePathname } = useInventorySearchUrl();

  const [open, setOpen] = useState<Record<string, boolean>>({
    bodyColour: false,
    bodyType: false,
    fuelType: false,
    price: false,
    year: false,
    driveType: false,
    transmission: false,
    type: false,
  });

  const toggleSection = (key: string) =>
    setOpen((s) => ({ ...s, [key]: !s[key] }));

  const push = useCallback(
    (next: InventoryFilterState) =>
      navigate(router, listingBasePathname, next),
    [router, listingBasePathname],
  );

  const chips = useMemo(() => {
    const out: { id: string; label: string; onRemove: () => void }[] = [];
    const base = { ...current, page: 1 };

    if (current.condition) {
      out.push({
        id: "condition",
        label: current.condition,
        onRemove: () => push({ ...base, condition: "" }),
      });
    }
    if (current.make) {
      out.push({
        id: "make",
        label: current.make,
        onRemove: () => push({ ...base, make: "", model: "" }),
      });
    }
    if (current.model.trim()) {
      const label =
        facets.models.find((m) => m.value === current.model.trim())?.label ??
        current.model;
      out.push({
        id: "model",
        label,
        onRemove: () => push({ ...base, model: "" }),
      });
    }
    for (const v of current.bodyType) {
      out.push({
        id: `body:${v}`,
        label: v,
        onRemove: () =>
          push({
            ...base,
            bodyType: current.bodyType.filter((x) => x !== v),
          }),
      });
    }
    for (const v of current.fuelType) {
      out.push({
        id: `fuel:${v}`,
        label: v,
        onRemove: () =>
          push({
            ...base,
            fuelType: current.fuelType.filter((x) => x !== v),
          }),
      });
    }
    for (const v of current.bodyColour) {
      out.push({
        id: `colour:${v}`,
        label: v,
        onRemove: () =>
          push({
            ...base,
            bodyColour: current.bodyColour.filter((x) => x !== v),
          }),
      });
    }
    for (const v of current.driveType) {
      out.push({
        id: `drive:${v}`,
        label: v,
        onRemove: () =>
          push({
            ...base,
            driveType: current.driveType.filter((x) => x !== v),
          }),
      });
    }
    for (const v of current.transmission) {
      out.push({
        id: `trans:${v}`,
        label: v,
        onRemove: () =>
          push({
            ...base,
            transmission: current.transmission.filter((x) => x !== v),
          }),
      });
    }
    for (const v of current.type) {
      out.push({
        id: `type:${v}`,
        label: v,
        onRemove: () =>
          push({ ...base, type: current.type.filter((x) => x !== v) }),
      });
    }
    const priceActive =
      current.minPrice !== null || current.maxPrice !== null;
    if (priceActive) {
      const lo =
        current.minPrice ?? bounds.minPrice;
      const hi =
        current.maxPrice ?? bounds.maxPrice;
      out.push({
        id: "price",
        label: `Price $${lo.toLocaleString("en-AU")} – $${hi.toLocaleString("en-AU")}`,
        onRemove: () => push({ ...base, minPrice: null, maxPrice: null }),
      });
    }
    const yearActive = current.minYear !== null || current.maxYear !== null;
    if (yearActive) {
      const lo = current.minYear ?? bounds.minYear;
      const hi = current.maxYear ?? bounds.maxYear;
      out.push({
        id: "year",
        label: `Year ${lo} – ${hi}`,
        onRemove: () => push({ ...base, minYear: null, maxYear: null }),
      });
    }
    if (current.q.trim()) {
      out.push({
        id: "q",
        label: `“${current.q.trim()}”`,
        onRemove: () => push({ ...base, q: "" }),
      });
    }
    return out;
  }, [bounds, current, facets.models, push]);

  const totalCondition = facets.conditions.reduce((a, o) => a + o.count, 0);
  const totalMakes = facets.makes.reduce((a, o) => a + o.count, 0);
  const totalModels = facets.models.reduce((a, o) => a + o.count, 0);

  const toggleInArray = (
    arr: string[],
    value: string,
    key: keyof InventoryFilterState
  ) => {
    const set = new Set(arr);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const next = {
      ...current,
      page: 1,
      [key]: [...set],
    } as InventoryFilterState;
    push(next);
  };

  return (
    <aside className="inventory-sidebar" aria-label="Filters">
      <div className="inventory-applied">
        <div className="inventory-applied-head">
          <h2 className="inventory-applied-title">Applied filters</h2>
          {chips.length > 0 && (
            <button
              type="button"
              className="inventory-clear-all"
              onClick={() => push(clearFilterDimensions(current))}
            >
              Clear all
            </button>
          )}
        </div>
        {chips.length > 0 ? (
          <ul className="inventory-chips" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.id}>
                <span className="inventory-chip">
                  <span className="inventory-chip-label">{c.label}</span>
                  <button
                    type="button"
                    className="inventory-chip-remove"
                    onClick={c.onRemove}
                    aria-label={`Remove ${c.label}`}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="inventory-applied-empty">No filters applied</p>
        )}
      </div>

      {/* <div className="inventory-filter-block">
        <label className="inventory-filter-label" htmlFor="inv-condition">
          Used cars ({totalCondition.toLocaleString("en-AU")})
        </label>
        <select
          id="inv-condition"
          className="inventory-select"
          value={current.condition}
          onChange={(e) =>
            push({
              ...current,
              page: 1,
              condition: e.target.value,
            })
          }
        >
          <option value="">All conditions</option>
          {facets.conditions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} ({o.count.toLocaleString("en-AU")})
            </option>
          ))}
        </select>
      </div> */}

      <div className="inventory-filter-block">
        <label className="inventory-filter-label" htmlFor="inv-make">
          All makes ({totalMakes.toLocaleString("en-AU")})
        </label>
        <select
          id="inv-make"
          className="inventory-select"
          value={current.make}
          onChange={(e) =>
            push({
              ...current,
              page: 1,
              make: e.target.value,
              model: "",
            })
          }
        >
          <option value="">All makes</option>
          {facets.makes.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} ({o.count.toLocaleString("en-AU")})
            </option>
          ))}
        </select>
      </div>

      {facets.models.length > 0 ? (
        <div className="inventory-filter-block">
          <label className="inventory-filter-label" htmlFor="inv-model">
            Models ({totalModels.toLocaleString("en-AU")})
          </label>
          <select
            id="inv-model"
            className="inventory-select"
            value={current.model}
            onChange={(e) =>
              push({
                ...current,
                page: 1,
                model: e.target.value,
              })
            }
          >
            <option value="">All models</option>
            {facets.models.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} ({o.count.toLocaleString("en-AU")})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <Accordion
        id="bodyColour"
        title="Colour"
        open={open.bodyColour}
        onToggle={() => toggleSection("bodyColour")}
        icon="palette"
      >
        <CheckboxFacet
          options={facets.colours}
          selected={current.bodyColour}
          onToggle={(v) =>
            toggleInArray(current.bodyColour, v, "bodyColour")
          }
        />
      </Accordion>

      <Accordion
        id="bodyType"
        title="Body type"
        open={open.bodyType}
        onToggle={() => toggleSection("bodyType")}
        icon="car"
      >
        <CheckboxFacet
          options={facets.bodyTypes}
          selected={current.bodyType}
          onToggle={(v) => toggleInArray(current.bodyType, v, "bodyType")}
        />
      </Accordion>

      <Accordion
        id="fuelType"
        title="Fuel"
        open={open.fuelType}
        onToggle={() => toggleSection("fuelType")}
        icon="fuel"
      >
        <CheckboxFacet
          options={facets.fuelTypes}
          selected={current.fuelType}
          onToggle={(v) => toggleInArray(current.fuelType, v, "fuelType")}
        />
      </Accordion>

      <Accordion
        id="price"
        title="Price"
        open={open.price}
        onToggle={() => toggleSection("price")}
        icon="dollar"
      >
        {bounds.maxPrice <= bounds.minPrice ? (
          <p className="inventory-facet-empty">No price data</p>
        ) : (
          <RangeSlider
            min={bounds.minPrice}
            max={bounds.maxPrice}
            currentMin={current.minPrice ?? bounds.minPrice}
            currentMax={current.maxPrice ?? bounds.maxPrice}
            onChange={(minVal, maxVal) => {
              const next = { ...current, page: 1 };
              next.minPrice =
                minVal <= bounds.minPrice ? null : minVal;
              next.maxPrice =
                maxVal >= bounds.maxPrice ? null : maxVal;
              push(next);
            }}
            formatValue={(n) =>
              n >= 1000
                ? `$${Math.round(n / 1000)}k`
                : `$${n.toLocaleString("en-AU")}`
            }
          />
        )}
      </Accordion>

      <Accordion
        id="year"
        title="Year"
        open={open.year}
        onToggle={() => toggleSection("year")}
        icon="calendar"
      >
        {bounds.maxYear <= bounds.minYear ? (
          <p className="inventory-facet-empty">No year data</p>
        ) : (
          <RangeSlider
            min={bounds.minYear}
            max={bounds.maxYear}
            currentMin={current.minYear ?? bounds.minYear}
            currentMax={current.maxYear ?? bounds.maxYear}
            onChange={(minVal, maxVal) => {
              const next = { ...current, page: 1 };
              next.minYear = minVal <= bounds.minYear ? null : minVal;
              next.maxYear = maxVal >= bounds.maxYear ? null : maxVal;
              push(next);
            }}
          />
        )}
      </Accordion>

      <Accordion
        id="driveType"
        title="Drive type"
        open={open.driveType}
        onToggle={() => toggleSection("driveType")}
        icon="car"
      >
        <CheckboxFacet
          options={facets.driveTypes}
          selected={current.driveType}
          onToggle={(v) => toggleInArray(current.driveType, v, "driveType")}
        />
      </Accordion>

      <Accordion
        id="transmission"
        title="Transmission"
        open={open.transmission}
        onToggle={() => toggleSection("transmission")}
        icon="gear"
      >
        <CheckboxFacet
          options={facets.transmissions}
          selected={current.transmission}
          onToggle={(v) =>
            toggleInArray(current.transmission, v, "transmission")
          }
        />
      </Accordion>

      <Accordion
        id="type"
        title="Vehicle type"
        open={open.type}
        onToggle={() => toggleSection("type")}
        icon="tag"
      >
        <CheckboxFacet
          options={facets.types}
          selected={current.type}
          onToggle={(v) => toggleInArray(current.type, v, "type")}
        />
      </Accordion>
    </aside>
  );
}

function CheckboxFacet({
  options,
  selected,
  onToggle,
}: {
  options: FilterOptionCount[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) {
    return <p className="inventory-facet-empty">No options</p>;
  }
  return (
    <ul className="inventory-checklist">
      {options.map((o) => (
        <li key={o.value}>
          <label className="inventory-check-row">
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={() => onToggle(o.value)}
            />
            <span>
              {o.label}{" "}
              <span className="inventory-count">
                ({o.count.toLocaleString("en-AU")})
              </span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function Accordion({
  id,
  title,
  open,
  onToggle,
  icon,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  icon: "list" | "palette" | "car" | "dollar" | "calendar" | "fuel" | "gear" | "tag";
  children: ReactNode;
}) {
  return (
    <div className={`inventory-accordion ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="inventory-accordion-trigger"
        aria-expanded={open}
        aria-controls={`acc-panel-${id}`}
        id={`acc-${id}`}
        onClick={onToggle}
      >
        <span className="inventory-accordion-icon" aria-hidden>
          <AccordionIcon name={icon} />
        </span>
        <span className="inventory-accordion-title">{title}</span>
        <span className="inventory-accordion-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div
          className="inventory-accordion-panel"
          id={`acc-panel-${id}`}
          role="region"
          aria-labelledby={`acc-${id}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function AccordionIcon({
  name,
}: {
  name: "list" | "palette" | "car" | "dollar" | "calendar" | "fuel" | "gear" | "tag";
}) {
  switch (name) {
    case "palette":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a9 9 0 100 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16a5 5 0 005-5c0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      );
    case "car":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-3.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
        </svg>
      );
    case "dollar":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
        </svg>
      );
    case "fuel":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5.21c0 1.09.89 1.99 1.99 1.99 1.1 0 2-.9 2-2V9.74c-.61.45-1.36.74-2.22.74-1.38 0-2.5-1.12-2.5-2.5 0-1.01.6-1.88 1.46-2.27zM6 5h5v5H6V5zm0 12v-5h5v5H6z" />
        </svg>
      );
    case "gear":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      );
    case "tag":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
        </svg>
      );
  }
}
