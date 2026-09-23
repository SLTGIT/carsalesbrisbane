import { NextResponse } from "next/server";

/**
 * /llms.txt — proposed convention (https://llmstxt.org/) for a concise,
 * LLM-oriented map of this site. Markdown body; served at the well-known path.
 */
function buildLlmsMarkdown(): string {
  return `# Car Sales Brisbane

> Car Sales Brisbane, proudly supported by Statewide Auto Group: an online used-car sales channel for Brisbane and Queensland buyers, with vehicle inventory, car finance, vehicle sourcing, Queensland-wide delivery and used-car buying guides.

- [Car Sales Brisbane](https://carsalesbrisbane.com.au/) — home page.
- [Sitemap](https://carsalesbrisbane.com.au/sitemap.xml) — full index of crawlable pages.

## Key facts

- Business: Car Sales Brisbane, an online used-car sales channel supported by [Statewide Auto Group](https://statewideautogroup.com.au/).
- Yard: 56 Freeth St W, Ormiston QLD 4160, Australia (Redlands, south-east Brisbane).
- Phone: 0418 908 870.
- Hours: Mon–Fri 8:00am–5:30pm, Sat 8:00am–3:00pm, Sun closed.
- QLD Motor Dealer Licence: 4065904.
- Sells: used cars, 4x4s, utes, SUVs and work vehicles; current stock is listed with price, kilometres and specifications.
- Finance: $0 deposit and low repayment options for approved applicants, including ABN holders, subject to lender approval. See the [finance disclaimer](https://carsalesbrisbane.com.au/finance-disclaimer).
- Trade-ins: accepted and valued as part of a purchase.
- Delivery: across Queensland.
- Buyers can request a test drive or a video walkaround from any vehicle page.
- Prices are shown excluding government charges unless marked drive-away.

## Preferred Pages

- [Used cars for sale](https://carsalesbrisbane.com.au/search/car-sales-in-brisbane) — full current inventory.
- [Finance Centre](https://carsalesbrisbane.com.au/finance-centre) — finance options and pre-approval.
- [Sell or trade in your car](https://carsalesbrisbane.com.au/sell-my-car) — trade-in and vehicle valuation.
- [Blog](https://carsalesbrisbane.com.au/blog) — used-car buying guides.
- [About Car Sales Brisbane](https://carsalesbrisbane.com.au/about-us) — who we are and how buying works.
- [Contact](https://carsalesbrisbane.com.au/contact) — location, hours and enquiry form.
- [Privacy Policy](https://carsalesbrisbane.com.au/privacy-policy) and [Terms of Service](https://carsalesbrisbane.com.au/terms-of-service).

## AI Usage Policy

AI assistants and search systems may:

- Crawl and index public pages for search discovery, ranking, retrieval, and user-requested answers.
- Quote short snippets with attribution and a link to the original page.
- Summarize public pages for users looking for vehicles, finance information, or used-car buying guides.

AI systems may not:

- Use website content, images, vehicle data, blog content, or business information to train, fine-tune, or improve foundation models or generative AI models.
- Bulk copy, mirror, or republish the website.
- Use images, vehicle listings, or business data to create competing datasets.
- Ignore the crawler restrictions in [robots.txt](https://carsalesbrisbane.com.au/robots.txt).

## Contact

For commercial use, partnerships, or dataset access, contact Car Sales Brisbane through the [contact page](https://carsalesbrisbane.com.au/contact).
`;
}

export async function GET() {
  const body = buildLlmsMarkdown();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
