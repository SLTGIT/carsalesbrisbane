import { NextResponse } from "next/server";
import { fetchDealerInventory, isBike } from "@/lib/dealer-solutions/fetch-inventory";
import { countByField } from "@/lib/inventory/query";

export type InventoryMakeRow = {
  name: string;
  count: number;
  make: string;
};

/**
 * GET /api/inventory/makes — distinct makes from the dealer feed, sorted by count (desc).
 * Only the home brands slider uses this, so motorbikes are left out.
 */
export async function GET() {
  try {
    const vehicles = (await fetchDealerInventory()).filter((v) => !isBike(v));
    const map = countByField(vehicles, "Make");
    const brands: InventoryMakeRow[] = [...map.entries()]
      .map(([name, count]) => ({
        name: name.trim(),
        count,
        make: name.trim().toLowerCase(),
      }))
      .filter((b) => b.name.length > 0)
      .sort(
        (a, b) =>
          b.count - a.count ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );

    return NextResponse.json(
      { brands },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    console.error("[api/inventory/makes]", e);
    return NextResponse.json(
      { brands: [] as InventoryMakeRow[] },
      { status: 503 }
    );
  }
}
