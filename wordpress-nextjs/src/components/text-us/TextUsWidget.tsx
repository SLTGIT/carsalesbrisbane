"use client";

import { submitLead } from "@/lib/leads/submit-lead-client";
import RecaptchaField from "@/components/forms/RecaptchaField";
import {
  digitsOnly,
  isValidName,
  sanitizeNameInput,
  sanitizePhoneInput,
} from "@/lib/forms/validation";
import type { VehicleEnquiryItemPayload } from "@/components/vehicles/VehicleEnquiryForm";
import {
  TEXT_US_DEFAULT_MESSAGE,
  buildTextUsVehicleDefaultMessage,
} from "@/lib/forms/vehicle-enquiry-message";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import styles from "./TextUsWidget.module.scss";

const TEXT_US_VEHICLE_SCRIPT_ID = "cs-textus-vehicle";

function readTextUsDefaults(): {
  message: string;
  vehicleItem: VehicleEnquiryItemPayload | null;
} {
  if (typeof document === "undefined") {
    return { message: TEXT_US_DEFAULT_MESSAGE, vehicleItem: null };
  }

  const el = document.getElementById(TEXT_US_VEHICLE_SCRIPT_ID);
  if (!el?.textContent?.trim()) {
    return { message: TEXT_US_DEFAULT_MESSAGE, vehicleItem: null };
  }

  try {
    const item = JSON.parse(el.textContent) as VehicleEnquiryItemPayload;
    return {
      message: buildTextUsVehicleDefaultMessage({
        condition: item.condition,
        year: item.year,
        make: item.make,
        model: item.model,
        price: item.price,
        listingSite: item.tag,
      }),
      vehicleItem: item,
    };
  } catch {
    return { message: TEXT_US_DEFAULT_MESSAGE, vehicleItem: null };
  }
}

function splitFullName(full: string): { firstName: string; lastName: string } {
  const t = full.trim();
  if (!t) return { firstName: "", lastName: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t, lastName: "—" };
  const last = t.slice(i + 1).trim();
  return { firstName: t.slice(0, i).trim(), lastName: last || "—" };
}

function maskAuMobile(digits: string): string {
  if (digits.length < 4) return digits;
  return `••••••••${digits.slice(-4)}`;
}

const DEALER_PHONE_DISPLAY =
  process.env.NEXT_PUBLIC_DEALER_PHONE || "07 3390 3057";

/** sessionStorage: after hide, only the “Text us” pill shows until a new tab/session. */
const SESSION_HIDE_GREETING_KEY = "cs-textus-hide-greeting";
/*
  The greeting used to appear the moment a page loaded and stay for 12
  seconds, over whatever sat in the bottom-right corner — on the homepage, the
  featured-stock copy and its "View all stock" link, during the visitor's
  first look at the page. It now waits a few seconds and leaves sooner.
*/
const GREETING_DELAY_MS = 5_000;
const GREETING_AUTO_HIDE_MS = 8_000;

export default function TextUsWidget() {
  const baseId = useId();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  /** false until client reads sessionStorage (avoids hydration mismatch). */
  const [showGreetingBubble, setShowGreetingBubble] = useState(false);
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(TEXT_US_DEFAULT_MESSAGE);
  const [vehicleItem, setVehicleItem] =
    useState<VehicleEnquiryItemPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedPhoneDigits, setSubmittedPhoneDigits] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    const { message: nextMessage, vehicleItem: nextItem } = readTextUsDefaults();
    setMessage(nextMessage);
    setVehicleItem(nextItem);
  }, [pathname]);

  const phoneDigits = useMemo(() => digitsOnly(phone), [phone]);
  const nameOk = isValidName(fullName);
  const phoneOk = phoneDigits.length === 10;

  const reset = useCallback(() => {
    const { message: nextMessage } = readTextUsDefaults();
    setPhase("form");
    setFullName("");
    setPhone("");
    setMessage(nextMessage);
    setError("");
    setSubmittedPhoneDigits("");
    setRecaptchaToken(null);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const persistHideGreeting = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_HIDE_GREETING_KEY, "1");
    } catch {
      /* private / blocked storage */
    }
    setShowGreetingBubble(false);
  }, []);

  const handleOpen = useCallback(() => {
    persistHideGreeting();
    setOpen(true);
    setError("");
  }, [persistHideGreeting]);

  useEffect(() => {
    /*
      No greeting bubble on a vehicle page. It opens over the price card, which
      is now where Enquire, Test drive, Call and the rest live, and it sits
      there for 12 seconds — covering the buttons during the exact moment the
      visitor is deciding. The Text us button itself stays available.
    */
    if (pathname?.startsWith("/cars/")) {
      setShowGreetingBubble(false);
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_HIDE_GREETING_KEY) === "1") {
        setShowGreetingBubble(false);
        return;
      }
    } catch {
      /* ignore */
    }
    const id = window.setTimeout(
      () => setShowGreetingBubble(true),
      GREETING_DELAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    if (!showGreetingBubble || open) return;
    const id = window.setTimeout(() => {
      persistHideGreeting();
    }, GREETING_AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [showGreetingBubble, open, persistHideGreeting]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!nameOk) {
      setError("Please enter a valid name.");
      return;
    }
    if (!phoneOk) {
      setError(
        "Please enter a valid 10-digit Australian mobile number (e.g. 04XX XXX XXX).",
      );
      return;
    }
    if (!recaptchaToken) {
      setError("Please complete reCAPTCHA.");
      return;
    }

    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      const data = await submitLead({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phoneDigits,
        email: "",
        message: message.trim(),
        form_type: vehicleItem ? "Used Vehicle Enquiry (Quick Chat)" : "General Enquiry (Quick Chat)",
        budget: "",
        date: new Date().toISOString(),
        recaptchaToken,
        item: vehicleItem
          ? {
              image: vehicleItem.image,
              make: vehicleItem.make,
              model: vehicleItem.model,
              year: vehicleItem.year,
              stock: vehicleItem.stock,
              rego: vehicleItem.rego,
              status: vehicleItem.status,
              tag: vehicleItem.tag,
              url: vehicleItem.url,
            }
          : {
              tag: "Car Sales Brisbane",
            },
      });

      if (data.success) {
        setSubmittedPhoneDigits(phoneDigits);
        setPhase("success");
      } else {
        setError(
          typeof data.message === "string" && data.message
            ? data.message
            : "Something went wrong. Please try again.",
        );
      }
    } catch {
      setError(
        "We could not send your message. Check your connection and try again.",
      );
    }
    setLoading(false);
  };

  return (
    // `cs-textus-wrap` is a stable hook for global CSS — the module class is
    // hashed, so the vehicle page cannot lift this clear of its sticky action
    // bar without it.
    <div className={`${styles.wrap} cs-textus-wrap`}>
      {!open && (
        <div className={`${styles.teaser} ${styles.pointer}`}>
          {showGreetingBubble ? (
            <button
              type="button"
              className={styles.bubbleTrigger}
              onClick={handleOpen}
              aria-expanded={false}
              aria-haspopup="dialog"
              aria-label="Open text us: Hi there, have a question?"
            >
              <div className={styles.bubble}>
                <div className={styles.bubbleIcon} aria-hidden>
                  <i className="bi bi-pin-map-fill" />
                </div>
                <span className={styles.bubbleText}>
                  Hi there, have a question? Text us here.
                </span>
              </div>
            </button>
          ) : null}
          <button
            type="button"
            className={styles.launcher}
            onClick={handleOpen}
            aria-expanded={false}
            aria-haspopup="dialog"
            aria-label="Text us — open chat"
          >
            <span className={styles.launcherIcon} aria-hidden>
              <i className="bi bi-phone" />
            </span>
            Text us
          </button>
        </div>
      )}

      {open && (
        <>
          <div
            id={`${baseId}-panel`}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${baseId}-title`}
          >
            <div className={styles.panelHeader}>
              <i className="bi bi-chat-dots-fill" aria-hidden />
              <span id={`${baseId}-title`}>Get a quick response via text.</span>
            </div>

            {phase === "form" ? (
              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.panelBody}>
                  <div className={styles.botBubble}>
                    Enter your information, and our team will text you shortly.
                  </div>

                  {error ? (
                    <div className={styles.errorBanner} role="alert">
                      {error}
                    </div>
                  ) : null}

                  <div className={styles.formCard}>
                    <div className={styles.field}>
                      <label
                        className={`${styles.label} ${fullName ? styles.labelActive : ""}`}
                        htmlFor={`${baseId}-name`}
                      >
                        Name
                      </label>
                      <div className={styles.inputRow}>
                        <input
                          id={`${baseId}-name`}
                          className={styles.input}
                          name="name"
                          autoComplete="name"
                          value={fullName}
                          onChange={(e) =>
                            setFullName(sanitizeNameInput(e.target.value))
                          }
                          disabled={loading}
                          required
                        />
                        <i
                          className={`bi bi-check-circle-fill ${styles.check} ${nameOk ? styles.checkVisible : ""}`}
                          aria-hidden
                        />
                      </div>
                    </div>

                    <div className={styles.field}>
                      <label
                        className={`${styles.label} ${phone ? styles.labelActive : ""}`}
                        htmlFor={`${baseId}-phone`}
                      >
                        Mobile phone
                      </label>
                      <div className={styles.inputRow}>
                        <input
                          id={`${baseId}-phone`}
                          className={styles.input}
                          name="phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder=""
                          value={phone}
                          onChange={(e) =>
                            setPhone(sanitizePhoneInput(e.target.value))
                          }
                          disabled={loading}
                          pattern="[0-9]{10}"
                          maxLength={10}
                          required
                        />
                        <i
                          className={`bi bi-check-circle-fill ${styles.check} ${phoneOk ? styles.checkVisible : ""}`}
                          aria-hidden
                        />
                      </div>
                    </div>

                    <div className={styles.field}>
                      <label
                        className={`${styles.label} ${message ? styles.labelActive : ""}`}
                        htmlFor={`${baseId}-message`}
                      >
                        Message
                      </label>
                      <div className={`${styles.inputRow} ${styles.messageRow}`}>
                        <textarea
                          id={`${baseId}-message`}
                          className={`${styles.input} ${styles.messageInput}`}
                          name="message"
                          autoComplete="off"
                          placeholder="How can we help?"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          disabled={loading}
                          rows={2}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <p className={styles.disclaimer}>
                    By submitting, you agree to receive text messages from Car
                    Sales Brisbane at the number provided. Message frequency
                    varies. Reply STOP to opt out. Message and data rates may
                    apply. See our{" "}
                    <Link href="/privacy-policy" className={styles.privacyLink}>
                      privacy policy
                    </Link>{" "}
                    for how we handle your information.
                  </p>
                </div>

                <div className={styles.footerActions}>
                  <div className={styles.captchaCompact}>
                    <RecaptchaField
                      token={recaptchaToken}
                      onTokenChange={setRecaptchaToken}
                    />
                  </div>
                  <button
                    type="submit"
                    className={styles.send}
                    disabled={loading || !nameOk || !phoneOk}
                  >
                    {loading ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.panelBody}>
                <div className={styles.botBubble}>
                  Thanks for texting us — we have received your details.
                </div>
                <div className={styles.userBubble}>
                  {maskAuMobile(submittedPhoneDigits)}
                  {message.trim() ? (
                    <>
                      <br />
                      {message.trim()}
                    </>
                  ) : null}
                </div>
                <div className={styles.received}>
                  <i className="bi bi-check2" aria-hidden />
                  Received
                </div>
                <div className={styles.card}>
                  {/* <div className={styles.cardTop}>{DEALER_PHONE_DISPLAY}</div> */}
                  <div className={styles.cardBottom}>
                    <h4>How else can we help?</h4>
                    <p>
                      Our team will be texting you back from the number above.
                    </p>
                    <div className={styles.cardCheck}>
                      <i className="bi bi-check-circle-fill" aria-hidden />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`${styles.fab} ${styles.pointer}`}
            onClick={handleClose}
            aria-label="Close text us widget"
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
