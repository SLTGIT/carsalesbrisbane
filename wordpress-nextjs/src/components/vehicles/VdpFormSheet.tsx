"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import VehicleEnquiryForm, {
  type VehicleEnquiryItemPayload,
} from "./VehicleEnquiryForm";
import VehicleTestDriveForm from "./VehicleTestDriveForm";

export type VdpFormKind = "enquire" | "test_drive" | "video";

const OPEN_EVENT = "vdp:open-form";

/**
 * Open the vehicle form sheet from anywhere on the page. Returns false when no
 * sheet is mounted, so callers can fall back to scrolling to the inline form.
 */
export function openVdpForm(kind: VdpFormKind): boolean {
  if (typeof window === "undefined") return false;
  if (!(window as WindowWithSheet).__vdpFormSheetReady) return false;
  window.dispatchEvent(new CustomEvent<VdpFormKind>(OPEN_EVENT, { detail: kind }));
  return true;
}

type WindowWithSheet = Window & { __vdpFormSheetReady?: boolean };

const TITLES: Record<VdpFormKind, string> = {
  enquire: "Enquire about this vehicle",
  test_drive: "Book a test drive",
  video: "Request a video walkaround",
};

/**
 * Enquire / Test drive / Request video as a sheet over the vehicle page.
 *
 * These buttons used to jump down the page to the inline forms. The jump
 * landed on each section's heading and intro, with the fields and the submit
 * button below the fold on a laptop and on every phone, so the visitor had to
 * find the form, scroll again, then scroll all the way back up to the car.
 * A sheet keeps them on the vehicle, shows the whole short form at once, and
 * closing it returns them exactly where they were. The inline forms further
 * down the page are unchanged for anyone who scrolls to them.
 *
 * Rendered once per vehicle page; the buttons open it with `openVdpForm`.
 */
export default function VdpFormSheet({
  item,
  titleLine,
}: {
  item: VehicleEnquiryItemPayload;
  /** "2021 Ford Ranger", shown under the sheet title. */
  titleLine: string;
}) {
  const mounted = useClientMounted();
  const [kind, setKind] = useState<VdpFormKind | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const titleId = `vdp-sheet-title-${useId().replace(/:/g, "")}`;

  const close = useCallback(() => {
    setKind(null);
    lastFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const w = window as WindowWithSheet;
    w.__vdpFormSheetReady = true;
    const onOpen = (e: Event) => {
      lastFocus.current = document.activeElement as HTMLElement | null;
      setKind((e as CustomEvent<VdpFormKind>).detail);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      w.__vdpFormSheetReady = false;
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!kind) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [kind, close]);

  if (!mounted || !kind) return null;

  return createPortal(
    <div
      className="vdp-sheet-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="vdp-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="vdp-sheet__head">
          <div className="min-w-0">
            <h2 id={titleId} className="vdp-sheet__title">
              {TITLES[kind]}
            </h2>
            <p className="vdp-sheet__vehicle">{titleLine}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="vdp-sheet__close"
            onClick={close}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>
        <div className="vdp-sheet__body">
          {kind === "enquire" ? (
            <VehicleEnquiryForm
              idPrefix="vdp-sheet-enquire"
              item={item}
              showCloseOnSuccess
              onSuccessClose={close}
            />
          ) : kind === "test_drive" ? (
            <VehicleTestDriveForm item={item} />
          ) : (
            <VehicleEnquiryForm
              idPrefix="vdp-sheet-video"
              item={item}
              formType="Video Walkaround Request"
              initialComments="Please send me a video walkaround of this vehicle."
              submitLabel="Request video walkaround"
              showCloseOnSuccess
              onSuccessClose={close}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
