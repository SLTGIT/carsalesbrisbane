"use client";

import { useEffect, useState } from "react";
import type { VehicleListing } from "@/types/inventory";
import { useInventorySearchUrl } from "@/components/vehicles/InventorySearchUrlContext";
import VehicleGrid from "@/components/vehicles/VehicleGrid";

export default function InventorySrpVehicleGrid({
  listings,
}: {
  listings: VehicleListing[];
}) {
  const { resultsView } = useInventorySearchUrl();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const view = mounted ? resultsView : "list";

  return <VehicleGrid listings={listings} view={view} />;
}
