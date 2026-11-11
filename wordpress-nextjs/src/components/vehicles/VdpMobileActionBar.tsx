"use client";

import { useCallback } from "react";
import {
  trackVdpCtaClick,
  trackVdpPhoneClick,
  type VdpAnalyticsContext,
} from "@/lib/analytics/vdp";
import { openVdpForm, type VdpFormKind } from "./VdpFormSheet";

export type VdpMobileActionBarProps = {
  ctx: VdpAnalyticsContext;
  telHref: string;
};

/**
 * Call / Enquire / Test drive, fixed to the bottom of the viewport on phones.
 *
 * The page is over 9,000px tall on a phone, so without this a visitor who is
 * halfway down it has no way to act without scrolling back up or all the way
 * down. Hidden from `lg` up, where the sidebar already keeps the phone number
 * and enquiry form in view.
 */
export default function VdpMobileActionBar({
  ctx,
  telHref,
}: VdpMobileActionBarProps) {
  const jumpTo = useCallback(
    (ids: string[], cta: "enquire" | "test_drive") =>
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        trackVdpCtaClick(ctx, cta, "vdp_sticky");
        const kind: VdpFormKind = cta === "enquire" ? "enquire" : "test_drive";
        if (openVdpForm(kind)) {
          event.preventDefault();
          return;
        }
        const target =
          ids
            .map((id) => document.getElementById(id))
            .find((el) => el && el.offsetParent !== null) ?? null;
        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    [ctx],
  );

  return (
    <div className="vdp-ref-action-bar d-lg-none" role="group" aria-label="Contact Statewide Auto Group">
      <a
        href={telHref}
        className="vdp-ref-action-bar__btn"
        onClick={() => {
          trackVdpCtaClick(ctx, "call", "vdp_sticky");
          trackVdpPhoneClick(ctx);
        }}
      >
        <i className="bi bi-telephone-fill" aria-hidden />
        Call
      </a>
      <a
        href="#vehicle-enquiry-mobile"
        className="vdp-ref-action-bar__btn vdp-ref-action-bar__btn--primary"
        onClick={jumpTo(["vehicle-enquiry-mobile", "vehicle-enquiry"], "enquire")}
      >
        <i className="bi bi-chat-left-text-fill" aria-hidden />
        Enquire
      </a>
      <a
        href="#schedule-test-drive"
        className="vdp-ref-action-bar__btn"
        onClick={jumpTo(["schedule-test-drive"], "test_drive")}
      >
        <i className="bi bi-calendar-check-fill" aria-hidden />
        Test drive
      </a>
    </div>
  );
}
