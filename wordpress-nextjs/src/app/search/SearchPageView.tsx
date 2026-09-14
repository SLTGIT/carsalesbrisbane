import "./search.css";
import { after } from "next/server";
import { getCurrentUrlAndRoute } from "@/lib/site-url";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchDealerInventory } from "@/lib/dealer-solutions/fetch-inventory";
import {
  filterDealerVehicles,
  sortDealerVehicles,
  priceYearBounds,
  PER_PAGE,
  inventoryListingQueryHref,
  inventoryListingHrefForContext,
  clearPathAugmentFromFilters,
} from "@/lib/inventory/query";
import type { InventoryFilterState } from "@/types/inventory";
import JsonLd from "@/components/JsonLd";
import {
  breadcrumbJsonLd,
  jsonLdGraph,
  organizationJsonLd,
  upgradeHttpToHttpsUrl,
  vehicleJsonLdFromInventory,
  webPageJsonLd,
  webSiteJsonLd,
} from "@/lib/json-ld";
import { dealerVehicleToListing } from "@/lib/inventory/transform";
import { buildInventoryFacets } from "@/lib/inventory/facets";
import InventoryFiltersSidebar from "@/components/vehicles/InventoryFiltersSidebar";
import InventoryToolbar from "@/components/vehicles/InventoryToolbar";
import InventorySearchBar from "@/components/vehicles/InventorySearchBar";
import InventoryPagination from "@/components/vehicles/InventoryPagination";
import WpRenderedHtml from "@/components/cms/WpRenderedHtml";
import InventorySrpVehicleGrid from "@/components/vehicles/InventorySrpVehicleGrid";
import { warmVehicleVdpCachesForVehicles } from "@/lib/openai/warmVehicleVdpCache";
import { InventorySearchUrlProvider } from "@/components/vehicles/InventorySearchUrlContext";
import type { MakeModelPathResolution } from "@/lib/inventory/search-make-model-paths";
import { resolveSrpSearchMeta } from "@/lib/wordpress/srp-search-meta";

export type SearchPageCustomHero = {
  heading: string;
  description: string;
  breadcrumbCurrent?: string;
};

export type SearchPageViewProps = {
  filters: InventoryFilterState;
  /** Path-derived filter fields when URL is `/search/{slug}` without those params. */
  pathAugment: Partial<InventoryFilterState> | null;
  /** Hero / breadcrumb label for path-only search (make or facet). */
  pathHeroLabel?: string | null;
  /** When URL is `/search/{make}/{model}`, extra breadcrumb before the current page title. */
  pathBreadcrumb?: MakeModelPathResolution["breadcrumb"] | null;
  /** CMS SRP: full hero copy and optional breadcrumb label (defaults to heading). */
  customHero?: SearchPageCustomHero | null;
  /**
   * When set (e.g. CMS `meta` title/description), used for JSON-LD `WebPage` / `CollectionPage` name and description.
   * On-page hero still uses {@link customHero}.
   */
  listingSeo?: { title: string; description: string } | null;
  /**
   * When set (e.g. CMS SRP), JSON-LD uses this pathname for the current page URL (`getCurrentUrlAndRoute`).
   * Inventory filter/sort/pagination links use {@link listingBasePathname} instead (typically `/search`).
   */
  canonicalPathname?: string | null;
  /**
   * Base pathname for filter navigation + pagination (`/{path}?…`). When omitted or null, links use `/search?…`.
   */
  listingBasePathname?: string | null;
  /** WordPress page HTML for `/search` hero (`cs-page-hero search-page-hero`). */
  wpHeroHtml?: string | null;
  /** Shown in toolbar when redirected from a path SRP with no matches (e.g. "SUV"). */
  srpNotFoundLabel?: string | null;
  /** Raw URL search params for stable client hydration. */
  initialSearchParams?: Record<string, string | string[] | undefined> | null;
};

export default async function SearchPageView({
  filters,
  pathAugment,
  pathHeroLabel,
  pathBreadcrumb,
  customHero,
  listingSeo,
  canonicalPathname,
  listingBasePathname,
  wpHeroHtml,
  srpNotFoundLabel = null,
  initialSearchParams = null,
}: SearchPageViewProps) {
  const all = await fetchDealerInventory();

  let effectiveFilters = filters;
  let effectivePathAugment = pathAugment;
  let effectiveNotFoundLabel = srpNotFoundLabel?.trim() || null;

  let filtered = filterDealerVehicles(all, effectiveFilters);
  if (
    pathAugment &&
    filtered.length === 0 &&
    all.length > 0 &&
    !effectiveNotFoundLabel
  ) {
    effectiveNotFoundLabel = pathHeroLabel?.trim() || "Vehicle";
    effectiveFilters = clearPathAugmentFromFilters(effectiveFilters, pathAugment);
    effectivePathAugment = null;
    filtered = filterDealerVehicles(all, effectiveFilters);
  }

  const bounds = priceYearBounds(all);
  const facets = buildInventoryFacets(all, effectiveFilters);
  const sorted = sortDealerVehicles(filtered, effectiveFilters.sort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));

  if (effectiveFilters.page > totalPages) {
    redirect(
      inventoryListingHrefForContext(listingBasePathname ?? null, {
        ...effectiveFilters,
        page: totalPages,
      }),
    );
  }

  const pageSlice = sorted.slice(
    (effectiveFilters.page - 1) * PER_PAGE,
    effectiveFilters.page * PER_PAGE,
  );
  const listings = pageSlice.map(dealerVehicleToListing);
  console.log(listings);
  
  if (pageSlice.length > 0) {
    after(() => {
      void warmVehicleVdpCachesForVehicles(pageSlice, {
        max: pageSlice.length,
      });
    });
  }

  const pathForCurrentUrl = (() => {
    const c = canonicalPathname?.trim();
    if (c) return c.startsWith("/") ? c : `/${c}`;
    return inventoryListingQueryHref(effectiveFilters);
  })();

  const { currentUrl } = await getCurrentUrlAndRoute(pathForCurrentUrl);
  const currentUrlHttps = upgradeHttpToHttpsUrl(currentUrl);
  const origin = new URL(currentUrlHttps).origin;

  const hero = pathHeroLabel?.trim() ?? "";
  const srpMeta = await resolveSrpSearchMeta(effectiveFilters, {
    pathHeroLabel: hero || null,
  });
  const customHeading = customHero?.heading?.trim() ?? "";
  const customDescription = customHero?.description?.trim() ?? "";
  const hasCustomHero = Boolean(customHeading);

  const hasListingSeo = Boolean(listingSeo?.title || listingSeo?.description);
  const listTitle = hasListingSeo ? listingSeo!.title : srpMeta.title;
  const listDescription = hasListingSeo
    ? listingSeo!.description.trim() || listingSeo!.title
    : srpMeta.description;

  const breadcrumbCurrentCustom = hasCustomHero
    ? customHero?.breadcrumbCurrent?.trim() || customHeading
    : "";

  const itemListElement =
    pageSlice.length > 0
      ? pageSlice.map((vehicle, index) => ({
        "@type": "ListItem",
        position: (effectiveFilters.page - 1) * PER_PAGE + index + 1,
        item: vehicleJsonLdFromInventory(
          origin,
          vehicle,
          listings[index],
        ),
      }))
      : [];

  const breadcrumbItems = pathBreadcrumb
    ? [
      { name: "Home", item: `${origin}/` },
      { name: "Search", item: `${origin}/search` },
      {
        name: pathBreadcrumb.parent.name,
        item: `${origin}${pathBreadcrumb.parent.href}`,
      },
      { name: pathBreadcrumb.current, item: currentUrlHttps },
    ]
    : breadcrumbCurrentCustom
      ? [
        { name: "Home", item: `${origin}/` },
        { name: "Search", item: `${origin}/search` },
        {
          name:
            breadcrumbCurrentCustom.length > 90
              ? `${breadcrumbCurrentCustom.slice(0, 87)}…`
              : breadcrumbCurrentCustom,
          item: currentUrlHttps,
        },
      ]
      : hero
        ? [
          { name: "Home", item: `${origin}/` },
          { name: "Search", item: `${origin}/search` },
          { name: hero, item: currentUrlHttps },
        ]
        : [
          { name: "Home", item: `${origin}/` },
          { name: "Search", item: currentUrlHttps },
        ];

  const jsonLd = jsonLdGraph(
    organizationJsonLd(origin),
    webSiteJsonLd(origin),
    webPageJsonLd({
      pageUrl: currentUrlHttps,
      name: listTitle,
      description: listDescription,
    }),
    {
      "@type": "CollectionPage",
      "@id": `${currentUrlHttps}#collection`,
      name: listTitle,
      description: listDescription,
      url: currentUrlHttps,
      inLanguage: "en-AU",
      isPartOf: { "@id": `${origin}/#website` },
      publisher: { "@id": `${origin}/#organization` },
      ...(itemListElement.length > 0
        ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: sorted.length,
            itemListElement,
          },
        }
        : {}),
    },
    breadcrumbJsonLd(currentUrlHttps, breadcrumbItems),
  );

  const wpHero = wpHeroHtml?.trim() ?? "";
  const showWpHero = Boolean(wpHero) && !hasCustomHero;

  const heroTitle = hasCustomHero ? customHeading : srpMeta.heading;
  const heroDescription = hasCustomHero
    ? customDescription || customHeading
    : srpMeta.subHeading;

  return (
    <InventorySearchUrlProvider
      pathAugment={effectivePathAugment}
      listingBasePathname={listingBasePathname ?? null}
      initialSearchParams={initialSearchParams}
    >
      <JsonLd data={jsonLd} />
      {showWpHero ? (
        <WpRenderedHtml html={wpHero} />
      ) : (
        <section className="cs-page-hero search-page-hero py-3 py-md-2">
          <div className="container py-lg-2">
            <div className="row g-3 g-lg-4 align-items-center">
              <div className="col-lg-10 py-5">
                <h1 className="search-page-hero-title fw-bold mb-2 cs-title-tight">
                  {heroTitle}
                </h1>
                <p className="search-page-hero-lead mb-0">
                  {heroDescription}
                </p>
              </div>
              {/* <div className="col-lg-5" /> */}
            </div>
          </div>
        </section>
      )}
      <div className="vehicles-page inventory-srp">
        <div className="vehicles-container inventory-srp-inner">
          <nav className="inventory-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="inventory-breadcrumb-sep" aria-hidden>
              /
            </span>
            {pathBreadcrumb ? (
              <>
                <Link href="/search">Search</Link>
                <span className="inventory-breadcrumb-sep" aria-hidden>
                  /
                </span>
                <Link href={pathBreadcrumb.parent.href}>
                  {pathBreadcrumb.parent.name}
                </Link>
                <span className="inventory-breadcrumb-sep" aria-hidden>
                  /
                </span>
                <span className="inventory-breadcrumb-current">
                  {pathBreadcrumb.current}
                </span>
              </>
            ) : breadcrumbCurrentCustom ? (
              <>
                <Link href="/search">Search</Link>
                <span className="inventory-breadcrumb-sep" aria-hidden>
                  /
                </span>
                <span className="inventory-breadcrumb-current">
                  {customHero?.breadcrumbCurrent?.trim() || customHeading}
                </span>
              </>
            ) : hero ? (
              <>
                <Link href="/search">Search</Link>
                <span className="inventory-breadcrumb-sep" aria-hidden>
                  /
                </span>
                <span className="inventory-breadcrumb-current">{hero}</span>
              </>
            ) : (
              <span className="inventory-breadcrumb-current">Search</span>
            )}
          </nav>

          <div className="inventory-srp-layout">
            <InventoryFiltersSidebar facets={facets} bounds={bounds} />

            <div className="inventory-srp-main">
              <InventoryToolbar
                total={sorted.length}
                sort={effectiveFilters.sort}
                notFoundLabel={effectiveNotFoundLabel}
              />

              <InventorySearchBar />

              {sorted.length === 0 ? (
                <div className="inventory-empty">
                  {all.length === 0 ? (
                    <p>
                      No vehicles loaded. If you are the site owner, set{" "}
                      <code>DEALER_SOLUTIONS_INVENTORY_URL</code>,{" "}
                      <code>DEALER_SOLUTIONS_USER</code>, and{" "}
                      <code>DEALER_SOLUTIONS_PASSWORD</code> in{" "}
                      <code>.env</code>.
                    </p>
                  ) : (
                    <p>
                      No vehicles match your filters. Try clearing some filters.
                    </p>
                  )}
                  {all.length > 0 && (
                    <Link className="inventory-empty-link" href="/search">
                      View all vehicles
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <InventorySrpVehicleGrid listings={listings} />
                  <InventoryPagination
                    filters={effectiveFilters}
                    totalPages={totalPages}
                    listingBasePathname={listingBasePathname ?? null}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </InventorySearchUrlProvider>
  );
}
