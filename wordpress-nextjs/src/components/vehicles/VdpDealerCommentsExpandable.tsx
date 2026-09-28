"use client";

import { useId, useMemo, useState } from "react";

const COLLAPSED_MAX_PX = 220;

export default function VdpDealerCommentsExpandable({
  paragraphs,
  featureBullets = [],
}: {
  paragraphs: string[];
  featureBullets?: string[];
}) {
  const visibleParagraphs = useMemo(
    () => paragraphs.map((p) => p.trim()).filter(Boolean),
    [paragraphs]
  );
  const visibleBullets = useMemo(
    () => featureBullets.map((b) => b.trim()).filter(Boolean),
    [featureBullets]
  );
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();

  if (!visibleParagraphs.length && !visibleBullets.length) return null;

  const fullText = [...visibleParagraphs, ...visibleBullets].join("\n");
  const isLong =
    fullText.length > 480 ||
    visibleParagraphs.length > 4 ||
    visibleBullets.length > 8;

  return (
    <section className="cs-card p-4 p-lg-5 mb-4 vdp-ref-dealer-comments">
      <h2 className="h4 fw-bold mb-2">Comments from the dealer</h2>
      {/*
        Previously two notes: "Confirm all details with the dealer before
        purchase" and "Generated with AI from seller comments". The first asked
        buyers to verify the advert's own claims; the second told them a
        machine wrote it. The text is the dealer's listing notes, tidied for
        reading, and says so.
      */}
      <p className="vdp-ref-dealer-comments-note cs-muted small mb-3">
        From our listing notes for this vehicle.
      </p>
      <div
        id={bodyId}
        className={`vdp-ref-dealer-comments__body${expanded || !isLong ? "" : " vdp-ref-dealer-comments__body--collapsed"}`}
        style={
          expanded || !isLong
            ? undefined
            : { maxHeight: `${COLLAPSED_MAX_PX}px` }
        }
      >
        {visibleParagraphs.map((paragraph, i) => (
          <p
            key={`p-${i}`}
            className={`cs-muted vdp-ref-dealer-comments__para${i === 0 ? " vdp-ref-dealer-comments__para--lead" : ""} ${i < visibleParagraphs.length - 1 || visibleBullets.length ? "mb-3" : "mb-0"}`}
          >
            {paragraph}
          </p>
        ))}
        {visibleBullets.length > 0 ? (
          <ul
            className="dealer-comments__features vdp-ref-dealer-comments__features mb-0"
            aria-label="Features mentioned by the dealer"
          >
            {visibleBullets.map((item, i) => (
              <li key={`b-${i}`}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {isLong ? (
        <button
          type="button"
          className="btn btn-link vdp-ref-dealer-comments__toggle px-0 mt-2"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </section>
  );
}
