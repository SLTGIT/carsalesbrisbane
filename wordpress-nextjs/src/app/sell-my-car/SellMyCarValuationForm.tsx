"use client";

import FormSubmissionModal from "@/components/forms/FormSubmissionModal";
import { submitLead } from "@/lib/leads/submit-lead-client";
import RecaptchaField from "@/components/forms/RecaptchaField";
import {
  digitsOnly,
  isValidEmail,
  isValidName,
  sanitizeNameInput,
  sanitizePhoneInput,
} from "@/lib/forms/validation";
import "@/app/contact/contact.css";
import { useCallback, useState, ChangeEvent, FormEvent } from "react";
import { SELL_MY_CAR_MAKES, sellMyCarMakeLabel } from "./sell-my-car-makes";
import FormPrivacyNote from "@/components/forms/FormPrivacyNote";

const FORM_TYPE = "Sell My Car Enquiry (Sell My Car Form)";

const SELL_MY_CAR_DEFAULT_COMMENTS =
  "I'm interested in selling my vehicle. Please contact me with your best offer.";

const YEAR_OPTIONS: string[] = [];
for (let y = 2026; y >= 1970; y -= 1) {
  YEAR_OPTIONS.push(String(y));
}

type FormFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  odometer: string;
  rego: string;
  comments: string;
};

const emptyForm: FormFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  vehicleYear: "",
  vehicleMake: "",
  vehicleModel: "",
  odometer: "",
  rego: "",
  comments: SELL_MY_CAR_DEFAULT_COMMENTS,
};

/** Parses km from user input (digits only); null if invalid or out of range. */
function parseOdometerKm(raw: string): number | null {
  const digits = digitsOnly(raw);
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 1 || n > 2_000_000) return null;
  return n;
}

function buildMessage(values: FormFields): string {
  const y = values.vehicleYear.trim();
  const mk = sellMyCarMakeLabel(values.vehicleMake.trim());
  const md = values.vehicleModel.trim();
  const odoNum = parseOdometerKm(values.odometer);
  const rego = values.rego.trim();
  const comments = values.comments.trim();

  const parts = [
    "Sell My Car — obligation-free valuation",
    `Vehicle: ${y} ${mk} ${md}`,
    odoNum != null ? `Odometer: ${odoNum.toLocaleString("en-AU")} km` : null,
    rego ? `Registration: ${rego}` : null,
    comments ? `Comments: ${comments}` : null,
  ].filter(Boolean) as string[];

  return parts.join("\n");
}

export default function SellMyCarValuationForm() {
  const [formData, setFormData] = useState<FormFields>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"loading" | "success">("loading");
  const [submittedFirstName, setSubmittedFirstName] = useState("");

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    if (status !== "idle") {
      setStatus("idle");
      setStatusMessage("");
    }
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "firstName" || name === "lastName") {
      nextValue = sanitizeNameInput(value);
    } else if (name === "phone") {
      nextValue = sanitizePhoneInput(value);
    }
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const closeSubmissionModal = useCallback(() => {
    setModalOpen(false);
    setModalPhase("loading");
  }, []);

  const validateContact = (): boolean => {
    if (!isValidName(formData.firstName) || !isValidName(formData.lastName)) {
      setStatus("error");
      setStatusMessage("Please enter a valid first and last name.");
      return false;
    }
    if (!isValidEmail(formData.email)) {
      setStatus("error");
      setStatusMessage("Please enter a valid email address.");
      return false;
    }
    const phoneDigits = digitsOnly(formData.phone);
    if (phoneDigits.length !== 10) {
      setStatus("error");
      setStatusMessage(
        "Please enter a valid 10-digit Australian mobile number (no country code).",
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("idle");
    setStatusMessage("");

    if (!validateContact()) return;

    if (!recaptchaToken) {
      setStatus("error");
      setStatusMessage("Please complete reCAPTCHA.");
      return;
    }

    const phoneDigits = digitsOnly(formData.phone);
    const y = formData.vehicleYear.trim();
    const mk = formData.vehicleMake.trim();
    const md = formData.vehicleModel.trim();
    const odoNum = parseOdometerKm(formData.odometer);
    if (!y || !mk || !md) {
      setStatus("error");
      setStatusMessage("Please select year and make, and enter the model.");
      return;
    }
    if (odoNum == null) {
      setStatus("error");
      setStatusMessage(
        "Please enter a valid odometer reading in kilometres (whole numbers only).",
      );
      return;
    }

    setLoading(true);
    setSubmittedFirstName(formData.firstName.trim());
    setModalOpen(true);
    setModalPhase("loading");

    try {
      const makeLabel = sellMyCarMakeLabel(mk);
      const body = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: phoneDigits,
        email: formData.email.trim(),
        message: buildMessage(formData),
        form_type: FORM_TYPE,
        budget: "",
        kms: odoNum,
        dob: "",
        driverLicence: "",
        address: "",
        date: new Date().toISOString(),
        recaptchaToken,
        item: {
          tag: "Car Sales Brisbane",
          make: makeLabel,
          model: formData.vehicleModel.trim(),
          year: formData.vehicleYear.trim(),
        },
      };

      const data = await submitLead(body);

      if (data.success) {
        setModalPhase("success");
        setFormData(emptyForm);
        setRecaptchaToken(null);
      } else {
        setModalOpen(false);
        setStatus("error");
        setStatusMessage(
          typeof data.message === "string" && data.message
            ? data.message
            : "Something went wrong. Please try again in a moment.",
        );
      }
    } catch (err) {
      console.error(err);
      setModalOpen(false);
      setStatus("error");
      setStatusMessage(
        "We could not send your enquiry. Check your connection and try again.",
      );
    }
    setLoading(false);
  };

  return (
    <div className="smc-form-card">
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {status === "error" && statusMessage}
      </div>

      {status === "error" && (
        <div
          className="cs-contact-form__alert cs-contact-form__alert--error mb-4"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle-fill" aria-hidden />
          <div>
            <strong className="d-block mb-1">Could not submit</strong>
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <p className="smc-form-title mb-4">
          Enquire now for your vehicle price.
        </p>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="smc-form-label" htmlFor="smc-firstName">
              First name<span className="smc-form-req">*</span>
            </label>
            <input
              id="smc-firstName"
              name="firstName"
              type="text"
              className="form-control smc-form-control"
              placeholder="First name"
              required
              autoComplete="given-name"
              value={formData.firstName}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="smc-form-label" htmlFor="smc-lastName">
              Last name<span className="smc-form-req">*</span>
            </label>
            <input
              id="smc-lastName"
              name="lastName"
              type="text"
              className="form-control smc-form-control"
              placeholder="Last name"
              required
              autoComplete="family-name"
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="smc-form-label" htmlFor="smc-email">
              Email address<span className="smc-form-req">*</span>
            </label>
            <input
              id="smc-email"
              name="email"
              type="email"
              className="form-control smc-form-control"
              placeholder="Email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="smc-form-label" htmlFor="smc-phone">
              Mobile number<span className="smc-form-req">*</span>
            </label>
            <input
              id="smc-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              className="form-control smc-form-control"
              placeholder=""
              required
              autoComplete="tel"
              pattern="[0-9]{10}"
              maxLength={10}
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="smc-form-label" htmlFor="smc-make">
                Vehicle make<span className="smc-form-req">*</span>
              </label>
              <select
                id="smc-make"
                name="vehicleMake"
                className="form-select smc-form-control"
                required
                value={formData.vehicleMake}
                onChange={handleChange}
              >
                <option value="" disabled>
                  Vehicle make
                </option>
                {SELL_MY_CAR_MAKES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="smc-form-label" htmlFor="smc-model">
                Model<span className="smc-form-req">*</span>
              </label>
              <input
                id="smc-model"
                name="vehicleModel"
                type="text"
                className="form-control smc-form-control"
                placeholder="Model"
                required
                autoComplete="off"
                value={formData.vehicleModel}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="smc-form-label" htmlFor="smc-year">
                Year<span className="smc-form-req">*</span>
              </label>
              <select
                id="smc-year"
                name="vehicleYear"
                className="form-select smc-form-control"
                required
                value={formData.vehicleYear}
                onChange={handleChange}
              >
                <option value="" disabled>
                  Vehicle year…
                </option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="smc-form-label" htmlFor="smc-odo">
                Odometer (km)<span className="smc-form-req">*</span>
              </label>
              <input
                id="smc-odo"
                name="odometer"
                type="number"
                inputMode="numeric"
                className="form-control smc-form-control"
                placeholder="e.g. 125000"
                required
                autoComplete="off"
                value={formData.odometer}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="smc-form-label" htmlFor="smc-comments">
            Comments
            <span className="smc-form-req">*</span>
          </label>
          <textarea
            id="smc-comments"
            name="comments"
            className="form-control smc-form-control smc-form-textarea"
            rows={5}
            placeholder=""
            autoComplete="off"
            value={formData.comments}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <RecaptchaField
            token={recaptchaToken}
            onTokenChange={setRecaptchaToken}
          />
        </div>

        <div className="d-flex justify-content-end">
          <button
            type="submit"
            className="btn smc-form-btn"
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
              "Enquire now"
            )}
          </button>
        </div>
        <FormPrivacyNote purpose="value your vehicle and contact you about it" />
      </form>

      <FormSubmissionModal
        open={modalOpen}
        phase={modalPhase}
        firstName={submittedFirstName}
        onClose={closeSubmissionModal}
      />
    </div>
  );
}
