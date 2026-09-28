"use client";

import FormSubmissionModal from "@/components/forms/FormSubmissionModal";
import { trackVdpFormSubmit } from "@/lib/analytics/vdp";
import { submitLead } from "@/lib/leads/submit-lead-client";
import RecaptchaField from "@/components/forms/RecaptchaField";
import FormPrivacyNote from "@/components/forms/FormPrivacyNote";
import {
  digitsOnly,
  isValidEmail,
  isValidName,
  sanitizeNameInput,
  sanitizePhoneInput,
} from "@/lib/forms/validation";
import { buildVehicleEnquiryDefaultMessage } from "@/lib/forms/vehicle-enquiry-message";
import "@/app/contact/contact.css";
import {
  useCallback,
  useMemo,
  useState,
  ChangeEvent,
  FormEvent,
} from "react";

export type VehicleEnquiryItemPayload = {
  image: string;
  make: string;
  model: string;
  year: string;
  stock: string;
  rego: string;
  status: string;
  tag: string;
  url: string;
  condition?: string;
  price?: string;
};

const DEALERSHIP_OPTIONS = [
  {
    value: "ormiston",
    label: "Car Sales Brisbane",
  },
] as const;

export interface VehicleEnquiryFormProps {
  item: VehicleEnquiryItemPayload;
  /** Unique prefix for input ids (e.g. from useId). */
  idPrefix: string;
  /** Show a Close control after successful submit (e.g. inside a modal). */
  showCloseOnSuccess?: boolean;
  onSuccessClose?: () => void;
  /**
   * Lead type recorded on the email and the WordPress record. Defaults to a
   * general vehicle enquiry; the video-walkaround request overrides it so the
   * team can tell the two apart without reading the message.
   */
  formType?: string;
  /** Pre-filled comment, used where the request itself is the message. */
  initialComments?: string;
  /** Submit button text. */
  submitLabel?: string;
}

export default function VehicleEnquiryForm({
  item,
  idPrefix,
  showCloseOnSuccess,
  onSuccessClose,
  formType = "Used Vehicle Enquiry",
  initialComments = "",
  submitLabel = "Send enquiry",
}: VehicleEnquiryFormProps) {
  const defaultMessage = useMemo(
    () =>
      buildVehicleEnquiryDefaultMessage({
        condition: item.condition,
        year: item.year,
        make: item.make,
        model: item.model,
        price: item.price,
        listingSite: item.tag,
      }),
    [
      item.condition,
      item.year,
      item.make,
      item.model,
      item.price,
      item.tag,
    ],
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [comments, setComments] = useState(initialComments || defaultMessage);
  const [dealership, setDealership] = useState("");
  const [similarStock, setSimilarStock] = useState(false);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"loading" | "success">("loading");
  const [submittedFirstName, setSubmittedFirstName] = useState("");

  const resetForm = useCallback(() => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    // A video request resets to its own message, not the general enquiry one.
    setComments(initialComments || defaultMessage);
    setDealership("");
    setSimilarStock(false);
  }, [defaultMessage, initialComments]);

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
    if (!isValidEmail(email)) {
      setStatus("error");
      setStatusMessage("Please enter a valid email address.");
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

    const dealerLabel =
      DEALERSHIP_OPTIONS.find((d) => d.value === dealership)?.label ?? "";

    const messageParts = [comments.trim()];
    if (dealerLabel) {
      messageParts.push(`Preferred dealership: ${dealerLabel}`);
    }
    if (similarStock) {
      messageParts.push("Please email me similar stock and latest offers.");
    }
    const message = messageParts.filter(Boolean).join("\n\n");

    setLoading(true);
    setSubmittedFirstName(firstName.trim());
    setModalOpen(true);
    setModalPhase("loading");

    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phoneDigits,
        email: email.trim(),
        message,
        form_type: formType,
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
          "enquiry",
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
        "We could not send your enquiry. Check your connection and try again.",
      );
    }
    setLoading(false);
  };

  const closeSubmissionModal = useCallback(() => {
    setModalOpen(false);
    setModalPhase("loading");
    if (showCloseOnSuccess && onSuccessClose) {
      onSuccessClose();
    }
  }, [onSuccessClose, showCloseOnSuccess]);

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

      <form onSubmit={handleSubmit} className="vdp-enquiry-form">
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
              className="form-control cs-contact-form__control"
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
              className="form-control cs-contact-form__control"
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
              htmlFor={`${idPrefix}-email`}
            >
              Email address
              <span className="cs-contact-form__req" aria-hidden>
                *
              </span>
            </label>
            <input
              id={`${idPrefix}-email`}
              name="email"
              type="email"
              className="form-control cs-contact-form__control"
              required
              autoComplete="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
            />
          </div>
          <div className="col-md-6">
            <label
              className="cs-contact-form__label"
              htmlFor={`${idPrefix}-phone`}
            >
              Mobile number
              <span className="cs-contact-form__req" aria-hidden>
                *
              </span>
            </label>
            <input
              id={`${idPrefix}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              className="form-control cs-contact-form__control"
              required
              autoComplete="tel"
              placeholder=""
              value={phone}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPhone(sanitizePhoneInput(e.target.value))
              }
              pattern="[0-9]{10}"
              maxLength={10}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="cs-contact-form__label" htmlFor={`${idPrefix}-msg`}>
            Comments
            <span className="cs-contact-form__req" aria-hidden>
              *
            </span>
          </label>
          <textarea
            id={`${idPrefix}-msg`}
            name="message"
            className="form-control cs-contact-form__control cs-contact-form__textarea"
            rows={4}
            required
            placeholder="Message"
            value={comments}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setComments(e.target.value)
            }
          />
        </div>

        {/* <div className="mb-3">
          <label
            className="cs-contact-form__label"
            htmlFor={`${idPrefix}-dealer`}
          >
            Dealership location
            <span className="cs-contact-form__req" aria-hidden>
              *
            </span>
          </label>
          <select
            id={`${idPrefix}-dealer`}
            name="dealership"
            className="form-select cs-contact-form__control"
            required
            value={dealership}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setDealership(e.target.value)
            }
          >
            <option value="">Select a location</option>
            {DEALERSHIP_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div> */}

        <div className="form-check cs-contact-form__subscribe mb-4">
          <input
            id={`${idPrefix}-similar`}
            name="similarStock"
            type="checkbox"
            className="form-check-input"
            checked={similarStock}
            onChange={(e) => setSimilarStock(e.target.checked)}
          />
          <label className="form-check-label" htmlFor={`${idPrefix}-similar`}>
            Email me similar stock and latest offers.
          </label>
        </div>

        <div className="mb-3">
          <RecaptchaField
            token={recaptchaToken}
            onTokenChange={setRecaptchaToken}
          />
        </div>
        <div className="d-flex flex-column flex-sm-row gap-2">
          <button
            type="submit"
            className="btn cs-contact-form__submit cs-pill"
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
              submitLabel
            )}
          </button>
        </div>
        <FormPrivacyNote purpose="respond to your enquiry about this vehicle" />
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
