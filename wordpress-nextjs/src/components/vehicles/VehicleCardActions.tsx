"use client";

import Link from "next/link";
import { trackVdpCtaClick, trackVdpPhoneClick } from "@/lib/analytics/vdp";

export type VehicleCardActionsProps = {
  /** VDP path for this listing, e.g. `/cars/used-white-2021-ford-ranger-00102761`. */
  href: string;
  telHref: string;
  stockNumber: string;
  make: string;
  model: string;
  year: string | number;
  slug: string;
};

/**
 * Enquire, Call and Book a test drive, on the stock card itself.
 *
 * A card used to offer "Calculate financing" and "View details" only, so the
 * shortest path from browsing to contacting the dealership was a page load
 * followed by a scroll. `#enquire` and `#test-drive` are handled on the vehicle
 * page by VdpEnquiryHashScroll, which opens the matching form sheet.
 */
export default function VehicleCardActions({
  href,
  telHref,
  stockNumber,
  make,
  model,
  year,
  slug,
}: VehicleCardActionsProps) {
  const ctx = { stockNumber, make, model, year, slug };

  return (
    <div className="inventory-card-actions">
      <Link
        href={`${href}#enquire`}
        className="inventory-card-action inventory-card-action--primary"
        onClick={() => trackVdpCtaClick(ctx, "enquire", "stock_card")}
      >
        <i className="bi bi-chat-left-text-fill" aria-hidden />
        Enquire
      </Link>
      <a
        href={telHref}
        className="inventory-card-action"
        onClick={() => {
          trackVdpCtaClick(ctx, "call", "stock_card");
          trackVdpPhoneClick(ctx);
        }}
      >
        <i className="bi bi-telephone-fill" aria-hidden />
        Call
      </a>
      <Link
        href={`${href}#test-drive`}
        className="inventory-card-action inventory-card-action--wide"
        onClick={() => trackVdpCtaClick(ctx, "test_drive", "stock_card")}
      >
        <i className="bi bi-calendar-check-fill" aria-hidden />
        Book a test drive
      </Link>
      {/* Regional buyers need to know before they click through that the
          car can come to them — the brief asked for this on stock, not only
          on the vehicle page. */}
      <p className="inventory-card-delivery">
        <i className="bi bi-truck" aria-hidden /> Delivery across Queensland
      </p>
    </div>
  );
}
