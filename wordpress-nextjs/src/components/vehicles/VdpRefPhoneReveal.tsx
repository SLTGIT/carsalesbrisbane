"use client";

import { trackVdpPhoneClick } from "@/lib/analytics/vdp";
import { useCallback } from "react";

export type VdpRefPhoneRevealProps = {
  dealerPhone: string;
  telHref: string;
  stockNumber: string;
  make?: string;
  model?: string;
  year?: string | number;
  slug?: string;
  /** When true (default), top border separates phone from content above (sidebar card). */
  showDivider?: boolean;
  className?: string;
};

/**
 * The dealer phone number, shown in full.
 *
 * This used to mask the number ("0728 *** ***") behind a "Click to reveal"
 * button, so calling took two taps and the number could not be read at a
 * glance. Every tap that was spent revealing the number is a call that may
 * never have been placed, so the number is now a plain `tel:` link and the
 * click is what gets tracked. The component name and props are unchanged so
 * the call sites do not have to move.
 */
export default function VdpRefPhoneReveal({
  dealerPhone,
  telHref,
  stockNumber,
  make = "",
  model = "",
  year = "",
  slug,
  showDivider = true,
  className,
}: VdpRefPhoneRevealProps) {
  const onCall = useCallback(() => {
    trackVdpPhoneClick({ stockNumber, make, model, year, slug });
  }, [stockNumber, make, model, year, slug]);

  if (!dealerPhone.trim() || !telHref.trim()) {
    return null;
  }

  const rootClass = [
    "vdp-ref-phone-inline",
    showDivider ? "vdp-ref-phone-inline--ruled" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <p className="vdp-ref-phone-hint mb-2">Call the dealer</p>
      <a
        href={telHref}
        onClick={onCall}
        className="vdp-ref-phone-row vdp-ref-phone-number vdp-ref-phone-number--link d-flex align-items-center justify-content-between gap-3 text-decoration-none"
      >
        <span>{dealerPhone.trim()}</span>
        <i
          className="bi bi-telephone-fill vdp-ref-phone-icon flex-shrink-0"
          aria-hidden
        />
      </a>
    </div>
  );
}
