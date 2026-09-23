"use client";

import FormSubmissionModal from "@/components/forms/FormSubmissionModal";
import { submitLead } from "@/lib/leads/submit-lead-client";
import RecaptchaField from "@/components/forms/RecaptchaField";
import FormPrivacyNote from "@/components/forms/FormPrivacyNote";
import {
  isValidEmail,
  isValidName,
  sanitizeNameInput,
  sanitizePhoneInput,
} from "@/lib/forms/validation";
import {
  useState,
  useCallback,
  ChangeEvent,
  FormEvent,
} from "react";

const BUDGET_PRESETS = [
  5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 70000,
] as const;

const DEFAULT_MESSAGE = "Looking for finance options";
const FORM_TYPE = "Finance Enquiry (Finance Centre Form)";

function formatBudgetChip(n: number): string {
  return `$${n.toLocaleString("en-AU")}`;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function twoDigitPart(value: string): string {
  return digitsOnly(value).slice(0, 2);
}

function buildDob(y: string, m: string, d: string): string | null {
  const year = digitsOnly(y).slice(0, 4);
  const month = digitsOnly(m).slice(0, 2);
  const day = digitsOnly(d).slice(0, 2);
  if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
    return null;
  }
  const yi = Number(year);
  const mi = Number(month);
  const di = Number(day);
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null;
  const date = new Date(yi, mi - 1, di);
  if (
    date.getFullYear() !== yi ||
    date.getMonth() !== mi - 1 ||
    date.getDate() !== di
  ) {
    return null;
  }
  const yStr = String(yi);
  const mStr = String(mi).padStart(2, "0");
  const dStr = String(di).padStart(2, "0");
  return `${yStr}-${mStr}-${dStr}`;
}

export default function FinanceEnquiryForm() {
  const [budget, setBudget] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [driverLicence, setDriverLicence] = useState("");
  const [address, setAddress] = useState("");
  const [subscribe, setSubscribe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [dobError, setDobError] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"loading" | "success">("loading");
  const [submittedFirstName, setSubmittedFirstName] = useState("");

  const resetForm = useCallback(() => {
    setBudget("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setDobDay("");
    setDobMonth("");
    setDobYear("");
    setDriverLicence("");
    setAddress("");
    setSubscribe(false);
    setDobError("");
    setRecaptchaToken(null);
  }, []);

  const closeSubmissionModal = useCallback(() => {
    setModalOpen(false);
    setModalPhase("loading");
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDobError("");
    const dob = buildDob(dobYear, dobMonth, dobDay);
    if (!dob) {
      setDobError("Enter a valid date of birth (dd / mm / yyyy).");
      return;
    }

    setLoading(true);
    setStatus("idle");
    setStatusMessage("");

    const phoneDigits = digitsOnly(phone);
    const budgetDigits = digitsOnly(budget);
    if (!isValidName(firstName) || !isValidName(lastName)) {
      setStatus("error");
      setStatusMessage("Please enter a valid first and last name.");
      setLoading(false);
      return;
    }
    if (!isValidEmail(email)) {
      setStatus("error");
      setStatusMessage("Please enter a valid email address.");
      setLoading(false);
      return;
    }
    if (!recaptchaToken) {
      setStatus("error");
      setStatusMessage("Please complete reCAPTCHA.");
      setLoading(false);
      return;
    }
    if (!budgetDigits) {
      setStatus("error");
      setStatusMessage("Please enter your vehicle budget.");
      setLoading(false);
      return;
    }

    const budgetNum = Number(budgetDigits);
    if (Number.isNaN(budgetNum) || budgetNum < 5000 || budgetNum > 150000) {
      setStatus("error");
      setStatusMessage("Budget must be between $5,000 and $150,000.");
      setLoading(false);
      return;
    }

    if (phoneDigits.length !== 10) {
      setStatus("error");
      setStatusMessage(
        "Please enter a valid 10-digit Australian phone number (no country code).",
      );
      setLoading(false);
      return;
    }

    setSubmittedFirstName(firstName.trim());
    setModalOpen(true);
    setModalPhase("loading");

    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phoneDigits,
        email: email.trim(),
        message: DEFAULT_MESSAGE,
        form_type: FORM_TYPE,
        budget: budgetDigits,
        dob,
        driverLicence: driverLicence.trim(),
        address: address.trim(),
        date: new Date().toISOString(),
        subscribe,
        recaptchaToken,
        item: {
          tag: "Car Sales Brisbane",
        },
      };

      const data = await submitLead(body);

      if (data.success) {
        setModalPhase("success");
        resetForm();
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
    <div className="cs-contact-form fc-finance-enquiry">
      <div className="row g-4 g-xl-5 align-items-start">
        <div className="col-lg-8">
          <div className="cs-panel p-4 p-lg-5 shadow-sm">
            <h2 id="fc-form-heading" className="cs-contact-form__title mb-0">
              Finance application
            </h2>
            <p className="text-secondary mt-2 mb-4">
              Complete the form below — fields marked with{" "}
              <span className="cs-contact-form__req" aria-hidden>
                *
              </span>{" "}
              are required.
            </p>

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

            <form onSubmit={handleSubmit} noValidate aria-labelledby="fc-form-heading">
              <div className="mb-3">
                <label className="cs-contact-form__label" htmlFor="fc-budget">
                  Budget
                  <span className="cs-contact-form__req" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="fc-budget"
                  name="budget"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="form-control cs-contact-form__control"
                  required
                  placeholder="Vehicle budget"
                  value={budget}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setBudget(e.target.value)
                  }
                />
                <div className="fc-budget-chips d-flex flex-wrap gap-2 mt-2">
                  {BUDGET_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`btn btn-sm rounded-pill fc-budget-chip ${
                        digitsOnly(budget) === String(n)
                          ? "fc-budget-chip--active"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => setBudget(String(n))}
                    >
                      {formatBudgetChip(n)}
                    </button>
                  ))}
                </div>
                <p className="form-text text-muted small mb-0 mt-2">
                  You can borrow from $5,000 up to $150,000.
                </p>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label
                    className="cs-contact-form__label"
                    htmlFor="fc-firstName"
                  >
                    First name
                    <span className="cs-contact-form__req" aria-hidden>
                      *
                    </span>
                  </label>
                  <input
                    id="fc-firstName"
                    name="firstName"
                    type="text"
                    className="form-control cs-contact-form__control"
                    required
                    autoComplete="given-name"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(sanitizeNameInput(e.target.value))}
                  />
                </div>
                <div className="col-md-6">
                  <label
                    className="cs-contact-form__label"
                    htmlFor="fc-lastName"
                  >
                    Last name
                    <span className="cs-contact-form__req" aria-hidden>
                      *
                    </span>
                  </label>
                  <input
                    id="fc-lastName"
                    name="lastName"
                    type="text"
                    className="form-control cs-contact-form__control"
                    required
                    autoComplete="family-name"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(sanitizeNameInput(e.target.value))}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="cs-contact-form__label" htmlFor="fc-phone">
                  Mobile number
                  <span className="cs-contact-form__req" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="fc-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  className="form-control cs-contact-form__control"
                  required
                  autoComplete="tel"
                  placeholder=""
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  pattern="[0-9]{10}"
                  maxLength={10}
                />
              </div>

              <div className="mb-3">
                <label className="cs-contact-form__label" htmlFor="fc-email">
                  Email address
                  <span className="cs-contact-form__req" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="fc-email"
                  name="email"
                  type="email"
                  className="form-control cs-contact-form__control"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <fieldset className="mb-3 border-0 p-0 m-0">
                <legend className="cs-contact-form__label mb-2 float-none w-100 px-0">
                  Date of birth
                  <span className="cs-contact-form__req" aria-hidden>
                    *
                  </span>
                </legend>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <input
                    id="fc-dob-day"
                    name="dobDay"
                    type="text"
                    inputMode="numeric"
                    className="form-control cs-contact-form__control fc-dob-part"
                    placeholder="dd"
                    maxLength={2}
                    autoComplete="bday-day"
                    aria-label="Day of birth"
                    value={dobDay}
                    onChange={(e) => setDobDay(twoDigitPart(e.target.value))}
                  />
                  <span className="text-secondary fc-dob-sep" aria-hidden>
                    /
                  </span>
                  <input
                    id="fc-dob-month"
                    name="dobMonth"
                    type="text"
                    inputMode="numeric"
                    className="form-control cs-contact-form__control fc-dob-part"
                    placeholder="mm"
                    maxLength={2}
                    autoComplete="bday-month"
                    aria-label="Month of birth"
                    value={dobMonth}
                    onChange={(e) => setDobMonth(twoDigitPart(e.target.value))}
                  />
                  <span className="text-secondary fc-dob-sep" aria-hidden>
                    /
                  </span>
                  <input
                    id="fc-dob-year"
                    name="dobYear"
                    type="text"
                    inputMode="numeric"
                    className="form-control cs-contact-form__control fc-dob-year"
                    placeholder="yyyy"
                    maxLength={4}
                    autoComplete="bday-year"
                    aria-label="Year of birth"
                    value={dobYear}
                    onChange={(e) =>
                      setDobYear(digitsOnly(e.target.value).slice(0, 4))
                    }
                  />
                </div>
                {dobError ? (
                  <p className="text-danger small mb-0 mt-2" role="alert">
                    {dobError}
                  </p>
                ) : null}
              </fieldset>

              <div className="mb-3">
                <label className="cs-contact-form__label" htmlFor="fc-licence">
                  Driver licence number
                  <span className="cs-contact-form__req" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="fc-licence"
                  name="driverLicence"
                  type="text"
                  className="form-control cs-contact-form__control"
                  required
                  autoComplete="off"
                  placeholder="Driver licence"
                  value={driverLicence}
                  onChange={(e) => setDriverLicence(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="cs-contact-form__label" htmlFor="fc-address">
                  Your current address
                  <span className="cs-contact-form__req" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="fc-address"
                  name="address"
                  type="text"
                  className="form-control cs-contact-form__control"
                  required
                  autoComplete="street-address"
                  placeholder="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-check cs-contact-form__subscribe mb-4">
                <input
                  id="fc-subscribe"
                  name="subscribe"
                  type="checkbox"
                  className="form-check-input"
                  checked={subscribe}
                  onChange={(e) => setSubscribe(e.target.checked)}
                />
                <label
                  className="form-check-label"
                  htmlFor="fc-subscribe"
                >
                  Yes, I would like to subscribe to receive latest offers
                  &amp; product updates.
                </label>
              </div>

              <div className="mt-3 fc-recaptcha-slot">
                <RecaptchaField
                  token={recaptchaToken}
                  onTokenChange={setRecaptchaToken}
                />
              </div>
              <button
                type="submit"
                className="btn w-100 cs-contact-form__submit mt-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden
                    />
                    Submitting…
                  </>
                ) : (
                  "Submit application"
                )}
              </button>
              <FormPrivacyNote purpose="assess and respond to your finance enquiry" />
            </form>
          </div>
        </div>

        <div className="col-lg-4">
          <aside className="fc-finance-steps h-100">
            <p className="fc-finance-steps__kicker text-uppercase small fw-semibold mb-3">
              How it works
            </p>
            <ol className="list-unstyled mb-0 vstack gap-4">
              <li className="fc-finance-step d-flex gap-3">
                <span className="fc-finance-step__icon" aria-hidden>
                  <i className="bi bi-check-lg" />
                </span>
                <div>
                  <span className="fc-finance-step__label">Step 1</span>
                  <p className="mb-0 mt-1">
                    Apply online in 5 minutes!
                  </p>
                </div>
              </li>
              <li className="fc-finance-step d-flex gap-3">
                <span className="fc-finance-step__icon" aria-hidden>
                  <i className="bi bi-clock" />
                </span>
                <div>
                  <span className="fc-finance-step__label">Step 2</span>
                  <p className="mb-0 mt-1">
                    Get finance with your own personalised finance rate
                  </p>
                </div>
              </li>
              <li className="fc-finance-step d-flex gap-3">
                <span className="fc-finance-step__icon" aria-hidden>
                  <i className="bi bi-car-front-fill" />
                </span>
                <div>
                  <span className="fc-finance-step__label">Step 3</span>
                  <p className="mb-0 mt-1">Purchase your dream car</p>
                </div>
              </li>
            </ol>
          </aside>
        </div>
      </div>

      <FormSubmissionModal
        open={modalOpen}
        phase={modalPhase}
        firstName={submittedFirstName}
        onClose={closeSubmissionModal}
      />
    </div>
  );
}
