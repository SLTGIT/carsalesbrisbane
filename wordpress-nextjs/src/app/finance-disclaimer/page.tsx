import { Metadata } from "next";
import { getCurrentUrlAndRoute, siteUrlMetadataFields } from "@/lib/site-url";
import JsonLd from "@/components/JsonLd";
import {
  breadcrumbJsonLd,
  jsonLdGraph,
  organizationJsonLd,
  upgradeHttpToHttpsUrl,
  webPageJsonLd,
  webSiteJsonLd,
} from "@/lib/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const { currentUrl, currentRoute } = await getCurrentUrlAndRoute(
    "/finance-disclaimer"
  );
  return {
    title: "Finance Disclaimer | Car Sales Brisbane",
    description:
      // not more than 152 characters
      "How to read finance offers and repayment figures on the Car Sales Brisbane website. All finance is subject to lender approval, terms and fees.",
    ...siteUrlMetadataFields(currentUrl, currentRoute),
  };
}

export default async function FinanceDisclaimer() {
  const { currentUrl } = await getCurrentUrlAndRoute("/finance-disclaimer");
  const pageUrl = upgradeHttpToHttpsUrl(currentUrl);
  const origin = new URL(pageUrl).origin;
  const jsonLd = jsonLdGraph(
    organizationJsonLd(origin),
    webSiteJsonLd(origin),
    webPageJsonLd({
      pageUrl,
      name: "Finance Disclaimer | Car Sales Brisbane",
      description:
        "How to read finance offers and repayment figures on the Car Sales Brisbane website. All finance is subject to lender approval, terms and fees.",
    }),
    breadcrumbJsonLd(pageUrl, [
      { name: "Home", item: `${origin}/` },
      { name: "Finance disclaimer", item: pageUrl },
    ]),
  );

  return (
    <div className="p-4">
      <JsonLd data={jsonLd} />
      {/*
        The previous text told buyers repayment figures were "generated to
        support UX and SEO intent around finance-first conversion" — an
        internal brief on a legal page, and an admission the figures were not
        real. This names no lender or credit licence: the business has to
        supply those details before they can be stated here.
      */}
      <article className="">
        <h1>Finance Disclaimer</h1>
        <p>
          Finance is subject to the lender&apos;s credit assessment and
          approval. Terms, conditions, fees and charges apply, and not every
          applicant will be approved.
        </p>
        <p>
          Offers such as $0 deposit finance and repayments &ldquo;from $5 per
          day&rdquo; are available to approved applicants only and depend on
          the lender, your circumstances, the loan term and the vehicle chosen.
        </p>
        <p>
          Any repayment amount shown on this website, including a
          &ldquo;from $&hellip;/week&rdquo; figure on a vehicle, is an estimate
          for illustration only. It is not a quote or an offer of credit.
        </p>
        <p>
          Vehicle prices are shown excluding government charges (such as
          registration, stamp duty and compulsory third party insurance)
          unless marked as a drive-away price.
        </p>
        <p>
          For details of the lenders we work with, or for a personalised
          quote, please <a href="/contact">contact us</a> or call{" "}
          <a href="tel:0733903057">07 3390 3057</a>.
        </p>
      </article>
    </div>
  );
}
