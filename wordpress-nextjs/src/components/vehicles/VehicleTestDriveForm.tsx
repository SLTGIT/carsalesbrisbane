"use client";

import FormSubmissionModal from "@/components/forms/FormSubmissionModal";
import { trackVdpFormSubmit } from "@/lib/analytics/vdp";
import { submitLead } from "@/lib/leads/submit-lead-client";
import RecaptchaField from "@/components/forms/RecaptchaField";
import {
  digitsOnly,
  isValidName,
  sanitizeNameInput,
  sanitizePhoneInput,
} from "@/lib/forms/validation";
import "@/app/contact/contact.css";
import {
  useCallback,
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
  useId,
} from "react";
import type { VehicleEnquiryItemPayload } from "./VehicleEnquiryForm";
import FormPrivacyNote from "@/components/forms/FormPrivacyNote";

const PREFERRED_TIME_OPTIONS = [
  "Morning",
  "Afternoon",
  "Call me to arrange",
] as const;

export default function VehicleTestDriveForm({
  item,
}: {
  item: VehicleEnquiryItemPayload;
}) {
  const rawId = useId().replace(/:/g, "");
  const idPrefix = `vdp-test-drive-${rawId}`;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] =
    useState<(typeof PREFERRED_TIME_OPTIONS)[number]>("Morning");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"loading" | "success">("loading");
  const [submittedFirstName, setSubmittedFirstName] = useState("");

  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setMinDate(`${y}-${m}-${day}`);
  }, []);

  const resetForm = useCallback(() => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setPreferredDate("");
    setPreferredTime("Morning");
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("idle");
    setStatusMessage("");

    const phoneDigits = digitsOnly(phone);
    if (!isValidName(firstName) || !isValidName(lastName)) {
      setStatus("error");
      setStatusMessage("Please enter a valid first and last name.");
      return;
    }
    if (!recaptchaToken) {
      setStatus("error");
      setStatusMessage("Please complete reCAPTCHA.");
      return;
    }
    if (phoneDigits.length !== 10) {
      setStatus("error");
      setStatusMessage(
        "Please enter a valid 10-digit Australian mobile number.",
      );
      return;
    }

    /*
      Date and time are no longer compulsory. Someone who wants a test drive
      but has not settled on a day was previously stopped at the form and had
      to invent one; the dealership confirms the time on the callback anyway,
      so an enquiry with no date is still a lead worth having.
    */
    const message =
      [
        preferredDate.trim()
          ? `Preferred test drive date: ${preferredDate.trim()}`
          : "",
        preferredTime ? `Preferred time: ${preferredTime}` : "",
      ]
        .filter(Boolean)
        .join("\n") || "No preferred date given — please call to arrange a time.";

    setLoading(true);
    setSubmittedFirstName(firstName.trim());
    setModalOpen(true);
    setModalPhase("loading");

    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phoneDigits,
        email: "",
        message,
        form_type: "Request for Test Drive",
        preferredDate: preferredDate.trim(),
        preferredTime: preferredTime,
        budget: "",
        dob: "",
        driverLicence: "",
        address: "",
        date: new Date().toISOString(),
        recaptchaToken,
        item: {
          image: item.image,
          make: item.make,
          model: item.model,
          year: item.year,
          stock: item.stock,
          rego: item.rego,
          status: item.status,
          tag: item.tag,
          url: item.url,
        },
      };

      const data = await submitLead(body);
      if (data.success) {
        trackVdpFormSubmit(
          {
            stockNumber: item.stock,
            make: item.make,
            model: item.model,
            year: item.year,
          },
          "test_drive",
        );
        setModalPhase("success");
        resetForm();
        setRecaptchaToken(null);
      } else {
        setModalOpen(false);
        setStatus("error");
        setStatusMessage(
          typeof data.message === "string" && data.message
            ? data.message
            : "Something went wrong. Please try again.",
        );
      }
    } catch (err) {
      console.error(err);
      setModalOpen(false);
      setStatus("error");
      setStatusMessage(
        "We could not send your request. Check your connection and try again.",
      );
    }
    setLoading(false);
  };

  const closeSubmissionModal = useCallback(() => {
    setModalOpen(false);
    setModalPhase("loading");
  }, []);

  return (
    <>
      {status === "error" && (
        <div
          className="cs-contact-form__alert cs-contact-form__alert--error mb-3"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle-fill" aria-hidden />
          <div>
            <strong className="d-block mb-1">Could not submit</strong>
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="vdp-test-drive-form">
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label
              className="cs-contact-form__label"
              htmlFor={`${idPrefix}-fn`}
            >
              First name
              <span className="cs-contact-form__req" aria-hidden>
                *
              </span>
            </label>
            <input
              id={`${idPrefix}-fn`}
              name="firstName"
              type="text"
              className="form-control rounded-pill cs-contact-form__control"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFirstName(sanitizeNameInput(e.target.value))
              }
            />
          </div>
          <div className="col-md-6">
            <label
              className="cs-contact-form__label"
              htmlFor={`${idPrefix}-ln`}
            >
              Last name
              <span className="cs-contact-form__req" aria-hidden>
                *
              </span>
            </label>
            <input
              id={`${idPrefix}-ln`}
              name="lastName"
              type="text"
              className="form-control rounded-pill cs-contact-form__control"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setLastName(sanitizeNameInput(e.target.value))
              }
            />
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label
              className="cs-contact-form__label"
              htmlFor={`${idPrefix}-phone`}
            >
              Phone
              <span className="cs-contact-form__req" aria-hidden>
                *
              </span>
            </label>
            <input
              id={`${idPrefix}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              className="form-control rounded-pill cs-contact-form__control"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPhone(sanitizePhoneInput(e.target.value))
              }
              pattern="[0-9]{10}"
              maxLength={10}
            />
          </div>
          <div className="col-md-6">
            <label
              className="cs-contact-form__label"
              htmlFor={`${idPrefix}-date`}
            >
              Preferred date <span className="cs-muted">(optional)</span>
            </label>
            <input
              id={`${idPrefix}-date`}
              name="preferredDate"
              type="date"
              min={minDate}
              className="form-control rounded-pill cs-contact-form__control"
              value={preferredDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPreferredDate(e.target.value)
              }
            />
          </div>
        </div>

        <div className="mb-4">
          <label
            className="cs-contact-form__label"
            htmlFor={`${idPrefix}-time`}
          >
            Preferred time <span className="cs-muted">(optional)</span>
          </label>
          <select
            id={`${idPrefix}-time`}
            name="preferredTime"
            className="form-select rounded-pill cs-contact-form__control"
            value={preferredTime}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setPreferredTime(
                e.target.value as (typeof PREFERRED_TIME_OPTIONS)[number],
              )
            }
          >
            {PREFERRED_TIME_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <RecaptchaField
            token={recaptchaToken}
            onTokenChange={setRecaptchaToken}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary cs-pill px-4"
          disabled={loading}
        >
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden
              />
              Sending…
            </>
          ) : (
            "Request test drive"
          )}
        </button>
        <FormPrivacyNote purpose="arrange your test drive" />
      </form>

      <FormSubmissionModal
        open={modalOpen}
        phase={modalPhase}
        firstName={submittedFirstName}
        onClose={closeSubmissionModal}
      />
    </>
  );
}
