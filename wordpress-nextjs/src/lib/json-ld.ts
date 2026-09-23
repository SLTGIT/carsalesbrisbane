/**
 * Shared JSON-LD helpers and Car Sales Brisbane / Statewide Auto Group entities.
 */

import type {
  DealerVehicle,
  InventoryFilterState,
  VehicleListing,
} from "@/types/inventory";
import {
  inventoryListingHref,
  parseInventorySearchParams,
} from "@/lib/inventory/query";
import {
  listingDisplayNumericPriceAud,
  parseInventoryOdometerKm,
  priceNumber,
} from "@/lib/inventory/transform";

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const ORGANIZATION_NAME = "Car Sales Brisbane";

/** ISO 8601 datetime → `YYYY-MM-DD` for BlogPosting schema dates. */
export function formatSchemaDate(isoDate: string): string {
  const trimmed = isoDate?.trim();
  if (!trimmed) return trimmed;
  return trimmed.slice(0, 10);
}

/** Comma-separated post tag names from WordPress `_embedded['wp:term']`. */
export function extractPostTagKeywords(post: {
  _embedded?: { "wp:term"?: unknown[][] };
}): string | undefined {
  const termGroups = post._embedded?.["wp:term"];
  if (!Array.isArray(termGroups)) return undefined;

  const names: string[] = [];
  for (const group of termGroups) {
    if (!Array.isArray(group)) continue;
    for (const term of group) {
      if (!term || typeof term !== "object") continue;
      const t = term as { taxonomy?: string; name?: string };
      if (t.taxonomy === "post_tag" && typeof t.name === "string" && t.name.trim()) {
        names.push(t.name.trim());
      }
    }
  }

  return names.length > 0 ? names.join(",") : undefined;
}

export type BlogPostingJsonLdInput = {
  headline: string;
  alternativeHeadline?: string;
  imageUrl?: string;
  keywords?: string;
  url: string;
  datePublished: string;
  dateModified: string;
  description?: string;
  articleBody?: string;
  authorName?: string;
  publisherName?: string;
};

/** Blog detail JSON-LD — BlogPosting fields only (no @graph extras). */
export function blogPostingJsonLd(
  input: BlogPostingJsonLdInput,
): Record<string, unknown> {
  const publisherName = input.publisherName ?? ORGANIZATION_NAME;
  const url = upgradeHttpToHttpsUrl(input.url);
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.headline,
    url,
    datePublished: formatSchemaDate(input.datePublished),
    dateCreated: formatSchemaDate(input.datePublished),
    dateModified: formatSchemaDate(input.dateModified),
    publisher: { "@type": "Thing", name: publisherName },
  };

  const alternativeHeadline = input.alternativeHeadline?.trim();
  if (alternativeHeadline) node.alternativeHeadline = alternativeHeadline;
  if (input.imageUrl) node.image = upgradeHttpToHttpsUrl(input.imageUrl);
  if (input.keywords) node.keywords = input.keywords;
  if (input.description) node.description = input.description;
  if (input.articleBody) node.articleBody = input.articleBody;
  if (input.authorName) {
    node.author = { "@type": "Person", name: input.authorName };
  }

  return node;
}

export type FaqItem = { question: string; answer: string };

function normalizeAcfFaqItems(items: unknown[]): FaqItem[] {
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const it = item as Record<string, unknown>;
      const rawQuestion = typeof it.question === "string" ? it.question : "";
      const rawAnswer = typeof it.answer === "string" ? it.answer : "";
      const question = stripHtml(rawQuestion).trim();
      const answer = stripHtml(rawAnswer).replace(/\s+/g, " ").trim();
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter(Boolean) as FaqItem[];
}

/** Parse WordPress ACF `faq` (JSON string, repeater array, or FAQPage shape). */
export function parseAcfFaqField(rawFaq: unknown): FaqItem[] {
  if (!rawFaq) return [];

  if (typeof rawFaq === "string") {
    const trimmed = rawFaq.trim();
    if (!trimmed) return [];
    try {
      return parseAcfFaqField(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  if (Array.isArray(rawFaq)) {
    return normalizeAcfFaqItems(rawFaq);
  }

  if (typeof rawFaq !== "object") {
    return [];
  }

  const obj = rawFaq as Record<string, unknown>;
  if (Array.isArray(obj.mainEntity)) {
    return normalizeAcfFaqItems(
      obj.mainEntity
        .map((entity) => {
          if (!entity || typeof entity !== "object") return null;
          const e = entity as Record<string, unknown>;
          return {
            question: e.name,
            answer:
              (e.acceptedAnswer as Record<string, unknown> | undefined)?.text ??
              "",
          };
        })
        .filter(Boolean) as unknown[],
    );
  }

  return [];
}

export function faqPageJsonLd(
  pageUrl: string,
  faqs: FaqItem[],
): Record<string, unknown> | null {
  const url = upgradeHttpToHttpsUrl(pageUrl);
  const items = faqs
    .map((f) => {
      const name = stripHtml(f.question || "").trim();
      const text = stripHtml(f.answer || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!name || !text) return null;
      return {
        "@type": "Question",
        name,
        acceptedAnswer: {
          "@type": "Answer",
          text,
        },
      };
    })
    .filter(Boolean) as Record<string, unknown>[];
  if (!items.length) return null;
  return {
    "@type": "FAQPage",
    "@id": `${url}#faqs`,
    mainEntity: items,
  };
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Same relationship wording as the site copy.
export const ORGANIZATION_DESCRIPTION =
  "Car Sales Brisbane, proudly supported by Statewide Auto Group, is an online used-car sales channel for Brisbane and Queensland buyers, specialising in vehicle sourcing, finance and Queensland-wide delivery.";

export const WEBSITE_DESCRIPTION =
  "Car Sales Brisbane is a leading provider of used cars in Australia. We offer a wide range of used cars for sale in Australia.";

/** Google Maps place URL for the showroom (VDP sidebar, external links). */
export const ORG_GOOGLE_MAPS_PLACE_URL =
  "https://www.google.com/maps/place/Car+Sales+Brisbane/@-27.5224896,153.2562743,17z/data=!3m1!4b1!4m6!3m5!1s0x6b91678932e7fccd:0x6a000d7f9589579b!8m2!3d-27.5224896!4d153.2562743!16s%2Fg%2F11vqstz67d?entry=ttu&g_ep=EgoyMDI2MDQwNi4wIKXMDSoASAFQAw%3D%3D";

/**
 * Clean profile URLs for sameAs (no /share/, no tracking query strings).
 * Facebook share links are replaced with the public page slug aligned to Instagram @carsalesbrisbaneau.
 */
export const ORG_SAME_AS = [
  "https://www.facebook.com/share/1DREXJCBhb/?mibextid=wwXIfr",
  "https://www.instagram.com/carsalesbrisbaneau?igsh=MTg5bmtic2hjdnNzMg%3D%3D&utm_source=qr",
  "https://www.tiktok.com/@carsalesbrisbane?_r=1&_t=ZS-95OLtLR1kfQ",
  ORG_GOOGLE_MAPS_PLACE_URL,
] as const;

/** Strip query/hash from outbound profile URLs (tracking params) for JSON-LD sameAs. */
export function urlWithoutQueryForSchema(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    let href = u.href;
    // Drop Facebook /share/ paths — prefer canonical profile when possible
    if (
      u.hostname.replace(/^www\./, "") === "facebook.com" &&
      u.pathname.includes("/share/")
    ) {
      href = "https://www.facebook.com/share/1DREXJCBhb/?mibextid=wwXIfr";
    }
    return href;
  } catch {
    return url.split("?")[0]?.split("#")[0] ?? url;
  }
}

/** Normalize asset URLs for JSON-LD (http → https; skip localhost). */
export function upgradeHttpToHttpsUrl(url: string): string {
  const t = (url || "").trim();
  if (!t) return t;
  if (t.startsWith("//")) return `https:${t}`;
  if (/^http:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        return t;
      }
    } catch {
      /* keep upgrading unknown hosts */
    }
    return `https://${t.slice(7)}`;
  }
  return t;
}

/** Physical dealership address (Ormiston showroom). */
export const ORG_POSTAL_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "56 Freeth St W",
  addressLocality: "Ormiston",
  addressRegion: "QLD",
  postalCode: "4160",
  addressCountry: "AU",
} as const;

/**
 * Statewide Auto Group, the dealership Car Sales Brisbane is an online sales
 * channel of. Referenced from both Car Sales Brisbane entities so search
 * engines and AI assistants can connect the two brands — the site describes the
 * relationship ("proudly supported by Statewide Auto Group"), and the
 * structured data now says the same thing instead of naming Car Sales
 * Brisbane as its own parent.
 */
const STATEWIDE_AUTO_GROUP_REF = {
  "@type": "AutoDealer",
  "@id": "https://statewideautogroup.com.au/#organization",
  name: "Statewide Auto Group",
  url: "https://statewideautogroup.com.au",
} as const;

/** Areas the business sells into and delivers to. */
const AREA_SERVED = [
  { "@type": "City", name: "Brisbane" },
  { "@type": "City", name: "Ormiston" },
  { "@type": "City", name: "Capalaba" },
  { "@type": "City", name: "Redland City" },
  { "@type": "State", name: "Queensland" },
];

export function organizationJsonLd(origin: string) {
  const siteOrigin = upgradeHttpToHttpsUrl(origin);
  const logoUrl = upgradeHttpToHttpsUrl(
    `${siteOrigin}/assets/images/carsalesbrisbane_logo.webp`,
  );
  return {
    "@type": "Organization",
    "@id": `${siteOrigin}/#organization`,
    name: "Car Sales Brisbane",
    url: siteOrigin,
    logo: { "@type": "ImageObject", url: logoUrl },
    description: ORGANIZATION_DESCRIPTION,
    telephone: "+61418908870",
    email: "sales@carsalesbrisbane.com.au",
    address: { ...ORG_POSTAL_ADDRESS },
    sameAs: ORG_SAME_AS.map((u) => urlWithoutQueryForSchema(u)),
    parentOrganization: STATEWIDE_AUTO_GROUP_REF,
    areaServed: AREA_SERVED,
    // Queensland motor dealer licence, as printed in the site footer.
    identifier: {
      "@type": "PropertyValue",
      propertyID: "QLD Motor Dealer Licence",
      value: "4065904",
    },
  };
}

export function webSiteJsonLd(
  origin: string,
  options?: { includeSearchAction?: boolean },
) {
  const siteOrigin = upgradeHttpToHttpsUrl(origin);
  const base: Record<string, unknown> = {
    "@type": "WebSite",
    "@id": `${siteOrigin}/#website`,
    name: "Car Sales Brisbane",
    url: siteOrigin,
    inLanguage: "en-AU",
    publisher: { "@id": `${siteOrigin}/#organization` },
    description: WEBSITE_DESCRIPTION,
  };
  if (options?.includeSearchAction) {
    base.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteOrigin}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    };
  }
  return base;
}

const dealerOpeningHours = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "17:30",
  },
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: "Saturday",
    opens: "08:00",
    closes: "15:00",
  },
];

export function autoDealerJsonLd(origin: string) {
  const siteOrigin = upgradeHttpToHttpsUrl(origin);
  return {
    "@type": "AutoDealer",
    "@id": `${siteOrigin}/#dealer`,
    name: "Car Sales Brisbane",
    image: upgradeHttpToHttpsUrl(
      `${siteOrigin}/assets/images/carsalesbrisbane_logo.png`,
    ),
    url: siteOrigin,
    telephone: "+61418908870",
    email: "sales@carsalesbrisbane.com.au",
    address: { ...ORG_POSTAL_ADDRESS },
    parentOrganization: STATEWIDE_AUTO_GROUP_REF,
    areaServed: AREA_SERVED,
    openingHoursSpecification: dealerOpeningHours,
  };
}

export function webPageJsonLd(input: {
  pageUrl: string;
  name: string;
  description: string;
  types?: string[];
  /** Primary entity on this page (e.g. Product #vehicle on a VDP). */
  mainEntity?: { "@id": string };
}) {
  const pageUrl = upgradeHttpToHttpsUrl(input.pageUrl);
  const origin = new URL(pageUrl).origin;
  const types = input.types?.length ? ["WebPage", ...input.types] : ["WebPage"];
  const node: Record<string, unknown> = {
    "@type": types.length === 1 ? types[0] : types,
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: input.name,
    description: input.description,
    inLanguage: "en-AU",
    isPartOf: { "@id": `${origin}/#website` },
    publisher: { "@id": `${origin}/#organization` },
  };
  if (input.mainEntity) node.mainEntity = input.mainEntity;
  return node;
}

export function breadcrumbJsonLd(
  pageUrl: string,
  items: { name: string; item: string }[],
  options?: { idFragment?: string },
) {
  const canonicalPage = upgradeHttpToHttpsUrl(pageUrl);
  const idFragment = options?.idFragment ?? "breadcrumb";
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonicalPage}#${idFragment}`,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: upgradeHttpToHttpsUrl(it.item),
    })),
  };
}

export function jsonLdGraph(...nodes: unknown[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}

const GOOGLE_VEHICLE_BODY_TYPES = new Set([
  "convertible",
  "coupe",
  "crossover",
  "full size van",
  "hatchback",
  "minivan",
  "sedan",
  "suv",
  "truck",
]);

/**
 * Maps feed body/type strings to Google vehicle listing bodyType vocabulary
 * (lowercase English: sedan, suv, truck, …).
 * @see https://developers.google.com/search/docs/appearance/structured-data/vehicle-listing
 */
export function normalizeBodyTypeForGoogleVehicle(
  bodyTypeRaw: string,
  typeCode: string,
): string | undefined {
  const raw = bodyTypeRaw.trim();
  const t = raw.toLowerCase();
  if (GOOGLE_VEHICLE_BODY_TYPES.has(t)) return t;
  if (t.includes("full") && t.includes("van")) return "full size van";

  if (/suv|s\.u\.v|sport utility/i.test(raw)) return "suv";
  if (
    /ute|utility|pick.?up|pickup|cab.?chassis|dual.?cab|tray|chassis/i.test(t)
  )
    return "truck";
  if (/hatch/i.test(t)) return "hatchback";
  if (/sedan|saloon/i.test(t)) return "sedan";
  if (/wagon|estate|touring|sw/i.test(t)) return "crossover";
  if (/coupe|koup/i.test(t)) return "coupe";
  if (/convertible|cabrio|roadster/i.test(t)) return "convertible";
  if (/mpv|people mover|passenger van/i.test(t)) return "minivan";
  if (/panel van|cargo van|full.?size van|commercial van/i.test(t))
    return "full size van";

  const c = (typeCode || "").trim().toUpperCase();
  if (c === "TRU") return "truck";

  for (const w of t.split(/[\s/-]+/).filter(Boolean)) {
    if (GOOGLE_VEHICLE_BODY_TYPES.has(w)) return w;
  }
  return undefined;
}

function driveWheelConfigurationFromFeed(drive: string): string | undefined {
  const t = drive.trim().toLowerCase();
  if (!t || t === "—") return undefined;
  if (/awd|all[-\s]?wheel/i.test(t))
    return "https://schema.org/AllWheelDriveConfiguration";
  if (/4wd|4x4|four[-\s]?wheel/i.test(t))
    return "https://schema.org/FourWheelDriveConfiguration";
  if (/fwd|front[-\s]?wheel/i.test(t))
    return "https://schema.org/FrontWheelDriveConfiguration";
  if (/rwd|rear[-\s]?wheel/i.test(t))
    return "https://schema.org/RearWheelDriveConfiguration";
  return undefined;
}

/** SEO Product.category: "Used SUVs", "New Sedans", "Used Cars", … */
function productCategoryLabel(
  conditionLower: string,
  bodyTypeNorm: string | undefined,
): string {
  const isNew = conditionLower === "new";
  const prefix = isNew ? "New" : "Used";
  if (!bodyTypeNorm) return `${prefix} Cars`;
  const map: Record<string, string> = {
    suv: `${prefix} SUVs`,
    truck: `${prefix} Trucks`,
    sedan: `${prefix} Sedans`,
    hatchback: `${prefix} Hatchbacks`,
    coupe: `${prefix} Coupes`,
    convertible: `${prefix} Convertibles`,
    crossover: `${prefix} Crossovers`,
    minivan: `${prefix} Minivans`,
    "full size van": `${prefix} Full Size Vans`,
  };
  return (
    map[bodyTypeNorm] ??
    `${prefix} ${bodyTypeNorm.charAt(0).toUpperCase()}${bodyTypeNorm.slice(1)}s`
  );
}

/** Breadcrumb trail for vehicle detail pages (absolute URLs). */
export function vehicleVdpBreadcrumbListItems(
  origin: string,
  canonicalPageUrl: string,
  listing: VehicleListing,
  v: DealerVehicle,
  inventoryVehicles?: DealerVehicle[],
): { name: string; item: string }[] {
  const siteOrigin = upgradeHttpToHttpsUrl(origin);
  const canonicalPage = upgradeHttpToHttpsUrl(canonicalPageUrl);
  const conditionLower = (listing.condition || "used").toLowerCase();
  const catalogHref =
    conditionLower === "new"
      ? `${siteOrigin}/search?condition=New`
      : `${siteOrigin}/search?condition=Used`;
  const catalogLabel = conditionLower === "new" ? "New Cars" : "Used Cars";

  const make = (v.Make?.trim() || listing.make || "").trim();
  const model = (v.Model?.trim() || listing.model || "").trim();
  const searchFilters: InventoryFilterState = {
    ...parseInventorySearchParams({}),
    make: make.toLowerCase(),
    page: 1,
  };
  if (model) searchFilters.model = model.toLowerCase();
  const makeHref = make
    ? `${siteOrigin}${inventoryListingHref(searchFilters, inventoryVehicles)}`
    : `${siteOrigin}/search`;

  const modelCrumbName =
    model ||
    (listing.title.length > 80
      ? `${listing.title.slice(0, 77)}…`
      : listing.title);

  return [
    { name: "Home", item: `${siteOrigin}/` },
    { name: catalogLabel, item: catalogHref },
    { name: make || "Vehicles", item: makeHref },
    { name: modelCrumbName, item: canonicalPage },
  ];
}

/**
 * VDP breadcrumb JSON-LD: Home > Used cars / New cars > Make > Model (no “Search”).
 */
export function vehicleVdpBreadcrumbJsonLd(
  pageUrl: string,
  origin: string,
  listing: VehicleListing,
  v: DealerVehicle,
  inventoryVehicles?: DealerVehicle[],
) {
  const canonicalPage = upgradeHttpToHttpsUrl(pageUrl);
  return breadcrumbJsonLd(
    canonicalPage,
    vehicleVdpBreadcrumbListItems(
      origin,
      canonicalPage,
      listing,
      v,
      inventoryVehicles,
    ),
  );
}

export type VehicleJsonLdOptions = {
  /** Canonical VDP URL (must match WebPage url); defaults to `${origin}/cars/${slug}` */
  canonicalPageUrl?: string;
};

function inferMakeFromTitle(title: string, year: number): string {
  const parts = title.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /^\d{4}$/.test(parts[0])) return parts[1];
  return parts[0] ?? "";
}

function inferModelFromTitle(
  title: string,
  year: number,
  make: string,
): string {
  const parts = title.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
  let i = 0;
  if (parts[0] && /^\d{4}$/.test(parts[0])) i = 1;
  if (make && parts[i]?.toLowerCase() === make.toLowerCase()) i += 1;
  const rest = parts
    .slice(i, i + 8)
    .join(" ")
    .trim();
  return rest || "Base";
}

/** Title-case bodyType for schema display (e.g. Truck, SUV, Full Size Van). */
function bodyTypeForSchemaDisplay(normalizedLower: string): string {
  const map: Record<string, string> = {
    suv: "SUV",
    truck: "Truck",
    sedan: "Sedan",
    hatchback: "Hatchback",
    coupe: "Coupe",
    convertible: "Convertible",
    crossover: "Crossover",
    minivan: "Minivan",
    "full size van": "Full Size Van",
  };
  if (map[normalizedLower]) return map[normalizedLower];
  return normalizedLower
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function feedPricingField(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "boolean") return "";
  if (typeof raw === "number" && Number.isFinite(raw))
    return String(Math.round(raw));
  return String(raw).trim();
}

/** First dollar amount in free text (title / description / comments). */
function extractAudPriceFromText(
  text: string | undefined | null,
): number | null {
  if (!text?.trim()) return null;
  const normalized = text.replace(/\u202f|\u00a0/g, " ");
  const m = normalized.match(/\$\s*[\d][\d,\s]*(?:\.\d{2})?\b/);
  if (!m) return null;
  return priceNumber(m[0]);
}

/** Best numeric AUD price for Offer (multiple feed fallbacks). */
function resolveVehicleOfferPriceAud(
  v: DealerVehicle,
  listing: VehicleListing,
): number | null {
  const fromVisibleListing = listingDisplayNumericPriceAud(listing);
  if (fromVisibleListing != null) return fromVisibleListing;

  const advertised = feedPricingField(v.Pricing?.AdvertisedPrice);
  const driveAway = feedPricingField(v.Pricing?.DriveAwayPrice);
  const egc = feedPricingField(v.Pricing?.EGCPrice);
  const primary =
    listing.show_drive_away && driveAway
      ? driveAway
      : advertised || driveAway || "";

  const candidates: Array<string | number | undefined | null> = [
    primary,
    advertised,
    driveAway,
    listing.formatted_price,
    listing.drive_away_price ?? undefined,
    egc,
  ];

  if (v.Pricing && typeof v.Pricing === "object") {
    for (const val of Object.values(v.Pricing)) {
      if (typeof val === "boolean") continue;
      if (typeof val === "number" || typeof val === "string") {
        candidates.push(val);
      }
    }
  }

  for (const raw of candidates) {
    const n = priceNumber(raw);
    if (n != null && n > 0 && Number.isFinite(n)) return n;
  }

  for (const txt of [listing.title, v.Description, v.Comments]) {
    const n = extractAudPriceFromText(txt);
    if (n != null && n > 0 && Number.isFinite(n)) return n;
  }

  return null;
}

/** Product description for merchant listings (meta, feed, or synthesized). */
export function buildVehicleListingDescription(
  listing: VehicleListing,
  v: DealerVehicle,
  preferred?: string,
): string {
  const preferredClean = stripHtml(preferred || "").trim();
  if (preferredClean.length >= 40) return preferredClean.slice(0, 5000);

  const feedDesc = stripHtml(
    [v.Description, v.Comments].filter(Boolean).join(" "),
  ).trim();
  if (feedDesc.length >= 40) return feedDesc.slice(0, 5000);

  const condition = (listing.condition || "used").toLowerCase();
  const year = listing.year || v.ManufactureYear;
  const make = (listing.make || v.Make || "").trim();
  const model = (listing.model || v.Model || "").trim();
  const title = listing.title.trim();
  const odo =
    listing.odometer != null && listing.odometer > 0
      ? `${Math.round(listing.odometer).toLocaleString("en-AU")} km`
      : null;
  const priceCue = listing.formatted_price?.trim();

  const headline =
    title || [year, make, model].filter(Boolean).join(" ").trim();
  const vehicleLine = [
    condition === "new" ? "New" : "Used",
    [make, model].filter(Boolean).join(" "),
    year ? `(${year})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const parts = [
    headline,
    vehicleLine
      ? `${vehicleLine} for sale at Car Sales Brisbane, Ormiston QLD.`
      : "For sale at Car Sales Brisbane, Ormiston QLD.",
    odo ? `Odometer ${odo}.` : null,
    priceCue ? `Listed at ${priceCue}.` : null,
    "Enquire online for finance options and Queensland-wide delivery.",
  ].filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 5000);
}

function buildVehicleOfferJsonLd(input: {
  productUrl: string;
  priceVal: number;
  itemCondition: string;
  sellerId: string;
  offerId?: string;
  priceSpecDescription?: string;
}): Record<string, unknown> {
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    ...(input.offerId ? { "@id": input.offerId } : {}),
    url: input.productUrl,
    price: String(input.priceVal),
    priceCurrency: "AUD",
    availability: "https://schema.org/InStock",
    itemCondition: input.itemCondition,
    seller: { "@id": input.sellerId },
  };

  if (input.priceSpecDescription) {
    offer.priceSpecification = {
      "@type": "PriceSpecification",
      price: String(input.priceVal),
      priceCurrency: "AUD",
      description: input.priceSpecDescription,
    };
  }

  return offer;
}

/**
 * Vehicle JSON-LD for inventory / VDP (Rich Results–friendly).
 */
export function vehicleJsonLdFromInventory(
  origin: string,
  v: DealerVehicle,
  listing: VehicleListing,
  options?: VehicleJsonLdOptions,
): Record<string, unknown> {
  const siteOrigin = upgradeHttpToHttpsUrl(origin);
  const rawProductUrl =
    options?.canonicalPageUrl ?? `${siteOrigin}/cars/${listing.slug}`;
  const productUrl = upgradeHttpToHttpsUrl(rawProductUrl);

  const priceVal = resolveVehicleOfferPriceAud(v, listing);

  const images = (v.Photos ?? [])
    .map((p) => upgradeHttpToHttpsUrl(p.PhotoUrl))
    .filter(Boolean)
    .slice(0, 12);

  const conditionLower = (listing.condition || "used").toLowerCase();
  const itemCondition =
    conditionLower === "new"
      ? "https://schema.org/NewCondition"
      : "https://schema.org/UsedCondition";

  const bodyTypeNorm = normalizeBodyTypeForGoogleVehicle(
    listing.body_type || v.BodyType?.trim() || "",
    listing.type_code,
  );
  const driveWheel = driveWheelConfigurationFromFeed(
    listing.drive_type || v.DriveType?.trim() || "",
  );
  const transmission = listing.transmission?.trim();
  const fuel = listing.fuel_type?.trim();

  const categoryLabel = productCategoryLabel(conditionLower, bodyTypeNorm);

  const makeName = (
    listing.make?.trim() ||
    v.Make?.trim() ||
    inferMakeFromTitle(listing.title, listing.year)
  ).trim();
  const modelName = (
    listing.model?.trim() ||
    v.Model?.trim() ||
    inferModelFromTitle(listing.title, listing.year, makeName)
  ).trim();

  const modelYear = v.ManufactureYear ?? listing.year;
  const yearStr =
    modelYear != null && Number.isFinite(Number(modelYear))
      ? String(modelYear)
      : undefined;

  const description = buildVehicleListingDescription(listing, v);

  const node: Record<string, unknown> = {
    "@type": "Vehicle",
    "@id": `${productUrl}#vehicle`,
    // Headline rather than the packed feed string, so the variant is the part
    // that surfaces in rich results. Falls back to the raw title.
    name: listing.headline || listing.title,
    description,
    url: productUrl,
    category: categoryLabel,
    itemCondition,
    brand: { "@type": "Brand", name: makeName || "Vehicle" },
    model: modelName,
    vehicleModelDate: yearStr,
    // productID: String(v.ItemID),
    mainEntityOfPage: { "@id": `${productUrl}#webpage` },
  };

  if (bodyTypeNorm) node.bodyType = bodyTypeForSchemaDisplay(bodyTypeNorm);
  // if (listing.stock_number) node.sku = listing.stock_number;

  const colour = v.BodyColour?.trim();
  if (colour) node.color = colour;

  const odoKm =
    listing.odometer != null &&
    Number.isFinite(listing.odometer) &&
    listing.odometer >= 0
      ? Math.round(Number(listing.odometer))
      : parseInventoryOdometerKm(v.Odometer);
  if (odoKm != null && Number.isFinite(odoKm) && odoKm >= 0) {
    // Schema.org Vehicle: same shape as Google vehicle examples (UN/CEFACT KMT = km).
    node.mileageFromOdometer = {
      "@type": "QuantitativeValue",
      value: String(Math.round(odoKm)),
      unitCode: "KMT",
    };
  }

  if (images.length) node.image = images;

  if (fuel) {
    node.fuelType = fuel;
    node.vehicleEngine = {
      "@type": "EngineSpecification",
    };
  }
  if (transmission) node.vehicleTransmission = transmission;
  if (driveWheel) node.driveWheelConfiguration = driveWheel;

  if (priceVal != null && Number.isFinite(priceVal) && priceVal > 0) {
    node.offers = buildVehicleOfferJsonLd({
      productUrl,
      priceVal,
      itemCondition,
      sellerId: `${siteOrigin}/#organization`,
      offerId: `${productUrl}#offer`,
    });
  }

  return Object.fromEntries(
    Object.entries(node).filter(([, val]) => val !== undefined),
  ) as Record<string, unknown>;
}

/** AU mobile/landline to E.164 for JSON-LD `telephone` (e.g. +61418908870). */
export function dealerPhoneToE164Au(raw: string): string {
  const t = (raw || "").trim();
  const d = t.replace(/\D/g, "");
  if (t.startsWith("+")) return t;
  if (d.startsWith("61") && d.length >= 11) return `+${d}`;
  if (d.startsWith("0") && d.length >= 9) return `+61${d.slice(1)}`;
  if (d.length >= 9) return `+${d}`;
  return "+61418908870";
}

function driveWheelPlainForCarSchema(drive: string): string | undefined {
  const t = drive.trim().toLowerCase();
  if (!t || t === "—") return undefined;
  if (/awd|all[-\s]?wheel/i.test(t)) return "AWD";
  if (/4wd|4x4|four[-\s]?wheel/i.test(t)) return "4WD";
  if (/fwd|front[-\s]?wheel/i.test(t)) return "FWD";
  if (/rwd|rear[-\s]?wheel/i.test(t)) return "RWD";
  return drive.trim();
}

export type VehicleVdpCarListingJsonLdInput = {
  /** Canonical VDP URL (https). */
  canonicalPageUrl: string;
  /** Vehicle summary for structured data (e.g. meta description). */
  description: string;
  dealerPhoneE164: string;
  /** Inventory feed for canonical `/search/{make}/{model}` breadcrumb URLs. */
  inventoryVehicles?: DealerVehicle[];
  /** FAQ items for FAQPage rich results (optional). */
  faqs?: { question: string; answer: string }[];
};

function vehicleVdpFaqPageJsonLd(
  canonicalProductUrl: string,
  faqs: FaqItem[],
): Record<string, unknown> | null {
  return faqPageJsonLd(canonicalProductUrl, faqs);
}

/**
 * Vehicle detail JSON-LD: `@graph` with `Vehicle`, `AutoDealer`, `BreadcrumbList`
 * (dealer-style shape for rich results), plus optional `FAQPage`.
 */
export function vehicleVdpCarListingGraphJsonLd(
  origin: string,
  v: DealerVehicle,
  listing: VehicleListing,
  input: VehicleVdpCarListingJsonLdInput,
): Record<string, unknown> {
  const siteOrigin = upgradeHttpToHttpsUrl(origin);
  const productUrl = upgradeHttpToHttpsUrl(
    input.canonicalPageUrl || `${siteOrigin}/cars/${listing.slug}`,
  );
  const priceVal = resolveVehicleOfferPriceAud(v, listing);
  const images = (v.Photos ?? [])
    .map((p) => upgradeHttpToHttpsUrl(p.PhotoUrl))
    .filter(Boolean)
    .slice(0, 12);

  const conditionLower = (listing.condition || "used").toLowerCase();
  const itemCondition =
    conditionLower === "new"
      ? "https://schema.org/NewCondition"
      : "https://schema.org/UsedCondition";

  const bodyTypeNorm = normalizeBodyTypeForGoogleVehicle(
    listing.body_type || v.BodyType?.trim() || "",
    listing.type_code,
  );
  const makeName = (
    listing.make?.trim() ||
    v.Make?.trim() ||
    inferMakeFromTitle(listing.title, listing.year)
  ).trim();
  const modelName = (
    listing.model?.trim() ||
    v.Model?.trim() ||
    inferModelFromTitle(listing.title, listing.year, makeName)
  ).trim();
  const modelYear = v.ManufactureYear ?? listing.year;
  const yearStr =
    modelYear != null && Number.isFinite(Number(modelYear))
      ? String(modelYear)
      : undefined;

  const transmission = (
    listing.transmission?.trim() ||
    v.TransmissionType?.trim() ||
    ""
  ).trim();
  const fuel = (
    listing.fuel_type?.trim() ||
    v.FuelType?.trim() ||
    ""
  ).trim();
  const drivePlain = driveWheelPlainForCarSchema(
    listing.drive_type || v.DriveType || "",
  );
  const colour = v.BodyColour?.trim();
  const sku =
    listing.stock_number?.trim() || String(v.ItemID);

  const odoKm =
    listing.odometer != null &&
    Number.isFinite(listing.odometer) &&
    listing.odometer >= 0
      ? Math.round(Number(listing.odometer))
      : parseInventoryOdometerKm(v.Odometer);

  const desc = buildVehicleListingDescription(
    listing,
    v,
    input.description,
  );
  const imageList =
    images.length > 0
      ? images
      : listing.featured_image
        ? [upgradeHttpToHttpsUrl(listing.featured_image)]
        : [productUrl];

  const car: Record<string, unknown> = {
    "@type": "Vehicle",
    "@id": `${productUrl}#vehicle`,
    name: listing.title,
    description: desc,
    url: productUrl,
    brand: { "@type": "Brand", name: makeName || "Vehicle" },
    manufacturer: { "@type": "Organization", name: makeName || "Vehicle" },
    model: modelName,
    itemCondition,
    sku,
  };

  if (yearStr) {
    car.vehicleModelDate = yearStr;
    car.productionDate = yearStr;
  }
  if (bodyTypeNorm) car.bodyType = bodyTypeForSchemaDisplay(bodyTypeNorm);
  if (transmission) car.vehicleTransmission = transmission;
  if (drivePlain) car.driveWheelConfiguration = drivePlain;
  if (fuel) car.fuelType = fuel;
  if (colour) car.color = colour;
  car.image = imageList;

  if (odoKm != null && Number.isFinite(odoKm) && odoKm >= 0) {
    car.mileageFromOdometer = {
      "@type": "QuantitativeValue",
      value: Math.round(odoKm),
      unitCode: "KMT",
    };
  }

  const priceSpecDescription =
    listing.show_drive_away && listing.drive_away_price
      ? "Drive away price includes applicable government charges where stated."
      : "Excludes government charges.";

  if (priceVal != null && Number.isFinite(priceVal) && priceVal > 0) {
    car.offers = buildVehicleOfferJsonLd({
      productUrl,
      priceVal,
      itemCondition,
      sellerId: `${siteOrigin}/#dealer`,
      priceSpecDescription,
    });
  }

  const dealer: Record<string, unknown> = {
    "@type": "AutoDealer",
    "@id": `${siteOrigin}/#dealer`,
    name: "Car Sales Brisbane",
    url: `${siteOrigin}/`,
    telephone: input.dealerPhoneE164,
    address: { ...ORG_POSTAL_ADDRESS },
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Queensland",
    },
  };

  const breadcrumbs = breadcrumbJsonLd(
    productUrl,
    vehicleVdpBreadcrumbListItems(
      siteOrigin,
      productUrl,
      listing,
      v,
      input.inventoryVehicles,
    ),
    { idFragment: "breadcrumbs" },
  );

  const faqPage = input.faqs?.length
    ? vehicleVdpFaqPageJsonLd(productUrl, input.faqs)
    : null;

  return jsonLdGraph(breadcrumbs, car, dealer, faqPage);
}
