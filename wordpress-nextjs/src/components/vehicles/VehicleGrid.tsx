import type { VehicleListing } from "@/types/inventory";
import VehicleCard from "./VehicleCard";

interface VehicleGridProps {
  listings: VehicleListing[];
  view?: "grid" | "list";
  showNewArrivalBadge?: boolean;
}

export default function VehicleGrid({
  listings,
  view = "grid",
  showNewArrivalBadge = false,
}: VehicleGridProps) {
  return (
    <div
      className={`inventory-results-grid ${view === "list" ? "is-list" : "is-grid"}`}
      role="list"
    >
      {listings.map((listing) => (
        <div
          key={listing.id}
          role="listitem"
          className={view === "grid" ? "inventory-grid-item" : undefined}
        >
          <VehicleCard
            listing={listing}
            view={view}
            showNewArrivalBadge={showNewArrivalBadge}
          />
        </div>
      ))}
    </div>
  );
}
