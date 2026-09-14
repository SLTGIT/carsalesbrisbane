import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/wordpress";
import { getMetadata, getAcfSeoCopy } from "@/lib/wordpress/seo";
import { repairWpRenderedHtml } from "@/lib/wordpress/repair-rendered-html";
import { mergeSiteUrlMetadata } from "@/lib/site-url";
import { stripHtml } from "@/lib/json-ld";
import {
  hasActiveInventoryFilters,
  inventoryListingQueryHref,
  parseInventorySearchParams,
} from "@/lib/inventory/query";
import { resolveSrpSearchMeta } from "@/lib/wordpress/srp-search-meta";
import SearchPageView from "./SearchPageView";

export const dynamic = "force-dynamic";

const SEARCH_SLUG = "search";
const SEARCH_PATH = "/search";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const page = await getPageBySlug(SEARCH_SLUG);
  const raw = await searchParams;
  const filters = parseInventorySearchParams(raw);

  if (!hasActiveInventoryFilters(filters) && page) {
    return mergeSiteUrlMetadata(getMetadata(page), SEARCH_PATH);
  }

  const meta = await resolveSrpSearchMeta(filters);
  const path = inventoryListingQueryHref(filters);
  return mergeSiteUrlMetadata(
    { title: meta.title, description: meta.description },
    path,
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const page = await getPageBySlug(SEARCH_SLUG);
  if (!page) {
    notFound();
  }

  const raw = await searchParams;
  const filters = parseInventorySearchParams(raw);
  const rendered = page.content?.rendered?.trim();
  console.log(filters);
  
  const acfSeo = getAcfSeoCopy(page);
  const headline = stripHtml(page.title.rendered);
  const excerpt = stripHtml(page.excerpt?.rendered || "");
  const useWpPageSeo = !hasActiveInventoryFilters(filters);
  const listingSeo = useWpPageSeo
    ? {
        title: acfSeo?.title || headline,
        description: acfSeo?.description || excerpt || headline,
      }
    : null;

  return (
    <SearchPageView
      filters={filters}
      pathAugment={null}
      pathHeroLabel={null}
      wpHeroHtml={rendered ? repairWpRenderedHtml(rendered) : null}
      listingSeo={listingSeo}
      initialSearchParams={raw}
    />
  );
}
