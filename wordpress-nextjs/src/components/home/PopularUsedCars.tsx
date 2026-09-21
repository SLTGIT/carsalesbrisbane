import Link from "next/link";
import Image from "next/image";
import { fetchDealerInventory, isBike } from "@/lib/dealer-solutions/fetch-inventory";
import type { DealerVehicle } from "@/types/inventory";
import { dominantUsedCondition } from "@/lib/inventory/popular-body-types";
import {
  filterDealerVehicles,
  parseInventorySearchParams,
  inventoryListingHref,
} from "@/lib/inventory/query";
import { dealerVehicleToListing } from "@/lib/inventory/transform";
import { vehicleCardHeadline } from "@/lib/inventory/card-display";
import type { InventoryFilterState } from "@/types/inventory";

type CardDef = {
  title: string;
  description: string;
  /** Fallback when no matching vehicle or no photo in feed */
  image: string;
  alt: string;
  filters: Partial<
    Pick<
      InventoryFilterState,
      "maxPrice" | "bodyType" | "driveType"
    >
  >;
};

const CARDS: CardDef[] = [
  {
    title: "Used Cars Under $15k Brisbane",
    description:
      "Reliable, inspected budget starters and city commuters.",
    image:
      "/assets/images/PopularUsedCars_1.jpg",
    alt: "Used Cars Under 15k Brisbane category image from Statewide Auto Group",
    filters: { maxPrice: 15000 },
  },
  {
    title: "Used 4x4s & Utes Brisbane",
    description:
      "ABN specialist stock. Hilux, Ranger, and Navara experts.",
    image:
      "/assets/images/PopularUsedCars_2.jpg",
    alt: "Used 4x4s and Utes Brisbane category image from Statewide Auto Group",
    filters: { driveType: ["4WD", "4x4"] },
  },
  {
    title: "Used SUVs for Brisbane Families",
    description: "Safety-first 7-seaters and luxury crossovers.",
    image:
      "/assets/images/PopularUsedCars_3.jpg",
    alt: "Used SUVs for Brisbane Families category image from Statewide Auto Group",
    filters: { bodyType: ["SUV"] },
  },
];

const PRICE_BUCKET_STEP = 5000;

function categoryHref(
  filters: CardDef["filters"],
  vehicles?: DealerVehicle[]
): string {
  const base = parseInventorySearchParams({});
  const state: InventoryFilterState = {
    ...base,
    page: 1,
    ...filters,
  };

  let href = inventoryListingHref(state, vehicles);
  if (!href.includes("?")) return href;

  if (filters.driveType && filters.driveType.length > 1) {
    for (const dt of filters.driveType) {
      href = inventoryListingHref({ ...state, driveType: [dt] }, vehicles);
      if (!href.includes("?")) return href;
    }
  }

  if (filters.maxPrice != null && state.minPrice === null) {
    const lo = Math.max(0, filters.maxPrice - PRICE_BUCKET_STEP);
    href = inventoryListingHref(
      { ...state, minPrice: lo, maxPrice: filters.maxPrice },
      vehicles
    );
    if (!href.includes("?")) return href;
  }

  return href;
}

function filterStateForCard(
  condition: string,
  filters: CardDef["filters"]
): InventoryFilterState {
  const base = parseInventorySearchParams({});
  return {
    ...base,
    condition,
    page: 1,
    ...filters,
  };
}

function firstVehicleWithPhoto(matches: DealerVehicle[]): DealerVehicle | null {
  const withPhoto = matches.find((v) => v.Photos?.[0]?.PhotoUrl?.trim());
  return withPhoto ?? null;
}

export default async function PopularUsedCars() {
  let condition = "Used";
  let vehicles: DealerVehicle[] = [];
  try {
    vehicles = (await fetchDealerInventory()).filter((v) => !isBike(v));
    condition = dominantUsedCondition(vehicles);
  } catch {
    // keep "Used", empty vehicles → all cards use fallback images
  }

  return (
    <section className="py-5 bg-white">
      <div className="container">
        <div className="row g-4 align-items-center">
          <div className="col-lg-8">
            <h2 className="display-6 fw-bold cs-title-tight">
              Shop Popular Used Cars in Brisbane
            </h2>
          </div>
        </div>
        <div className="row g-4 mt-1">
          {CARDS.map((card) => {
            const href = categoryHref(card.filters, vehicles);
            const matched = filterDealerVehicles(
              vehicles,
              filterStateForCard(condition, card.filters)
            );
            const hero = firstVehicleWithPhoto(matched);
            const listing = hero ? dealerVehicleToListing(hero) : null;
            const imageSrc =   card.image ?? listing?.featured_image;
            const imageAlt = listing
              ? `${vehicleCardHeadline(listing)} — ${card.title}`
              : card.alt;

            return (
              <div key={card.title} className="col-md-6 col-xl-4 d-flex">
                <article className="cs-card cs-srp-card overflow-hidden h-100 w-100 d-flex flex-column ">
                  <Link
                    href={href}
                    className="d-block text-decoration-none text-reset flex-shrink-0"
                  >
                    <Image
                      src={imageSrc}
                      alt={imageAlt}
                      width={640}
                      height={400}
                      className="w-100"
                      style={{ height: "auto", maxHeight: 280, objectFit: "cover" }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </Link>
                  <div className="p-4 d-flex flex-column flex-grow-1">
                    <h3 className="h5 fw-bold mb-2">{card.title}</h3>
                    <p className="text-secondary mb-2">{card.description}</p>
                    <Link
                      href={href}
                      className="btn btn-outline-primary cs-pill mt-auto align-self-start"
                    >
                      Browse Cars
                    </Link>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
