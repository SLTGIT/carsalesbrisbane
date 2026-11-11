"use client";

import { VehicleImage } from "@/types/vehicle";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useClientMounted } from "@/hooks/useClientMounted";

const AUTOPLAY_INTERVAL_MS = 5000;
const PAUSE_AFTER_MANUAL_MS = 12000;
/** First N slots in the grid; remainder summarized on the count card (reference layout). */
const GRID_THUMB_MAX = 7;
/** Cap lightbox thumb strip to avoid dozens of parallel image requests. */
const LIGHTBOX_THUMB_MAX = 12;

function shouldEnableGalleryAutoplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return window.matchMedia("(min-width: 992px)").matches;
}

function Chevron({ dir }: { dir: "prev" | "next" }) {
  const d = dir === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface VehicleGalleryProps {
  featuredImage: string;
  galleryImages: VehicleImage[];
  title: string;
}

export default function VehicleGallery({
  featuredImage,
  galleryImages,
  title,
}: VehicleGalleryProps) {
  const allImages = [
    { url: featuredImage, alt: title },
    ...galleryImages.map((img) => ({ url: img.large, alt: img.alt || title })),
  ].filter((img) => img.url);

  const mounted = useClientMounted();
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const pointerInsideRef = useRef(false);
  const resumeAutoplayAtRef = useRef(0);
  const autoplayEnabledRef = useRef(false);

  const bumpManualPause = useCallback(() => {
    resumeAutoplayAtRef.current = Date.now() + PAUSE_AFTER_MANUAL_MS;
  }, []);

  const selectedImage = allImages[index]?.url ?? "";

  const showMorePhotosCard = allImages.length > GRID_THUMB_MAX;
  /** Behind the count: a peek at the next few photos beats an empty white tile. */
  const morePreviewImages = allImages.slice(
    GRID_THUMB_MAX,
    GRID_THUMB_MAX + 4,
  );
  const gridPreviewImages = showMorePhotosCard
    ? allImages.slice(0, GRID_THUMB_MAX)
    : allImages;

  const lightboxThumbStart =
    allImages.length <= LIGHTBOX_THUMB_MAX
      ? 0
      : Math.max(
          0,
          Math.min(
            index - Math.floor(LIGHTBOX_THUMB_MAX / 2),
            allImages.length - LIGHTBOX_THUMB_MAX,
          ),
        );
  const lightboxThumbImages = allImages.slice(
    lightboxThumbStart,
    lightboxThumbStart + LIGHTBOX_THUMB_MAX,
  );

  const go = useCallback(
    (dir: -1 | 1) => {
      if (allImages.length === 0) return;
      setIndex((i) => {
        const next = i + dir;
        if (next < 0) return allImages.length - 1;
        if (next >= allImages.length) return 0;
        return next;
      });
    },
    [allImages.length]
  );

  const goTo = useCallback((i: number) => {
    if (allImages.length === 0) return;
    const n = ((i % allImages.length) + allImages.length) % allImages.length;
    setIndex(n);
  }, [allImages.length]);

  const openLightboxAt = useCallback(
    (i: number) => {
      bumpManualPause();
      goTo(i);
      setLightboxOpen(true);
    },
    [bumpManualPause, goTo],
  );

  useEffect(() => {
    autoplayEnabledRef.current = shouldEnableGalleryAutoplay();
  }, []);

  useEffect(() => {
    if (!autoplayEnabledRef.current || allImages.length < 2 || lightboxOpen) {
      return;
    }

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (pointerInsideRef.current) return;
      if (Date.now() < resumeAutoplayAtRef.current) return;
      go(1);
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [allImages.length, lightboxOpen, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === "Escape") {
          setLightboxOpen(false);
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          bumpManualPause();
          go(-1);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          bumpManualPause();
          go(1);
          return;
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        bumpManualPause();
        go(-1);
      }
      if (e.key === "ArrowRight") {
        bumpManualPause();
        go(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, lightboxOpen, bumpManualPause]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (index >= allImages.length) setIndex(0);
  }, [allImages.length, index]);

  return (
    <div
      className="vehicle-gallery vehicle-gallery--vdp"
      onMouseEnter={() => {
        pointerInsideRef.current = true;
      }}
      onMouseLeave={() => {
        pointerInsideRef.current = false;
      }}
      onFocusCapture={() => {
        pointerInsideRef.current = true;
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          pointerInsideRef.current = false;
        }
      }}
    >
      <div className="vehicle-gallery__stage-wrap">
        <div className="vehicle-gallery__stage">
          <button
            type="button"
            className="vehicle-gallery__stage-hit"
            aria-label="Open full-screen gallery"
            onClick={() => setLightboxOpen(true)}
          />
          {selectedImage ? (
            <Image
              key={selectedImage}
              src={selectedImage}
              alt={`${title} — photo ${index + 1} of ${allImages.length}`}
              fill
              className="vehicle-gallery__stage-img"
              sizes="(max-width: 575px) 100vw, (max-width: 991px) 92vw, 58vw"
              priority={index === 0}
              fetchPriority={index === 0 ? "high" : "auto"}
              loading={index === 0 ? "eager" : "lazy"}
              quality={index === 0 ? 82 : 75}
            />
          ) : (
            <div className="vehicle-gallery__placeholder">
              <span>No image available</span>
            </div>
          )}

          <button
            type="button"
            className="vehicle-gallery__zoom"
            aria-label="Open full-screen preview"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </button>

          {allImages.length > 1 ? (
            <>
              <button
                type="button"
                className="vehicle-gallery__arrow vehicle-gallery__arrow--prev"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  bumpManualPause();
                  go(-1);
                }}
              >
                <Chevron dir="prev" />
              </button>
              <button
                type="button"
                className="vehicle-gallery__arrow vehicle-gallery__arrow--next"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  bumpManualPause();
                  go(1);
                }}
              >
                <Chevron dir="next" />
              </button>
            </>
          ) : null}

          {/* {allImages.length > 1 ? (
            <div
              className="vehicle-gallery__dots"
              role="group"
              aria-label="Slide indicators"
            >
              {allImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-current={index === i ? "true" : undefined}
                  aria-label={`Photo ${i + 1} of ${allImages.length}`}
                  className={`vehicle-gallery__dot ${index === i ? "is-active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    bumpManualPause();
                    goTo(i);
                  }}
                >
                  <span className="vehicle-gallery__dot-indicator" aria-hidden />
                </button>
              ))}
            </div>
          ) : null} */}
        </div>
      </div>

      {allImages.length > 1 && (
        <div
          className="vehicle-gallery__thumb-grid"
          role="group"
          aria-label="Gallery thumbnails"
        >
          {gridPreviewImages.map((image, i) => (
            <button
              key={`${image.url}-${i}`}
              type="button"
              aria-current={index === i ? "true" : undefined}
              aria-label={`View photo ${i + 1} of ${allImages.length} in gallery`}
              className={`vehicle-gallery__grid-thumb ${index === i ? "is-active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                openLightboxAt(i);
              }}
            >
              <span className="vehicle-gallery__grid-thumb-frame">
                <Image
                  src={image.url}
                  alt=""
                  fill
                  className="vehicle-gallery__grid-thumb-img"
                  sizes="(max-width: 576px) 22vw, 12vw"
                  loading={i === 0 ? "eager" : "lazy"}
                  quality={70}
                />
              </span>
            </button>
          ))}
          {showMorePhotosCard ? (
            <button
              type="button"
              className="vehicle-gallery__grid-more"
              aria-label={`View all ${allImages.length} photos in gallery`}
              onClick={(e) => {
                e.stopPropagation();
                openLightboxAt(GRID_THUMB_MAX);
              }}
            >
              <span className="vehicle-gallery__grid-more-mosaic" aria-hidden>
                {morePreviewImages.map((image, i) => (
                  <span
                    key={`more-${image.url}-${i}`}
                    className="vehicle-gallery__grid-more-cell"
                  >
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      className="vehicle-gallery__grid-more-img"
                      sizes="6vw"
                      loading="lazy"
                      quality={40}
                    />
                  </span>
                ))}
              </span>
              <span className="vehicle-gallery__grid-more-text">
                +{allImages.length - GRID_THUMB_MAX} more
              </span>
            </button>
          ) : null}
        </div>
      )}

      {mounted && lightboxOpen && selectedImage
        ? createPortal(
            <div
              className="vehicle-gallery__lightbox"
              onClick={() => setLightboxOpen(false)}
              role="presentation"
            >
              <div
                className="vehicle-gallery__lightbox-inner"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={`Gallery: ${title}`}
              >
                <header className="vehicle-gallery__lightbox-toolbar">
                  <div className="vehicle-gallery__lightbox-toolbar-text">
                    <p className="vehicle-gallery__lightbox-title">{title}</p>
                    <p className="vehicle-gallery__lightbox-counter" aria-live="polite">
                      {index + 1} / {allImages.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="vehicle-gallery__lightbox-close"
                    onClick={() => setLightboxOpen(false)}
                    aria-label="Close gallery"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </header>

                <div className="vehicle-gallery__lightbox-stage">
                  {allImages.length > 1 ? (
                    <button
                      type="button"
                      className="vehicle-gallery__lightbox-arrow vehicle-gallery__lightbox-arrow--prev"
                      aria-label="Previous image"
                      onClick={(e) => {
                        e.stopPropagation();
                        bumpManualPause();
                        go(-1);
                      }}
                    >
                      <Chevron dir="prev" />
                    </button>
                  ) : null}
                  <div className="vehicle-gallery__lightbox-frame">
                    <Image
                      key={`lb-${selectedImage}`}
                      src={selectedImage}
                      alt={`${title} — ${index + 1} of ${allImages.length}`}
                      width={1200}
                      height={900}
                      className="vehicle-gallery__lightbox-img"
                    />
                  </div>
                  {allImages.length > 1 ? (
                    <button
                      type="button"
                      className="vehicle-gallery__lightbox-arrow vehicle-gallery__lightbox-arrow--next"
                      aria-label="Next image"
                      onClick={(e) => {
                        e.stopPropagation();
                        bumpManualPause();
                        go(1);
                      }}
                    >
                      <Chevron dir="next" />
                    </button>
                  ) : null}
                </div>

                {allImages.length > 1 ? (
                  <div
                    className="vehicle-gallery__lightbox-thumbs"
                    role="group"
                    aria-label="Select photo"
                  >
                    {lightboxThumbImages.map((image, offset) => {
                      const i = lightboxThumbStart + offset;
                      return (
                      <button
                        key={`lb-t-${image.url}-${i}`}
                        type="button"
                        className={`vehicle-gallery__lightbox-thumb ${index === i ? "is-active" : ""}`}
                        aria-current={index === i ? "true" : undefined}
                        aria-label={`Photo ${i + 1} of ${allImages.length}`}
                        onClick={() => {
                          bumpManualPause();
                          goTo(i);
                        }}
                      >
                        <Image
                          src={image.url}
                          alt=""
                          width={112}
                          height={84}
                          className="vehicle-gallery__lightbox-thumb-img"
                          loading="lazy"
                          quality={65}
                        />
                      </button>
                    );
                    })}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
