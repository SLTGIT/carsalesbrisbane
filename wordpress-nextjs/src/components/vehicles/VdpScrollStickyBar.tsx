"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const DEFAULT_HEADER_OFFSET_PX = 112;

function readSiteHeaderOffsetPx(): number {
  if (typeof document === "undefined") return DEFAULT_HEADER_OFFSET_PX;
  const header = document.querySelector<HTMLElement>(".cs-header");
  if (!header) return DEFAULT_HEADER_OFFSET_PX;
  return Math.max(Math.ceil(header.getBoundingClientRect().height), 56);
}

export interface VdpScrollStickyBarProps {
  headline: string;
  /**
   * Same two-line split the vehicle card and the h1 use: "2016 Toyota
   * Landcruiser Prado" on top, "GXL GDJ150R" underneath. Falls back to the
   * single-line headline when the split is unavailable.
   */
  titlePrimary?: string;
  titleVariant?: string;
  priceMain: string;
  priceCaption: string;
  vehicleImage?: string;
  imageAlt?: string;
}

export default function VdpScrollStickyBar({
  headline,
  titlePrimary = "",
  titleVariant = "",
  priceMain,
  priceCaption,
  vehicleImage,
  imageAlt,
}: VdpScrollStickyBarProps) {
  const [visible, setVisible] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(DEFAULT_HEADER_OFFSET_PX);

  useEffect(() => {
    const syncOffset = () => {
      const px = readSiteHeaderOffsetPx();
      setHeaderOffset(px);
      document.documentElement.style.setProperty("--vdp-sticky-top", `${px}px`);
    };

    syncOffset();
    window.addEventListener("resize", syncOffset);

    const header = document.querySelector<HTMLElement>(".cs-header");
    let ro: ResizeObserver | null = null;
    if (header && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(syncOffset);
      ro.observe(header);
    }

    return () => {
      window.removeEventListener("resize", syncOffset);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    const pageHeader = document.querySelector("[data-vdp-page-header]");
    if (!pageHeader) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: `-${headerOffset}px 0px 0px 0px`,
        threshold: 0,
      }
    );
    observer.observe(pageHeader);
    return () => observer.disconnect();
  }, [headerOffset]);

  return (
    <div
      className={`vdp-ref-sticky-bar${visible ? " vdp-ref-sticky-bar--visible" : ""}`}
      aria-hidden={!visible}
    >
      <div className="container vdp-ref-sticky-bar__inner py-2">
        {vehicleImage ? (
          <div className="vdp-ref-sticky-bar__thumb flex-shrink-0">
            <Image
              src={vehicleImage}
              alt={imageAlt || headline}
              width={88}
              height={66}
              className="vdp-ref-sticky-bar__img"
              sizes="(max-width: 575px) 56px, 88px"
              loading="lazy"
              quality={70}
            />
          </div>
        ) : null}
        <div className="vdp-ref-sticky-bar__title min-w-0 flex-grow-1">
          <p className="vdp-ref-sticky-bar__name mb-0 fw-bold">
            {titlePrimary || headline}
          </p>
          {titleVariant ? (
            <p className="vdp-ref-sticky-bar__variant mb-0">{titleVariant}</p>
          ) : null}
        </div>
        <div className="vdp-ref-sticky-bar__price flex-shrink-0">
          <div className="vdp-ref-sticky-bar__amount fw-bold">{priceMain || "—"}</div>
          <p className="vdp-ref-sticky-bar__caption mb-0 small text-secondary">
            {priceCaption}
          </p>
        </div>
      </div>
    </div>
  );
}
