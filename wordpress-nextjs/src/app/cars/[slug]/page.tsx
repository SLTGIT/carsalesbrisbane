import { notFound, permanentRedirect } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import VehicleVdpRefPage from "@/components/vehicles/VehicleVdpRefPage";
import {
  loadVehicleVdpBySlug,
  loadVehicleVdpMetaBySlug,
} from "@/lib/openai/loadVehicleVdpBySlug";
import { formatVehicleVdpBrowserTitle } from "@/lib/wordpress/vdp-meta";
import { dealerVehicleToListing } from "@/lib/inventory/transform";
import { buildVehicleSlug } from "@/lib/inventory/slug";
import {
  inventoryListingHref,
  parseInventorySearchParams,
} from "@/lib/inventory/query";
import { getSimilarVehicles } from "@/lib/inventory/similar";
import type { DealerVehicle } from "@/types/inventory";
import type { VehicleImage } from "@/types/vehicle";
import type { SimilarCarItem } from "@/components/vehicles/VehicleSimilarCarousel";
import {
  defaultOpenGraphLogoImage,
  getCurrentUrlAndRoute,
  normalizePublicSiteBase,
  resolvePublicOriginFromRequest,
  siteUrlMetadataFields,
} from "@/lib/site-url";
import {
  dealerPhoneToE164Au,
  upgradeHttpToHttpsUrl,
  vehicleVdpCarListingGraphJsonLd,
} from "@/lib/json-ld";

import "./vdp-ref.scss";

/** Align with dealer inventory (5 min); VDP meta templates refresh faster via `vdp-meta` cache tag. */
export const revalidate = 300;

interface VehicleDetailPageProps {
  params: Promise<{ slug: string }>;
}

function absoluteShareUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (base) return `${normalizePublicSiteBase(base)}${path}`;
  return path;
}

function absoluteAssetUrl(url: string, pageUrl: string): string {
  const u = url.trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  let base = "";
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (raw) base = normalizePublicSiteBase(raw);
  if (!base) {
    try {
      base = new URL(pageUrl).origin;
    } catch {
      return u;
    }
  }
  if (u.startsWith("/")) return `${base}${u}`;
  return `${base}/${u}`;
}

function toSimilarItem(v: DealerVehicle): SimilarCarItem {
  const l = dealerVehicleToListing(v);
  const tags = [l.body_type, l.transmission, l.fuel_type].filter(
    Boolean
  ) as string[];
  return {
    slug: l.slug,
    title: l.title.length > 72 ? `${l.title.slice(0, 69)}…` : l.title,
    year: l.year,
    make: l.make,
    model: l.model,
    image: l.featured_image,
    condition: l.condition,
    price: l.formatted_price || "—",
    odometer:
      l.odometer != null && l.odometer > 0
        ? `${l.odometer.toLocaleString("en-AU")} km`
        : null,
    location: l.location_short,
    tags,
  };
}

export async function generateMetadata({ params }: VehicleDetailPageProps) {
  const { slug } = await params;
  const res = await loadVehicleVdpMetaBySlug(slug);
  if (!res.ok) {
    return { title: "Vehicle not found | Car Sales Brisbane" };
  }
  const { listing, vehicle: v, seoTitle, metaDescription, featuredImage, canonicalPath } =
    res;
  const image = featuredImage || listing.featured_image;
  const { currentUrl, currentRoute } =
    await getCurrentUrlAndRoute(canonicalPath);
  const pageTitle = formatVehicleVdpBrowserTitle(seoTitle);
  const desc = metaDescription;
  const origin = new URL(currentUrl).origin;
  return {
    title: pageTitle,
    description: desc,
    ...siteUrlMetadataFields(currentUrl, currentRoute),
    openGraph: image
      ? {
          title: pageTitle,
          description: desc,
          url: currentUrl,
          images: [{ url: image, alt: pageTitle }],
        }
      : {
          title: pageTitle,
          description: desc,
          url: currentUrl,
          images: [defaultOpenGraphLogoImage(origin)],
        },
  };
}

export default async function VehicleDetailPage({
  params,
}: VehicleDetailPageProps) {
  const { slug } = await params;
  const res = await loadVehicleVdpBySlug(slug);
  if (res.ok === false && res.error === "redirect") {
    permanentRedirect(res.redirectTo);
  }
  if (!res.ok) notFound();

  const { vehicle: v, listing, snapshot, ai, seo, allVehicles } = res;
  const canonicalSlug = buildVehicleSlug(v);
  const sharePath = `/cars/${canonicalSlug}`;
  let shareUrl = absoluteShareUrl(sharePath);
  if (!shareUrl.startsWith("http")) {
    shareUrl = `${await resolvePublicOriginFromRequest()}${sharePath}`;
  }

  const featured = v.Photos?.[0]?.PhotoUrl ?? listing.featured_image ?? "";
  const galleryImages: VehicleImage[] = (v.Photos ?? []).slice(1).map((p, i) => ({
    id: i,
    url: p.PhotoUrl,
    thumbnail: p.PhotoUrl,
    medium: p.PhotoUrl,
    large: p.PhotoUrl,
    alt: listing.title,
  }));

  // Full "YEAR Make Model Badge Series" — the same string the cards show, so a
  // buyer arriving from the grid sees the variant they clicked.
  const headline = listing.headline || listing.title;

  const dealerPhone = process.env.NEXT_PUBLIC_DEALER_PHONE || "0418 908 870";
  const telHref = `tel:${dealerPhone.replace(/\s/g, "")}`;
  const priceMain =
    listing.show_drive_away && listing.drive_away_price
      ? listing.drive_away_price
      : listing.formatted_price || "—";
  const enquiryItemImage = absoluteAssetUrl(featured, shareUrl);
  const enquiryItem = {
    image: enquiryItemImage,
    make: v.Make?.trim() || "",
    model: v.Model?.trim() || "",
    year: String(listing.year),
    stock: listing.stock_number || String(v.ItemID),
    rego: "",
    status: "In stock",
    tag: "Car Sales Brisbane",
    url: shareUrl,
    condition: listing.condition || v.Condition || "used",
    price: priceMain !== "—" ? priceMain : "",
  };

  const similar = getSimilarVehicles(allVehicles, v, 6).map(toSimilarItem);

  const condLower = (listing.condition || "used").toLowerCase();
  const catalogHref =
    condLower === "new" ? "/search" : "/search";
  const catalogLabel = condLower === "new" ? "New Cars" : "Used Cars";
  const breadcrumbMake = (v.Make?.trim() || listing.make || "").trim();
  const breadcrumbMakeHref = breadcrumbMake
    ? inventoryListingHref(
        {
          ...parseInventorySearchParams({}),
          make: breadcrumbMake.toLowerCase(),
          page: 1,
        },
        allVehicles
      )
    : "/search";

  const priceCaption =
    listing.show_drive_away && listing.drive_away_price
      ? "Drive away price"
      : "Excl. Govt. Charges";

  const { currentUrl: pageUrl } = await getCurrentUrlAndRoute(sharePath);
  const pageUrlHttps = upgradeHttpToHttpsUrl(pageUrl);
  const origin = new URL(pageUrlHttps).origin;
  const vdpJsonLd = vehicleVdpCarListingGraphJsonLd(origin, v, listing, {
    canonicalPageUrl: pageUrlHttps,
    description: seo.metaDescription,
    dealerPhoneE164: dealerPhoneToE164Au(dealerPhone),
    inventoryVehicles: allVehicles,
    faqs: ai.faqs,
  });

  return (
    <>
      <JsonLd data={vdpJsonLd} />
      <VehicleVdpRefPage
        snapshot={snapshot}
        ai={ai}
        headline={headline}
        featuredImage={featured}
        galleryImages={galleryImages}
        listingTitle={listing.title}
        showDriveAway={Boolean(
          listing.show_drive_away && listing.drive_away_price
        )}
        priceMain={priceMain}
        priceCaption={priceCaption}
        catalogHref={catalogHref}
        catalogLabel={catalogLabel}
        breadcrumbMake={breadcrumbMake}
        breadcrumbMakeHref={breadcrumbMakeHref}
        telHref={telHref}
        dealerPhone={dealerPhone}
        enquiryItem={enquiryItem}
        similarItems={similar}
        shareUrl={pageUrlHttps}
        cmsOverview={seo.overview}
      />
    </>
  );
}
