import dynamic from "next/dynamic";
import Link from "next/link";
import type {
  VehicleVdpAiContent,
  VehicleVdpAiFaq,
  VehicleVdpAiSpecRow,
  VehicleVdpSnapshot,
} from "@/lib/openai/vehicleVdpTypes";
import {
  displayFuelType,
  recoverPowertrain,
  simplifyTransmission,
} from "@/lib/inventory/powertrain";
import type { VehicleImage } from "@/types/vehicle";
import type { VehicleEnquiryItemPayload } from "./VehicleEnquiryForm";
import VehicleGallery from "./VehicleGallery";
import type { SimilarCarItem } from "./VehicleSimilarCarousel";
import VdpAnalytics from "./VdpAnalytics";
import VdpRefPhoneReveal from "./VdpRefPhoneReveal";
import VdpScrollStickyBar from "./VdpScrollStickyBar";
import VdpQuickSpecsRow, { type VdpQuickSpecItem } from "./VdpQuickSpecsRow";
import VdpKeyHighlights from "./VdpKeyHighlights";
import VdpCmsOverview from "./VdpCmsOverview";
import VdpDealerCommentsExpandable from "./VdpDealerCommentsExpandable";
import VdpCarDetailsTabs from "./VdpCarDetailsTabs";
import VdpShareLinks from "./VdpShareLinks";
import { ORG_GOOGLE_MAPS_PLACE_URL, ORG_POSTAL_ADDRESS } from "@/lib/json-ld";

const VehicleVdpRefInlineEnquiry = dynamic(
  () => import("./VehicleVdpRefInlineEnquiry"),
);

/**
 * Specification rows taken straight from the dealer feed — this is the record.
 * Transmission and fuel keep their exact feed wording ("Constant Variable",
 * "Petrol - Unleaded") even though cards show simplified/corrected values.
 * A recovered powertrain is added as its own row only when it differs, so both
 * the feed value and the correction are visible.
 */
function buildFeedSpecRows(snapshot: VehicleVdpSnapshot): VehicleVdpAiSpecRow[] {
  const recovered = recoverPowertrain({
    feedFuelType: snapshot.fuelType,
    name: snapshot.description || snapshot.title,
    comments: snapshot.comments,
  });
  const odometer =
    snapshot.odometerKm != null && snapshot.odometerKm > 0
      ? `${snapshot.odometerKm.toLocaleString("en-AU")} km`
      : "";

  const rows = [
    { label: "Odometer", value: odometer, icon: "speedometer2" },
    { label: "Fuel type", value: snapshot.fuelType, icon: "fuel-pump" },
    ...(recovered && recovered.toLowerCase() !== snapshot.fuelType.toLowerCase()
      ? [{ label: "Powertrain", value: recovered, icon: "lightning-charge" }]
      : []),
    {
      label: "Transmission",
      value: snapshot.transmission,
      icon: "gear-wide-connected",
    },
    { label: "Body type", value: snapshot.bodyType, icon: "car-front" },
    { label: "Drive type", value: snapshot.driveType, icon: "diagram-3" },
    { label: "Colour", value: snapshot.bodyColour, icon: "palette" },
    { label: "VIN", value: snapshot.vin, icon: "upc-scan" },
    { label: "Stock number", value: snapshot.stockNumber, icon: "card-heading" },
  ];

  return rows
    .filter((r) => r.value.trim().length > 0)
    .map((r) => ({ ...r, sourceTag: "listing" as const }));
}
const VehicleTestDriveForm = dynamic(() => import("./VehicleTestDriveForm"));
const VehicleSimilarCarousel = dynamic(() => import("./VehicleSimilarCarousel"));

function formatDealerAddress(): string {
  const a = ORG_POSTAL_ADDRESS;
  return `${a.streetAddress}, ${a.addressLocality}, ${a.addressRegion} ${a.postalCode}`;
}

function buildHeroSubtitle(
  snapshot: VehicleVdpSnapshot,
  heroBadge: string,
): string {
  const badge = heroBadge.trim();
  if (badge) return badge;
  const parts = [
    snapshot.locationShort || "Brisbane",
    `Dealer ${(snapshot.condition || "used").toLowerCase()}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

function buildQuickSpecs(snapshot: VehicleVdpSnapshot): VdpQuickSpecItem[] {
  const odo =
    snapshot.odometerKm != null && snapshot.odometerKm > 0
      ? `${snapshot.odometerKm.toLocaleString("en-AU")} km`
      : "—";
  // At-a-glance lines use buyer wording: the recovered powertrain and
  // "Automatic"/"Manual". The exact feed values stay in the specifications tab.
  const fuel = displayFuelType({
    feedFuelType: snapshot.fuelType,
    name: snapshot.description || snapshot.title,
    comments: snapshot.comments,
  });
  return [
    { label: "Odometer", value: odo, icon: "speedometer2" },
    { label: "Body type", value: snapshot.bodyType || "—", icon: "truck" },
    { label: "Fuel", value: fuel || "—", icon: "fuel-pump-fill" },
    {
      label: "Transmission",
      value: simplifyTransmission(snapshot.transmission) || "—",
      icon: "gear-fill",
    },
  ];
}

function VdpFaqSection({ faqs }: { faqs: VehicleVdpAiFaq[] }) {
  return (
    <section
      className="cs-card p-4 p-lg-5 mb-4 cs-faq vdp-ref-faq"
      id="vehicle-faq"
    >
      <h2 className="h4 fw-bold mb-3">Frequently asked questions</h2>
      {faqs.length === 0 ? (
        <p className="cs-muted mb-0">
          No generated FAQs for this listing. Contact the dealer with your
          questions.
        </p>
      ) : (
        <div className="vdp-ref-faq-list">
          {faqs.map((faq, i) => (
            <details key={i} className="vdp-ref-faq-item" open={i === 0}>
              <summary className="vdp-ref-faq-summary">{faq.question}</summary>
              <div className="vdp-ref-faq-body cs-muted">
                {(faq.answer.includes("\n\n")
                  ? faq.answer
                      .split(/\n{2,}/)
                      .map((b) => b.trim())
                      .filter(Boolean)
                  : [faq.answer]
                ).map((block, j) => (
                  <p
                    key={j}
                    className={j === 0 ? "mb-0 mt-2" : "mb-0 mt-3 small"}
                  >
                    {block}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

export interface VehicleVdpRefPageProps {
  snapshot: VehicleVdpSnapshot;
  ai: VehicleVdpAiContent;
  headline: string;
  featuredImage: string;
  galleryImages: VehicleImage[];
  listingTitle: string;
  showDriveAway: boolean;
  priceMain: string;
  priceCaption: string;
  catalogHref: string;
  catalogLabel: string;
  breadcrumbMake: string;
  breadcrumbMakeHref: string;
  telHref: string;
  dealerPhone: string;
  enquiryItem: VehicleEnquiryItemPayload;
  similarItems: SimilarCarItem[];
  /** Canonical absolute URL of this listing, used by the share buttons. */
  shareUrl: string;
  /** WordPress CMS overview (tag-substituted), shown above Key highlights. */
  cmsOverview?: string;
}

export default function VehicleVdpRefPage({
  snapshot,
  ai,
  headline,
  featuredImage,
  galleryImages,
  listingTitle,
  showDriveAway,
  priceMain,
  priceCaption,
  catalogHref,
  catalogLabel,
  breadcrumbMake,
  breadcrumbMakeHref,
  telHref,
  dealerPhone,
  enquiryItem,
  similarItems,
  shareUrl,
  cmsOverview = "",
}: VehicleVdpRefPageProps) {
  const heroSubtitle = buildHeroSubtitle(snapshot, ai.heroBadge);
  const quickSpecs = buildQuickSpecs(snapshot);

  const vdpAnalytics = {
    stockNumber: snapshot.stockNumber,
    make: snapshot.make,
    model: snapshot.model,
    year: snapshot.year,
    slug: snapshot.slug,
  };

  return (
    <div className="vdp-ref">
      <script
        id="cs-textus-vehicle"
        type="application/json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(enquiryItem) }}
      />
      <VdpAnalytics {...vdpAnalytics} />
      <VdpScrollStickyBar
        headline={headline}
        priceMain={priceMain}
        priceCaption={priceCaption}
        vehicleImage={featuredImage || undefined}
        imageAlt={listingTitle}
      />

      <section className="vdp-ref-main pb-4 pb-md-5 pt-3 pt-md-4">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-8">
              <header
                className="vdp-ref-page-header mb-3 mb-md-4"
                data-vdp-page-header
              >
                <nav
                  className="vdp-ref-breadcrumb mb-3"
                  aria-label="Breadcrumb"
                >
                  <Link className="vdp-ref-breadcrumb-link" href="/">
                    Home
                  </Link>
                  <span className="vdp-ref-breadcrumb-sep" aria-hidden>
                    {" "}
                    /{" "}
                  </span>
                  <Link className="vdp-ref-breadcrumb-link" href={catalogHref}>
                    {catalogLabel}
                  </Link>
                  <span className="vdp-ref-breadcrumb-sep" aria-hidden>
                    {" "}
                    /{" "}
                  </span>
                  <Link
                    className="vdp-ref-breadcrumb-link"
                    href={breadcrumbMakeHref}
                  >
                    {breadcrumbMake || "Vehicles"}
                  </Link>
                </nav>
                <h1 className="vdp-ref-page-title display-6 fw-bold cs-title-tight mb-2">
                  {headline}
                </h1>
                <p className="vdp-ref-hero-subtitle mb-0">{heroSubtitle}</p>
                {ai.heroLead.trim() ? (
                  <p className="cs-muted mt-2 mb-0 small">{ai.heroLead}</p>
                ) : null}
              </header>

              <div className="cs-card p-3 mb-3 d-lg-none vdp-ref-mobile-price">
                <VdpShareLinks
                  title={headline}
                  shareUrl={shareUrl}
                  mediaUrl={enquiryItem.image}
                  className="vdp-ref-share--compact mb-2"
                />
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div className="min-w-0">
                    <p className="vdp-ref-mobile-price__label mb-1 small text-uppercase fw-semibold text-secondary">
                      Price
                    </p>
                    <div className="cs-price mb-0">{priceMain || "—"}</div>
                  </div>
                </div>
                <p className="vdp-ref-price-caption text-primary small fw-semibold mb-2 mt-1">
                  {priceCaption}
                </p>
                <p className="cs-muted small mb-0">
                  {showDriveAway
                    ? "Drive away price shown where applicable. "
                    : ""}
                  Finance available subject to approval.
                </p>
              </div>

              <div className="vdp-ref-gallery-wrap">
                {featuredImage || galleryImages.length > 0 ? (
                  <VehicleGallery
                    featuredImage={featuredImage}
                    galleryImages={galleryImages}
                    title={listingTitle}
                  />
                ) : (
                  <div className="cs-card p-5 text-center cs-muted">
                    No photos available
                  </div>
                )}
              </div>

              <VdpQuickSpecsRow items={quickSpecs} />

              <VdpKeyHighlights chips={ai.highlightChips} />

              <VdpDealerCommentsExpandable
                paragraphs={ai.dealerCommentsParagraphs}
                featureBullets={ai.dealerCommentsBullets}
              />

              <VdpCarDetailsTabs
                overviewParagraphs={ai.overviewParagraphs}
                carDetailsRows={ai.carDetailsRows}
                featureItems={ai.featureItems}
                engineTowingRows={ai.engineTowingRows}
                feedRows={buildFeedSpecRows(snapshot)}
              />

              <VdpFaqSection faqs={ai.faqs} />

              {/* SEO overview sits below the FAQ: buyers get vehicle, price,
                  specs and photos first; Google still gets the content. */}
              <VdpCmsOverview text={cmsOverview} />

              <section
                className="cs-card p-4 p-lg-5 mt-4 d-lg-none"
                id="vehicle-enquiry-mobile"
              >
                <VdpRefPhoneReveal
                  dealerPhone={dealerPhone}
                  telHref={telHref}
                  stockNumber={snapshot.stockNumber}
                  make={snapshot.make}
                  model={snapshot.model}
                  year={snapshot.year}
                  slug={snapshot.slug}
                  showDivider={false}
                  className="mb-4 pb-4 border-bottom"
                />
                <h2 className="h4 fw-bold mb-3">
                  Ask about this {snapshot.make} {snapshot.model}
                </h2>
                <VehicleVdpRefInlineEnquiry item={enquiryItem} />
              </section>

              <section
                className="cs-card p-4 p-lg-5 mt-4"
                id="schedule-test-drive"
              >
                <h2 className="h4 fw-bold mb-3">Schedule a test drive</h2>
                <p className="cs-muted mb-3">
                  Call us or submit the form below — we will confirm a time that
                  suits you.
                </p>
                <VdpRefPhoneReveal
                  dealerPhone={dealerPhone}
                  telHref={telHref}
                  stockNumber={snapshot.stockNumber}
                  make={snapshot.make}
                  model={snapshot.model}
                  year={snapshot.year}
                  slug={snapshot.slug}
                  showDivider={false}
                  className="mb-4"
                />
                <VehicleTestDriveForm item={enquiryItem} />
              </section>

              {similarItems.length > 0 ? (
                <div className="cs-card p-4 p-lg-5 mb-4 vdp-ref-main-similar mt-4">
                  <VehicleSimilarCarousel items={similarItems} />
                </div>
              ) : null}
            </div>

            <aside className="col-lg-4 vdp-ref-sidebar">
              <div>
                <div className="cs-card p-4 mb-4 shadow-sm vdp-ref-price-card d-none d-lg-block">
                  <VdpShareLinks
                    title={headline}
                    shareUrl={shareUrl}
                    mediaUrl={enquiryItem.image}
                    className="mb-3 pb-3 border-bottom"
                  />
                  <div className="cs-price mb-1">{priceMain || "—"}</div>
                  <p className="vdp-ref-price-caption text-primary small fw-semibold mb-2">
                    {priceCaption}
                  </p>
                  <p className="cs-muted small mb-0">
                    {showDriveAway
                      ? "Drive away price shown where applicable. "
                      : ""}
                    Finance available subject to approval.
                  </p>
                </div>

                <div
                  className="cs-card p-4 mb-4 vdp-ref-sidebar-enquiry d-none d-lg-block"
                  id="vehicle-enquiry"
                >
                  <VdpRefPhoneReveal
                    dealerPhone={dealerPhone}
                    telHref={telHref}
                    stockNumber={snapshot.stockNumber}
                    make={snapshot.make}
                    model={snapshot.model}
                    year={snapshot.year}
                    slug={snapshot.slug}
                    showDivider={false}
                    className="mb-4 pb-4 border-bottom"
                  />
                  <h2 className="h5 fw-bold mb-3">
                    Get in touch with the dealer
                  </h2>
                  <VehicleVdpRefInlineEnquiry item={enquiryItem} />
                </div>

                <div className="cs-card p-4 mb-4 vdp-ref-location-card">
                  {/* <h3 className="h6 fw-bold mb-1">Call the dealer</h3>
                  <a
                    href={telHref}
                    className="vdp-ref-sidebar-phone d-block fw-bold text-decoration-none mb-3"
                  >
                    {dealerPhone}
                  </a> */}
                  <h3 className="h6 fw-bold mb-3">Location and hours</h3>
                  <div className="vstack gap-3">
                    <div className="cs-contact-row">
                      <span className="cs-contact-icon">
                        <i className="bi bi-geo-alt-fill" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <a
                          href={ORG_GOOGLE_MAPS_PLACE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cs-business-link vdp-ref-location-link d-inline-block small"
                        >
                          {formatDealerAddress()}, Australia
                        </a>
                      </div>
                    </div>
                    <hr className="my-0 text-secondary opacity-25" />
                    <div className="cs-contact-row">
                      <span className="cs-contact-icon">
                        <i className="bi bi-clock-fill" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="mb-1 text-secondary small">
                          Mon–Fri: 8:00am–5:30pm
                        </p>
                        <p className="mb-1 text-secondary small">
                          Sat: 8:00am–3:00pm
                        </p>
                        <p className="mb-0 text-secondary small">Sun: Closed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="row mt-2">
            <div className="col-12">
              <div className="p-4 vdp-ref-disclaimer">
                <h2 className="h6 fw-bold mb-2">Disclaimer</h2>
                <p className="cs-muted small mb-0">
                  Please confirm price, specifications, features, and photo
                  availability with Car Sales Brisbane before purchase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
