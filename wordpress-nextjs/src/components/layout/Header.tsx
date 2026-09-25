import "./Header.scss";
import HeaderNavbar from "./HeaderNavbar";
import GoogleRatingStars from "@/components/GoogleRatingStars";
import { CAR_SALES_BRISBANE_GOOGLE_MAPS_URL, formatReviewSummaryLine, getGoogleReviews } from "@/lib/google-reviews";
import { getCustomSettings } from "@/lib/wordpress/api/settings";

const FALLBACK_SCORE = 4.8;
const FALLBACK_LINE = "4.8 RATING OUT OF 240 REVIEWS";
const FALLBACK_FACEBOOK_URL = "https://www.facebook.com/share/1DREXJCBhb/?mibextid=wwXIfr";
const FALLBACK_INSTAGRAM_URL =
  "https://www.instagram.com/carsalesbrisbaneau?igsh=MTg5bmtic2hjdnNzMg%3D%3D&utm_source=qr";
const FALLBACK_TIKTOK_URL = "https://www.tiktok.com/@carsalesbrisbane?_r=1&_t=ZS-95OLtLR1kfQ";

export default async function Header() {
  const summary = await getGoogleReviews();
  const settings = await getCustomSettings();
  const score = summary?.averageScore ?? FALLBACK_SCORE;
  const summaryLine = summary ? formatReviewSummaryLine(summary) : FALLBACK_LINE;
  const facebookUrl = settings?.facebook_url || FALLBACK_FACEBOOK_URL;
  const instagramUrl = settings?.instagram_url || FALLBACK_INSTAGRAM_URL;
  const tiktokUrl = settings?.tiktok_url || FALLBACK_TIKTOK_URL;
  const youtubeUrl = settings?.youtube_url || "";
  const xUrl = settings?.x_url || "";
  const linkedinUrl = settings?.linkedin_url || "";

  return (
    <header className="sticky-top cs-header">
      {/*
        Phones: one row — rating on the left, call button on the right. The
        strip used to wrap to three or more rows (reviews, full street
        address, phone, social icons) inside a header that stays pinned, so it
        took a large share of every phone screen, and the phone link was a
        small unformatted "0418908870". Address and social links return from
        the sm/lg breakpoints; the footer carries both on phones.
      */}
      <div className="cs-topbar py-2 py-lg-0">
        <div className="container cs-topbar__row d-flex flex-wrap justify-content-between justify-content-lg-end align-items-center gap-2 gap-lg-4">
          <a
            className="cs-topbar__reviews d-inline-flex align-items-center gap-2 text-decoration-none"
            target="_blank"
            rel="noopener noreferrer"
            href={CAR_SALES_BRISBANE_GOOGLE_MAPS_URL}
            aria-label={`Google reviews: ${summaryLine}`}
          >
            <GoogleRatingStars score={score} />
            <span className="cs-topbar__review-line d-none d-sm-inline">
              {summaryLine}
            </span>
            <span className="cs-topbar__review-line d-sm-none">
              {score.toFixed(1)}
              {summary ? ` · ${summary.reviewCount} reviews` : ""}
            </span>
          </a>
          <a
            className="d-none d-lg-inline-flex align-items-center gap-2"
            target="_blank"
            rel="noopener noreferrer"
            href={CAR_SALES_BRISBANE_GOOGLE_MAPS_URL}
          >
            <i className="bi bi-geo-alt-fill"></i>
            <span>56 Freeth St W, Ormiston QLD 4160, Australia</span>
          </a>
          <a
            className="cs-topbar__phone d-inline-flex align-items-center gap-2"
            href="tel:0733903057"
          >
            <i className="bi bi-telephone-fill"></i>
            <span>07 3390 3057</span>
          </a>
          <span className="cs-topbar__social d-none d-sm-inline-flex align-items-center gap-3">
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="bi bi-facebook"></i>
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <i className="bi bi-instagram"></i>
            </a>
            <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <i className="bi bi-tiktok"></i>
            </a>
            {youtubeUrl ? (
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <i className="bi bi-youtube"></i>
              </a>
            ) : null}
            {xUrl ? (
              <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="X">
                <i className="bi bi-twitter-x"></i>
              </a>
            ) : null}
            {linkedinUrl ? (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <i className="bi bi-linkedin"></i>
              </a>
            ) : null}
          </span>
        </div>
      </div>
      <HeaderNavbar />
    </header>
  );
}
