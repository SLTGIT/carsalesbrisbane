"use client";

import Link from "next/link";
import { useCallback } from "react";
import GoogleRatingStars from "@/components/GoogleRatingStars";
import {
  trackVdpCtaClick,
  trackVdpPhoneClick,
  type VdpAnalyticsContext,
} from "@/lib/analytics/vdp";
import { openVdpForm } from "./VdpFormSheet";

export type VdpPrimaryActionsProps = {
  ctx: VdpAnalyticsContext;
  telHref: string;
  dealerPhone: string;
  /** Google rating, when WordPress returned one. Hidden entirely if absent. */
  ratingScore?: number;
  ratingCount?: number;
  className?: string;
};

/**
 * The buying decision, before any long-form copy.
 *
 * Every action a visitor might want at the top of a vehicle page: enquire,
 * test drive, call, value a trade-in and check finance. Previously the first
 * action on mobile sat roughly two screens below the fold and the phone number
 * around seven, so the page asked people to scroll through AI copy and
 * specifications before it offered them anything to do.
 */
export default function VdpPrimaryActions({
  ctx,
  telHref,
  dealerPhone,
  ratingScore,
  ratingCount,
  className,
}: VdpPrimaryActionsProps) {
  /**
   * The enquiry form is rendered twice — once in the desktop sidebar, once
   * inline for mobile — and only one of them is visible at a time. Jump to
   * whichever one is actually on screen rather than guessing from a breakpoint.
   */
  const onEnquire = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      trackVdpCtaClick(ctx, "enquire", "vdp_primary");
      if (openVdpForm("enquire")) {
        event.preventDefault();
        return;
      }
      const target =
        ["vehicle-enquiry", "vehicle-enquiry-mobile"]
          .map((id) => document.getElementById(id))
          .find((el) => el && el.offsetParent !== null) ?? null;
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        const input = target.querySelector<HTMLInputElement>("input, textarea");
        window.setTimeout(() => input?.focus({ preventScroll: true }), 450);
      }
    },
    [ctx],
  );

  const showRating =
    typeof ratingScore === "number" &&
    ratingScore > 0 &&
    typeof ratingCount === "number" &&
    ratingCount > 0;

  return (
    <div className={["vdp-ref-actions", className].filter(Boolean).join(" ")}>
      <div className="vdp-ref-actions__grid">
        <a
          href="#vehicle-enquiry"
          onClick={onEnquire}
          className="vdp-ref-action vdp-ref-action--primary"
        >
          <i className="bi bi-chat-left-text-fill" aria-hidden />
          Enquire now
        </a>
        <a
          href="#schedule-test-drive"
          onClick={(e) => {
            trackVdpCtaClick(ctx, "test_drive", "vdp_primary");
            if (openVdpForm("test_drive")) e.preventDefault();
          }}
          className="vdp-ref-action vdp-ref-action--primary"
        >
          <i className="bi bi-calendar-check-fill" aria-hidden />
          Book a test drive
        </a>
        <a
          href={telHref}
          onClick={() => {
            trackVdpCtaClick(ctx, "call", "vdp_primary");
            trackVdpPhoneClick(ctx);
          }}
          className="vdp-ref-action"
          aria-label={`Call Statewide Auto Group on ${dealerPhone}`}
        >
          <i className="bi bi-telephone-fill" aria-hidden />
          Call now
        </a>
        <Link
          href="/sell-my-car"
          onClick={() => trackVdpCtaClick(ctx, "value_trade", "vdp_primary")}
          className="vdp-ref-action"
        >
          <i className="bi bi-arrow-left-right" aria-hidden />
          Value my trade-in
        </Link>
        <a
          href="#request-video"
          onClick={(e) => {
            trackVdpCtaClick(ctx, "request_video", "vdp_primary");
            if (openVdpForm("video")) e.preventDefault();
          }}
          className="vdp-ref-action"
        >
          <i className="bi bi-camera-video-fill" aria-hidden />
          Request video
        </a>
        <Link
          href="/finance-centre"
          onClick={() => trackVdpCtaClick(ctx, "finance", "vdp_primary")}
          className="vdp-ref-action vdp-ref-action--wide"
        >
          <i className="bi bi-calculator-fill" aria-hidden />
          Check finance options
        </Link>
      </div>

      {/*
        Buy with confidence — Car Sales Brisbane's version.

        The client brief asks for the Statewide Auto Group relationship to be
        presented deliberately rather than stumbled on, so it leads the block,
        worded the same way as everywhere else on the site. Every other line is
        something the business already states publicly. Inspection, PPSR and
        warranty claims are deliberately absent until the business confirms
        they hold for every vehicle.
      */}
      <div className="vdp-ref-actions__confidence-wrap">
        <p className="vdp-ref-actions__confidence-title">Buy with confidence</p>
        <ul className="vdp-ref-actions__confidence">
          <li>
            <i className="bi bi-shield-check" aria-hidden /> Car Sales Brisbane,
            proudly supported by Statewide Auto Group
          </li>
          <li>
            <i className="bi bi-shop" aria-hidden /> Inspect it at the Ormiston
            yard before you buy
          </li>
          <li>
            <i className="bi bi-cash-coin" aria-hidden /> Finance available,
            subject to approval
          </li>
          <li>
            <i className="bi bi-arrow-left-right" aria-hidden /> Trade-ins valued
            with your purchase
          </li>
          <li>
            <i className="bi bi-truck" aria-hidden /> Delivery across Queensland
          </li>
        </ul>
      </div>

      {showRating ? (
        <p className="vdp-ref-actions__trust mb-0">
          <GoogleRatingStars score={ratingScore} className="vdp-ref-actions__stars" />
          <span>
            <strong>{ratingScore.toFixed(1)}</strong> from{" "}
            {ratingCount.toLocaleString("en-AU")} Google reviews
          </span>
        </p>
      ) : null}
    </div>
  );
}
