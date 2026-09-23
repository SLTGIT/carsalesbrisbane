import type { DealerVehicle } from "@/types/inventory";
import { after } from "next/server";
import { fetchDealerInventory } from "@/lib/dealer-solutions/fetch-inventory";
import { dealerVehicleToListing } from "@/lib/inventory/transform";
import {
  pickFeaturedArrivalVehicles,
} from "@/lib/inventory/featured-arrivals";
import VehicleCard from "@/components/vehicles/VehicleCard";
import { warmVehicleVdpCachesForVehicles } from "@/lib/openai/warmVehicleVdpCache";
import styles from "./PopularCarTypes.module.scss";

export default async function PopularCarTypes() {
  let featured: DealerVehicle[] = [];
  try {
    const vehicles = await fetchDealerInventory();
    featured = pickFeaturedArrivalVehicles(vehicles, 4);
  } catch {
    featured = [];
  }

  if (featured.length === 0) {
    return null;
  }

  after(() => {
    void warmVehicleVdpCachesForVehicles(featured, { max: featured.length });
  });

  return (
    <section id="inventory" className="py-5">
      <div className="container">
        <div className="row mb-4 align-items-end">
          <div className="col-lg-8">
            <h2 className="display-6 fw-bold cs-title-tight">
              Today’s Featured Arrivals
            </h2>
          </div>
        </div>
        <div className={`row g-4 ${styles.swipeRow}`}>
          {featured.map((v) => {
            const listing = dealerVehicleToListing(v);
            return (
              <div key={listing.id} className="col-md-6 col-xl-3">
                <VehicleCard
                  listing={listing}
                  className="inventory-vehicle-card--home-featured h-100"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
