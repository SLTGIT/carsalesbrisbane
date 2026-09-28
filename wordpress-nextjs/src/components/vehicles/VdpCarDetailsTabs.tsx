"use client";

import { useState } from "react";
import type {
  VehicleVdpAiFeatureItem,
  VehicleVdpAiSpecRow,
} from "@/lib/openai/vehicleVdpTypes";
import { biClass, fallbackIconForFeatureItem } from "@/lib/openai/vehicleVdpDisplayUtils";

type TabId = "overview" | "features" | "specifications";

function SpecGrid({ rows }: { rows: VehicleVdpAiSpecRow[] }) {
  if (!rows.length) {
    return <p className="cs-muted mb-0">No details available for this tab.</p>;
  }
  return (
    <dl className="vdp-ref-details-dl mb-0">
      {rows.map((row) => (
        <div key={row.label} className="vdp-ref-details-dl__row">
          <dt>{row.label}</dt>
          <dd className="cs-muted mb-0">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FeaturesGrid({ items }: { items: VehicleVdpAiFeatureItem[] }) {
  if (!items.length) {
    return <p className="cs-muted mb-0">No features listed for this vehicle.</p>;
  }
  return (
    <div className="row g-3">
      {items.map((it, i) => {
        const iconSuf = it.icon || fallbackIconForFeatureItem(it.label, it.value);
        return (
          <div key={`${it.label}-${i}`} className="col-md-6">
            <div className="cs-spec">
              <span className="cs-icon">
                <i className={biClass(iconSuf)} aria-hidden />
              </span>
              <div>
                <strong>{it.label}</strong>
                <div className="cs-muted">{it.value}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Everything on this page that is not straight from the dealer feed carries
 * this note, so a buyer can tell the record from compiled model research.
 */
/*
  AiSourceNote ("Compiled from model research, not supplied in the dealer
  listing. Confirm with the dealer before purchase.") is gone. The rows it
  labelled — model-research estimates — are no longer sent: the vehicle page
  filters to listing-sourced data on the server (see vdp-spec-filter.ts), so
  there is nothing left for the note to describe.
*/

export interface VdpCarDetailsTabsProps {
  overviewParagraphs: string[];
  carDetailsRows: VehicleVdpAiSpecRow[];
  featureItems: VehicleVdpAiFeatureItem[];
  engineTowingRows: VehicleVdpAiSpecRow[];
  /** Specification rows straight from the dealer feed — the authoritative set. */
  feedRows: VehicleVdpAiSpecRow[];
}

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "specifications", label: "Specifications" },
];

export default function VdpCarDetailsTabs({
  overviewParagraphs,
  carDetailsRows,
  featureItems,
  engineTowingRows,
  feedRows,
}: VdpCarDetailsTabsProps) {
  const [active, setActive] = useState<TabId>("overview");

  return (
    <section className="cs-card p-4 p-lg-5 mb-4 vdp-ref-car-details" id="car-details">
      <h2 className="h4 fw-bold mb-3">Car details</h2>
      <div
        className="vdp-ref-tabs-nav d-flex flex-wrap gap-2 gap-md-4 mb-4"
        role="tablist"
        aria-label="Car details sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`vdp-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`vdp-panel-${tab.id}`}
            className={`vdp-ref-tabs-nav__btn${active === tab.id ? " vdp-ref-tabs-nav__btn--active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="vdp-panel-overview"
        role="tabpanel"
        aria-labelledby="vdp-tab-overview"
        hidden={active !== "overview"}
      >
        {overviewParagraphs.map((p, i) => (
          <p
            key={i}
            className={`cs-muted ${i < overviewParagraphs.length - 1 ? "mb-3" : "mb-4"}`}
          >
            {p}
          </p>
        ))}
        <SpecGrid rows={carDetailsRows} />
      </div>

      <div
        id="vdp-panel-features"
        role="tabpanel"
        aria-labelledby="vdp-tab-features"
        hidden={active !== "features"}
      >
        <FeaturesGrid items={featureItems} />
      </div>

      <div
        id="vdp-panel-specifications"
        role="tabpanel"
        aria-labelledby="vdp-tab-specifications"
        hidden={active !== "specifications"}
      >
        <h3 className="vdp-ref-spec-subheading h6 fw-bold mb-2">
          From the dealer listing
        </h3>
        <SpecGrid rows={feedRows} />

        {engineTowingRows.length > 0 ? (
          <>
            <h3 className="vdp-ref-spec-subheading h6 fw-bold mt-4 mb-2">
              Additional details
            </h3>
            <SpecGrid rows={engineTowingRows} />
          </>
        ) : null}
      </div>
    </section>
  );
}
