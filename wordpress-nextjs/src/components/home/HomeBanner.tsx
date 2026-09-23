"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import "./HomeBanner.scss";

const AUTO_MS = 12000; // 12 seconds

type Slide = {
  id: string;
  indicatorLabel: string;
  title: string;
  subtitle?: string;
  lead: React.ReactNode;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Optional third action, styled like the secondary one. */
  tertiaryCta?: { label: string; href: string };
  imageSrc: string;
  imageAlt: string;
  /** object-position for cover crop (e.g. show lower part of asset) */
  imageObjectPosition?: string;
  cardTitle: string;
  cardSubtitle: string;
};

const SLIDES: Slide[] = [
  {
    id: "vehicles",
    indicatorLabel: "Used cars and delivery",
    title: "Quality Used Cars Across Brisbane & Queensland",
    lead: (
      <>
        Browse premium used 4x4s, SUVs, and commercial vehicles from our
        Ormiston yard. $0 deposit finance options for approved applicants and
        statewide delivery from Brisbane to Cairns—so the right car is never
        out of reach.
      </>
    ),
    // The primary button read "Book a Test Drive" but linked to the stock
    // search — it promised a booking and delivered a results page. The three
    // actions are now the stock / finance / trade journeys the brief names.
    primaryCta: { label: "View stock", href: "/search/car-sales-in-brisbane" },
    secondaryCta: { label: "Check finance eligibility", href: "/finance-centre" },
    tertiaryCta: { label: "Sell or trade", href: "/sell-my-car" },
    imageSrc:
      "https://admin.carsalesbrisbane.com.au/wp-content/uploads/2026/05/slider-img1.webp",
    imageAlt:
      "Quality used 4x4s and SUVs at Car Sales Brisbane, Ormiston",
    cardTitle: "Brisbane based, finance ready, statewide delivery.",
    cardSubtitle: "Car Sales Brisbane — search our stock online today.",
  },
  {
    id: "five-dollar",
    indicatorLabel: "Finance from $5 per day",
    title: "Cars From $5 Per Day On Approved Finance",
    // "Past problems, no problem" read as a promise of approval regardless of
    // credit history — a credit representation only the lender can make.
    subtitle: "Competitive rates · Past credit issues considered · ABN welcome",
    lead: (
      <>
        With over three decades of experience, our team packages repayments to
        suit your budget. Wide range of used vehicles, clear terms, and local
        support from enquiry to drive-away.
      </>
    ),
    primaryCta: { label: "Cars From $5 per day", href: "/finance-centre" },
    secondaryCta: { label: "Browse All Vehicles", href: "/search/car-sales-in-brisbane" },
    imageSrc:
      "https://admin.carsalesbrisbane.com.au/wp-content/uploads/2026/05/slider-img2.webp",
    imageAlt: "Car Sales Brisbane yard with used SUVs and finance options",
    cardTitle: "Low repayments, clear terms, local support.",
    cardSubtitle:
      "Friendly team, 30+ years — finance made straightforward.",
  },
  {
    id: "about-finance",
    indicatorLabel: "About us and finance",
    title: "Welcome To Car Sales Brisbane!",
    subtitle: "Best used cars & 4x4's in Brisbane & Redlands!",
    lead: (
      <>
        
        Car Sales Brisbane, proudly supported by Statewide Auto Group — quality
        used cars &amp; 4x4&apos;s in Brisbane &amp; Redlands. Wide range, low finance rates, ABN welcome.
        Friendly team, 30+ years — here to help you buy or sell with confidence.
      </>
    ),
    primaryCta: { label: "Get finance quickly", href: "/finance-centre" },
    secondaryCta: { label: "About us", href: "/about-us" },
    imageSrc:
      "https://admin.carsalesbrisbane.com.au/wp-content/uploads/2026/05/slider-img3.webp",
    imageAlt:
      "Car Sales Brisbane — used cars, finance, and customer service",
    cardTitle: "Local yard, customer-first service.",
    cardSubtitle: "Finance ready — contact us anytime.",
  },
];

export default function HomeBanner() {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduceMotionRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    const onChange = () => {
      reduceMotionRef.current = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    clearTimer();
    if (reduceMotionRef.current) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_MS);
    return clearTimer;
  }, [index, clearTimer]);

  const slide = SLIDES[index];

  return (
    <section
      className="cs-hero py-5 text-body"
      aria-roledescription="carousel"
      aria-label="Featured highlights"
    >
      <div className="container py-lg-4">
        <div className="row g-4 align-items-center">
          <div className="col-lg-7">
            <div aria-live="polite">
              <h1 className="display-4 fw-bold mb-3 cs-title-tight">
                {slide.title}
              </h1>
              {slide.subtitle ? (
                <p className="lead fw-semibold text-dark mb-2">
                  {slide.subtitle}
                </p>
              ) : null}
              <div className="lead text-secondary mb-4">{slide.lead}</div>
              <div className="d-flex flex-wrap gap-3 mb-3">
                <a
                  className="btn btn-primary btn-lg cs-pill fw-semibold cs-cta-strong"
                  href={slide.primaryCta.href}
                >
                  {slide.primaryCta.label}
                </a>
                {slide.secondaryCta ? (
                  <a
                    className="btn btn-outline-primary btn-lg cs-pill cs-cta-strong"
                    href={slide.secondaryCta.href}
                  >
                    {slide.secondaryCta.label}
                  </a>
                ) : null}
                {slide.tertiaryCta ? (
                  <a
                    className="btn btn-outline-primary btn-lg cs-pill cs-cta-strong"
                    href={slide.tertiaryCta.href}
                  >
                    {slide.tertiaryCta.label}
                  </a>
                ) : null}
              </div>
            </div>
            <div
              className="cs-hero-indicators"
              role="group"
              aria-label="Choose hero slide"
            >
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`cs-hero-ind${i === index ? " cs-hero-ind--active" : ""}`}
                  aria-label={`Show: ${s.indicatorLabel}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => {
                    clearTimer();
                    setIndex(i);
                  }}
                >
                  <span className="cs-hero-ind-track" aria-hidden />
                </button>
              ))}
            </div>
          </div>
          <div className="col-lg-5">
            <article
              className="card border-0 shadow-lg rounded-5 overflow-hidden"
              aria-label={`${slide.cardTitle} ${slide.cardSubtitle}`}
            >
              <div className="position-relative cs-hero-card-img-wrap">
                {SLIDES.map((s, i) => (
                  <Image
                    key={s.id}
                    src={s.imageSrc}
                    alt={i === index ? s.imageAlt : ""}
                    fill
                    sizes="(max-width: 991px) 100vw, 420px"
                    className={`object-fit-cover cs-hero-card-img cs-hero-card-img-layer${i === index ? " cs-hero-card-img-layer--on" : ""}`}
                    style={
                      s.imageObjectPosition
                        ? { objectPosition: s.imageObjectPosition }
                        : undefined
                    }
                    aria-hidden={i !== index}
                    priority={i === 0}
                  />
                ))}
              </div>
              <div className="card-body p-4">
                <h2 className="h4 fw-bold text-dark mb-2">{slide.cardTitle}</h2>
                <p className="text-secondary mb-0">{slide.cardSubtitle}</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
