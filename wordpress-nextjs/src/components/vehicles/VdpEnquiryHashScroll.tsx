"use client";

import { useEffect } from "react";
import { openVdpForm } from "./VdpFormSheet";

/**
 * Handles `/cars/<slug>#enquire` from a stock card's Enquire button.
 *
 * The enquiry form exists twice — sidebar on desktop, inline on mobile — and
 * the hidden one cannot be scrolled to, so a plain anchor would work on one
 * breakpoint and silently do nothing on the other. This picks whichever copy
 * is actually rendered.
 */
export default function VdpEnquiryHashScroll() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash !== "#enquire" && hash !== "#test-drive") return;

    // One frame after mount the dynamic enquiry sections are in the DOM.
    const id = window.setTimeout(() => {
      // Same sheet the page's own Enquire button opens; scrolling to the
      // inline form is only the fallback now.
      if (openVdpForm(hash === "#test-drive" ? "test_drive" : "enquire")) return;
      const target =
        ["vehicle-enquiry", "vehicle-enquiry-mobile"]
          .map((elId) => document.getElementById(elId))
          .find((el) => el && el.offsetParent !== null) ?? null;
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      const input = target.querySelector<HTMLInputElement>("input, textarea");
      window.setTimeout(() => input?.focus({ preventScroll: true }), 450);
    }, 250);

    return () => window.clearTimeout(id);
  }, []);

  return null;
}
