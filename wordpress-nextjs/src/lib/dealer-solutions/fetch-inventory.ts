import type { DealerInventoryFeed, DealerVehicle } from "@/types/inventory";

const DEFAULT_REVALIDATE_SECONDS = 300;
/** Dealer Solutions `Type` codes that mean two wheels. */

/**
 * Server-only: fetches the Dealer Solutions MostRecentFile JSON.
 * Configure DEALER_SOLUTIONS_INVENTORY_URL, DEALER_SOLUTIONS_USER, DEALER_SOLUTIONS_PASSWORD.
 */
export async function fetchDealerInventory(): Promise<DealerVehicle[]> {
  const url = process.env.DEALER_SOLUTIONS_INVENTORY_URL;
  const user = process.env.DEALER_SOLUTIONS_USER;
  const pass = process.env.DEALER_SOLUTIONS_PASSWORD;

  if (!url || !user || !pass) {
    console.warn(
      "[dealer-solutions] Missing env: DEALER_SOLUTIONS_INVENTORY_URL, DEALER_SOLUTIONS_USER, or DEALER_SOLUTIONS_PASSWORD — returning no vehicles."
    );
    return [];
  }

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    console.error("[dealer-solutions] HTTP", res.status, await res.text().catch(() => ""));
    throw new Error(`Dealer inventory request failed: ${res.status}`);
  }

  const data = (await res.json()) as DealerInventoryFeed;
  const vehicles = data.Vehicles.filter((v)=> v.Type !== 'BIK');
  return Array.isArray(data.Vehicles) ? vehicles : [];
}
