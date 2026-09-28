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
import { useState, ChangeEvent, FormEvent, useCallback } from "react";
import FormPrivacyNote from "@/components/forms/FormPrivacyNote";

type FormDataType = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  enquiryType: string;
  message: string;
};

const ENQUIRY_OPTIONS: string[] = [
  "General Enquiry",
  "Service Enquiry",
  "Parts Enquiry",
  "New Vehicle Enquiry",
  "Used Vehicle Enquiry",
  "Fleet Enquiry",
  "Finance Enquiry",
  "Careers Enquiry",
  "Sell My Car Enquiry",
];

const CONTACT_DEFAULT_MESSAGE =
  "I have a question and would like to get in touch. Please let me know how you can help.";

const emptyForm: FormDataType = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  enquiryType: "",
  message: CONTACT_DEFAULT_MESSAGE,
};

export default function ContactForm() {
  const [formData, setFormData] = useState<FormDataType>(emptyForm);

  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"loading" | "success">("loading");
  const [submittedFirstName, setSubmittedFirstName] = useState("");

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
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
    setFormData({
      ...formData,
      [name]: nextValue,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    setStatusMessage("");

    if (!isValidName(formData.firstName) || !isValidName(formData.lastName)) {
      setStatus("error");
      setStatusMessage("Please enter a valid first and last name.");
      setLoading(false);
      return;
    }
    if (!isValidEmail(formData.email)) {
      setStatus("error");
      setStatusMessage("Please enter a valid email address.");
      setLoading(false);
      return;
    }
    if (digitsOnly(formData.phone).length !== 10) {
      setStatus("error");
      setStatusMessage(
        "Please enter a valid 10-digit Australian mobile number.",
      );
      setLoading(false);
      return;
    }
    if (!recaptchaToken) {
      setStatus("error");
      setStatusMessage("Please complete reCAPTCHA.");
      setLoading(false);
      return;
    }

    setSubmittedFirstName(formData.firstName.trim());
    setModalOpen(true);
    setModalPhase("loading");

    try {
      const data = await submitLead({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: digitsOnly(formData.phone),
        email: formData.email.trim(),
        message: formData.message,
        form_type: formData.enquiryType + "(Contact Form)",
        budget: "",
        date: new Date().toISOString(),
        recaptchaToken,
        item: {
          tag: "Car Sales Brisbane",
        },
      });

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
    } catch (error) {
      console.error(error);
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
  }, []);

  return (
    <div className="cs-contact-form">
      <div className="cs-panel p-4 p-lg-5 shadow-sm">
        <h2 className="cs-contact-form__title mb-0">Send an enquiry</h2>
        <p className="text-secondary mt-2 mb-4">
          Fill in the form below and our team will respond as soon as we can.
        </p>

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

        <form onSubmit={handleSubmit}>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label
                className="cs-contact-form__label"
                htmlFor="contact-firstName"
              >
                First name
                <span className="cs-contact-form__req" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="contact-firstName"
                name="firstName"
                type="text"
                className="form-control cs-contact-form__control"
                required
                autoComplete="given-name"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6">
              <label
                className="cs-contact-form__label"
                htmlFor="contact-lastName"
              >
                Last name
                <span className="cs-contact-form__req" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="contact-lastName"
                name="lastName"
                type="text"
                className="form-control cs-contact-form__control"
                required
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <div className="">
                <label
                  className="cs-contact-form__label"
                  htmlFor="contact-email"
                >
                  Email
                  <span className="cs-contact-form__req" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  className="form-control cs-contact-form__control"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="">
                <label
                  className="cs-contact-form__label"
                  htmlFor="contact-phone"
                >
                  Phone number
                  <span className="cs-contact-form__req" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  className="form-control cs-contact-form__control"
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  autoComplete="tel"
                  placeholder=""
                  value={formData.phone}
                  onChange={handleChange}
                />
                <p className="form-text text-muted small mb-0 mt-1"></p>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label
              className="cs-contact-form__label"
              htmlFor="contact-enquiryType"
            >
              Enquiry type
              <span className="cs-contact-form__req" aria-hidden>
                *
              </span>
            </label>
            <select
              id="contact-enquiryType"
              name="enquiryType"
              className="form-select cs-contact-form__control"
              required
              value={formData.enquiryType}
              onChange={handleChange}
            >
              <option value="">Select an option</option>
              {ENQUIRY_OPTIONS.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="cs-contact-form__label" htmlFor="contact-message">
              Comments
              <span className="cs-contact-form__req" aria-hidden>
                *
              </span>
            </label>
            <textarea
              id="contact-message"
              name="message"
              className="form-control cs-contact-form__control cs-contact-form__textarea"
              rows={5}
              required
              value={formData.message}
              onChange={handleChange}
            />
          </div>

          <div className="mt-3">
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
              "Submit enquiry"
            )}
          </button>
          <FormPrivacyNote purpose="respond to your enquiry" />
        </form>
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
