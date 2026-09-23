import Link from "next/link";
import dynamic from "next/dynamic";
import type { VehicleImage } from "@/types/vehicle";
import type { VehicleEnquiryItemPayload } from "./VehicleEnquiryForm";
import VehicleGallery from "./VehicleGallery";
import type { SimilarCarItem } from "./VehicleSimilarCarousel";

const VehicleEnquiryForm = dynamic(() => import("./VehicleEnquiryForm"));
const VehicleSimilarCarousel = dynamic(() => import("./VehicleSimilarCarousel"));

export type SoldVehicleViewProps = {
  titleLine: string;
  variantLine: string;
  featuredImage: string;
  galleryImages: VehicleImage[];
  specs: { label: string; value: string }[];
  enquiryItem: VehicleEnquiryItemPayload;
  similarItems: SimilarCarItem[];
  telHref: string;
  dealerPhone: string;
};

/**
 * A vehicle that has sold within the last 30 days.
 *
 * Kept visible, clearly marked SOLD, so the page is still useful to anyone
 * who arrives from Google, an ad or a shared link: it shows the kind of car
 * the dealership sells and turns the visit into a "find me something similar"
 * lead. The price is deliberately not shown and nothing on the page offers the
 * car itself, so it cannot be read as available.
 */
export default function SoldVehicleView({
  titleLine,
  variantLine,
  featuredImage,
  galleryImages,
  specs,
  enquiryItem,
  similarItems,
  telHref,
  dealerPhone,
}: SoldVehicleViewProps) {
  const name = [titleLine, variantLine].filter(Boolean).join(" ");

  return (
    <section className="vdp-ref vdp-sold pb-5 pt-3 pt-md-4">
      <div className="container">
        <nav className="vdp-ref-breadcrumb mb-3" aria-label="Breadcrumb">
          <Link className="vdp-ref-breadcrumb-link" href="/">
            Home
          </Link>
          <span className="vdp-ref-breadcrumb-sep" aria-hidden>
            {" "}/{" "}
          </span>
          <Link className="vdp-ref-breadcrumb-link" href="/search/car-sales-in-brisbane">
            Used Cars
          </Link>
        </nav>

        <div className="row g-4">
          <div className="col-lg-7">
            <p className="mb-2">
              <span className="vdp-sold__badge">SOLD</span>
            </p>
            <h1 className="vdp-ref-page-title display-6 fw-bold cs-title-tight mb-1">
              {titleLine}
            </h1>
            {variantLine ? (
              <p className="vdp-ref-page-variant mb-3">{variantLine}</p>
            ) : null}

            <div className="vdp-sold__gallery">
              {featuredImage || galleryImages.length > 0 ? (
                <VehicleGallery
                  featuredImage={featuredImage}
                  galleryImages={galleryImages}
                  title={`${name} (sold)`}
                />
              ) : null}
            </div>

            {specs.length > 0 ? (
              <dl className="vdp-sold__specs mt-3">
                {specs.map((s) => (
                  <div key={s.label}>
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          <aside className="col-lg-5">
            <div className="cs-card p-4 vdp-sold__card">
              <h2 className="h4 fw-bold mb-2">This one has been sold</h2>
              <p className="cs-muted mb-3">
                Missed out? Tell us what you were after and we will let you
                know when something similar comes in, or check the similar cars
                in stock below.
              </p>
              <VehicleEnquiryForm
                idPrefix="vdp-sold-similar"
                item={enquiryItem}
                formType="Find Me Something Similar"
                initialComments={`I missed out on the ${name}. Please let me know if you get something similar in.`}
                submitLabel="Find me something similar"
              />
              <p className="small cs-muted mt-3 mb-0">
                Or call <a href={telHref}>{dealerPhone}</a>, or{" "}
                <Link href="/search/car-sales-in-brisbane">browse current stock</Link>.
              </p>
            </div>
          </aside>
        </div>

        {similarItems.length > 0 ? (
          <div className="cs-card p-4 p-lg-5 mt-4">
            <VehicleSimilarCarousel items={similarItems} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
