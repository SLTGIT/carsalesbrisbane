import Link from "next/link";
import { fetchDealerInventory } from "@/lib/dealer-solutions/fetch-inventory";
import { dealerVehicleToListing } from "@/lib/inventory/transform";
import { sortDealerVehicles } from "@/lib/inventory/query";
import VehicleCard from "@/components/vehicles/VehicleCard";
// Same source the vehicle page uses for Car Sales Brisbane's number.
const DEALER_PHONE = process.env.NEXT_PUBLIC_DEALER_PHONE || "0418 908 870";
const DEALER_PHONE_TEL = DEALER_PHONE.replace(/\s/g, "");

export const metadata = {
  title: "This vehicle is no longer listed | Car Sales Brisbane",
  robots: { index: false, follow: true },
};

/**
 * A vehicle that has left the feed.
 *
 * The inventory feed only carries current stock, so a car that sells simply
 * disappears and its page used to return a bare 404 — a dead end for anyone
 * arriving from Google, an ad or a shared link, which is exactly where the
 * most motivated buyers come from. They land here instead, with current stock
 * and a way to ask for something similar.
 */
export default async function VehicleNotFound() {
  let latest: ReturnType<typeof dealerVehicleToListing>[] = [];
  try {
    const vehicles = await fetchDealerInventory();
    latest = sortDealerVehicles(vehicles, "new-arrival")
      .slice(0, 3)
      .map(dealerVehicleToListing);
  } catch {
    // Feed unavailable: the page still has to offer a way forward.
    latest = [];
  }

  return (
    <section className="py-5">
      <div className="container py-lg-4">
        <div className="row justify-content-center text-center mb-4">
          <div className="col-lg-8">
            <h1 className="display-6 fw-bold cs-title-tight mb-3">
              This vehicle is no longer listed
            </h1>
            <p className="lead cs-muted mb-4">
              It has most likely been sold. We get new stock in regularly, and
              we can look for something similar — tell us what you were after
              and we will come back to you.
            </p>
            <div className="d-flex flex-wrap gap-3 justify-content-center">
              <Link className="btn btn-primary cs-pill px-4" href="/contact">
                Find me something similar
              </Link>
              <Link
                className="btn btn-outline-primary cs-pill px-4"
                href="/search/used-cars-for-sale"
              >
                Browse current stock
              </Link>
              <a
                className="btn btn-outline-primary cs-pill px-4"
                href={`tel:${DEALER_PHONE_TEL}`}
              >
                Call {DEALER_PHONE}
              </a>
            </div>
          </div>
        </div>

        {latest.length > 0 ? (
          <>
            <h2 className="h4 fw-bold text-center mb-3">Latest arrivals</h2>
            <div className="row g-4">
              {latest.map((listing) => (
                <div className="col-md-6 col-lg-4" key={listing.slug}>
                  <VehicleCard listing={listing} />
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
