import type { VehicleVdpAiFaq } from "./vehicleVdpTypes";

/*
  Generated FAQs are kept only where they answer something about this vehicle.

  Two kinds were pure filler: "Is the vehicle still available?" answered with
  "please confirm with the dealer", and "Can I schedule a test drive?" answered
  with "contact the dealer" — both now have their own buttons at the top of the
  page. Anything whose answer is hedged with "confirm with dealer" is dropped
  too; an advert should not ask the reader to verify its own claims.

  Shared by the rendered FAQ section and the FAQPage structured data, which
  have to agree: publishing a question in schema that is not on the page is a
  structured-data violation.
*/
const FAQ_FILLER =
  /still available|schedule a test drive|book a test drive|contact the dealer/i;
const FAQ_HEDGED = /confirm with (the )?dealer|not in listing/i;

export function usefulVdpFaqs(faqs: VehicleVdpAiFaq[]): VehicleVdpAiFaq[] {
  return faqs.filter(
    (faq) =>
      !FAQ_FILLER.test(faq.question) &&
      !FAQ_HEDGED.test(faq.answer) &&
      faq.question.trim().length > 0 &&
      faq.answer.trim().length > 0,
  );
}
