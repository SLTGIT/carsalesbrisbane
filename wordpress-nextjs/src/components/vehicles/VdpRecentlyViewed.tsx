"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ViewedVehicle = {
  slug: string;
  title: string;
  image: string;
};

const STORAGE_KEY = "cs-recently-viewed";
const MAX_STORED = 8;
const MAX_SHOWN = 4;

function readViewed(): ViewedVehicle[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (v): v is ViewedVehicle =>
            typeof v === "object" &&
            v !== null &&
            typeof (v as ViewedVehicle).slug === "string" &&
            typeof (v as ViewedVehicle).title === "string",
        )
      : [];
  } catch {
    // Private mode or blocked storage: the strip simply does not appear.
    return [];
  }
}

/**
 * Vehicles this visitor looked at before, so a shopper comparing a few cars
 * can get back to them without searching again.
 *
 * Stored only in the visitor's own browser. The price is deliberately not
 * stored or shown: it would be whatever the price was on the day they looked,
 * and displaying a stale price for a car is a misleading-pricing problem
 * under Australian Consumer Law. The vehicle page they click through to shows
 * the current price. A car that has since sold lands on the "no longer
 * listed" page, which offers similar stock.
 */
export default function VdpRecentlyViewed({ current }: { current: ViewedVehicle }) {
  const [others, setOthers] = useState<ViewedVehicle[]>([]);
  const { slug, title, image } = current;

  useEffect(() => {
    const entry: ViewedVehicle = { slug, title, image };
    const previous = readViewed().filter((v) => v.slug !== slug);
    setOthers(previous.slice(0, MAX_SHOWN));
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([entry, ...previous].slice(0, MAX_STORED)),
      );
    } catch {
      /* storage unavailable */
    }
  }, [slug, title, image]);

  if (others.length === 0) return null;

  return (
    <section className="cs-card p-4 p-lg-5 mt-4 vdp-ref-recent" aria-labelledby="vdp-recent-title">
      <h2 id="vdp-recent-title" className="h5 fw-bold mb-3">
        Recently viewed
      </h2>
      <ul className="vdp-ref-recent__list">
        {others.map((v) => (
          <li key={v.slug}>
            <Link href={`/cars/${v.slug}`} className="vdp-ref-recent__item">
              {v.image ? (
                // Feed photos come from a third-party host; a plain img keeps
                // this off the image optimiser for a small thumbnail.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.image} alt="" loading="lazy" width={96} height={64} />
              ) : (
                <span className="vdp-ref-recent__noimg" aria-hidden />
              )}
              <span className="vdp-ref-recent__title">{v.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
