import Link from "next/link";

/**
 * Collection notice shown under every lead form's submit button.
 *
 * The forms collect names, phone numbers and emails — and the finance form a
 * date of birth, driver licence number and home address — without saying why
 * or pointing to the privacy policy. Australian Privacy Principle 5 expects a
 * business to tell people, at or before collection, what it is collecting the
 * information for; a plain line here is the usual way to do that.
 */
export default function FormPrivacyNote({
  purpose = "respond to your enquiry",
}: {
  /** What this particular form's details are used for. */
  purpose?: string;
}) {
  return (
    <p className="cs-form-privacy-note small cs-muted mt-3 mb-0">
      We use these details to {purpose}. See our{" "}
      <Link href="/privacy-policy">Privacy Policy</Link> for how we handle
      your information.
    </p>
  );
}
