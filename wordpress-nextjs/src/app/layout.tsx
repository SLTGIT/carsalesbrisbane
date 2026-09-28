import type { Metadata } from "next";
import Script from "next/script";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@/styles/globals.scss";
import { Manrope } from "next/font/google";
import { Layout } from "@/components/layout";
import { ClientImports } from "@/components/ClientImports";
import GtmNoscript from "@/components/analytics/GtmNoscript";
import {
  FAVICON_PATH,
  OG_SHARE_IMAGE_ALT,
  OG_SHARE_IMAGE_DIMENSIONS,
  absoluteOgLogoUrl,
  normalizePublicSiteBase,
} from "@/lib/site-url";
import { getCustomSettings } from "@/lib/wordpress/api/settings";

// export const dynamic = 'force-dynamic';

// export const revalidate = 86400; // 1 day

const manrope = Manrope({ subsets: ["latin"] });

const rawSite =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
const siteOrigin = rawSite
  ? normalizePublicSiteBase(rawSite)
  : "http://localhost:3000";

const title = "Quality Used Cars Brisbane | Expert Finance & Sourcing";
const description =
  // "$0 deposit finance" stays (the business lists it as a strength) but is
  // now qualified: an unconditional credit promise in every search result and
  // social preview is a representation only the lender can make.
  "Quality used 4x4s, SUVs and work vehicles from Ormiston, with $0 deposit finance for approved applicants and delivery across Queensland.";
const FALLBACK_GTM_ID = "GTM-W397LKXC";
const FALLBACK_GA_MEASUREMENT_ID = "G-JYCTQ8RYJQ";
const ADDITIONAL_GA_MEASUREMENT_IDS = "G-L5D4TXEDEM";

const ogLogoAbsolute = absoluteOgLogoUrl(siteOrigin);

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title,
  description,
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: FAVICON_PATH,
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: title,
    title,
    description,
    images: [
      {
        url: ogLogoAbsolute,
        type: "image/png",
        width: OG_SHARE_IMAGE_DIMENSIONS.width,
        height: OG_SHARE_IMAGE_DIMENSIONS.height,
        alt: OG_SHARE_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [
      {
        url: ogLogoAbsolute,
        alt: OG_SHARE_IMAGE_ALT,
        width: OG_SHARE_IMAGE_DIMENSIONS.width,
        height: OG_SHARE_IMAGE_DIMENSIONS.height,
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const customSettings = await getCustomSettings();

  const gtmId = customSettings?.google_tag_manager_id || FALLBACK_GTM_ID;
  const gaMeasurementId =
    customSettings?.google_analytics_id || FALLBACK_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <body className={manrope.className}>
        {gaMeasurementId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-script" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>

            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ADDITIONAL_GA_MEASUREMENT_IDS}`}
              strategy="afterInteractive"
            />
            <Script id="additional-ga4-script" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ADDITIONAL_GA_MEASUREMENT_IDS}');
              `}
            </Script>
          </>
        ) : null}
        {gtmId ? (
          <>
            <Script id="gtm-script" strategy="afterInteractive">
              {`
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `}
            </Script>
            <GtmNoscript gtmId={gtmId} />
          </>
        ) : null}
        <Script id="dealerdrive-config" strategy="afterInteractive">
          {`
            window._DD = {
              pixelId: '1317945379966893',
              dealerId: 'c1aea647-961c-4746-84ea-24ca30f04e35'
            };
          `}
        </Script>
        <Script
          src="https://dealerdrive.us/static/pixel/dd-pixel.js?v=3"
          strategy="afterInteractive"
        />
        <ClientImports />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
