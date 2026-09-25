import GoogleRatingStars from "@/components/GoogleRatingStars";
import { CAR_SALES_BRISBANE_GOOGLE_MAPS_URL, getGoogleReviews } from "@/lib/google-reviews";
import { getCustomSettings } from "@/lib/wordpress/api/settings";

const FALLBACK_SCORE = 4.8;
const FALLBACK_FACEBOOK_URL = "https://www.facebook.com/share/1DREXJCBhb/?mibextid=wwXIfr";
const FALLBACK_INSTAGRAM_URL =
  "https://www.instagram.com/carsalesbrisbaneau?igsh=MTg5bmtic2hjdnNzMg%3D%3D&utm_source=qr";
const FALLBACK_TIKTOK_URL = "https://www.tiktok.com/@carsalesbrisbane?_r=1&_t=ZS-95OLtLR1kfQ";

export default async function ContactInfo() {
  const summary = await getGoogleReviews();
  const settings = await getCustomSettings();
  const score = summary?.averageScore ?? FALLBACK_SCORE;
  const reviewCount = summary?.reviewCount;
  const facebookUrl = settings?.facebook_url || FALLBACK_FACEBOOK_URL;
  const instagramUrl = settings?.instagram_url || FALLBACK_INSTAGRAM_URL;
  const tiktokUrl = settings?.tiktok_url || FALLBACK_TIKTOK_URL;
  const youtubeUrl = settings?.youtube_url || "";
  const xUrl = settings?.x_url || "";
  const linkedinUrl = settings?.linkedin_url || "";

  return (
    <section className="py-5 bg-white cs-visit-section">
      <div className="container">
        <article className="cs-business-card p-4 p-lg-5">
          <div className="row g-5 align-items-stretch">
            <div className="col-lg-7">
              <iframe
                className="cs-map-frame"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3538.2886675510936!2d153.2562743!3d-27.522489600000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6b91678932e7fccd%3A0x6a000d7f9589579b!2sCar%20Sales%20Brisbane!5e0!3m2!1sen!2sin!4v1775730243051!5m2!1sen!2sin"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Car Sales Brisbane location map"
              ></iframe>
            </div>
            <div className="col-lg-5">
              <div className="vstack gap-4">
                <div className="cs-contact-row">
                  <span className="cs-contact-icon" aria-hidden="true">
                    <i className="bi bi-geo-alt-fill"></i>
                  </span>
                  <div>
                    <div
                      className="text-secondary text-uppercase small fw-semibold mb-1"
                      style={{ letterSpacing: "0.18em" }}
                    >
                      Address
                    </div>
                    <a
                      className="cs-business-link fs-3 d-inline-block"
                      href={CAR_SALES_BRISBANE_GOOGLE_MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      56 Freeth St W, Ormiston QLD 4160, Australia
                    </a>
                  </div>
                </div>
                <hr className="my-0" />
                <div className="cs-contact-row">
                  <span className="cs-contact-icon" aria-hidden="true">
                    <i className="bi bi-telephone-fill"></i>
                  </span>
                  <div>
                    <div
                      className="text-secondary text-uppercase small fw-semibold mb-1"
                      style={{ letterSpacing: "0.18em" }}
                    >
                      Sales &amp; Service
                    </div>
                    <a className="cs-business-link fs-3 d-inline-block" href="tel:0733903057">
                      07 3390 3057
                    </a>
                    <p className="mt-2 mb-1">
                      <strong>Working Hours:</strong>
                    </p>
                    <p className="mt-1 mb-1">Mon-Fri: 8:00am-5:30pm</p>
                    <p className="mt-1 mb-1">Sat: 8:00am-3:00pm</p>
                    <p className="mt-1 mb-1">Sun: Closed</p>
                  </div>
                </div>
                <hr className="my-0" />
                <div className="cs-contact-row">
                  <span className="cs-contact-icon" aria-hidden="true">
                    <i className="bi bi-star-fill"></i>
                  </span>
                  <div>
                    <div
                      className="text-secondary text-uppercase small fw-semibold mb-1"
                      style={{ letterSpacing: "0.18em" }}
                    >
                      Google Reviews
                    </div>
                    <div
                      className="d-flex align-items-center gap-2 mb-2"
                      aria-hidden="true"
                    >
                      <GoogleRatingStars score={score} />
                    </div>
                    <div className="fw-bold fs-4">
                      {score.toFixed(1)}/5 Stars
                      {reviewCount != null ? (
                        <span className="fs-6 fw-normal text-secondary ms-2">
                          ({reviewCount} review{reviewCount === 1 ? "" : "s"})
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <hr className="my-0" />
                <div className="cs-contact-row">
                  <span className="cs-contact-icon" aria-hidden="true">
                    <i className="bi bi-share-fill"></i>
                  </span>
                  <div>
                    <div
                      className="text-secondary text-uppercase small fw-semibold mb-2"
                      style={{ letterSpacing: "0.18em" }}
                    >
                      Social Media
                    </div>
                    <div className="d-flex gap-3">
                      <a
                        className="cs-social-btn cs-social-facebook"
                        href={facebookUrl}
                        aria-label="Facebook"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          alt=""
                          loading="lazy"
                          width="24"
                          height="24"
                          decoding="async"
                          data-nimg="1"
                          style={{ color: "transparent" }}
                          src="/assets/images/facebook.svg"
                        />
                      </a>
                      <a
                        className="cs-social-btn cs-social-instagram"
                        href={instagramUrl}
                        aria-label="Instagram"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          alt=""
                          loading="lazy"
                          width="24"
                          height="24"
                          decoding="async"
                          data-nimg="1"
                          style={{ color: "transparent" }}
                          src="/assets/images/instagram.svg"
                        />
                      </a>
                      <a
                        className="cs-social-btn cs-social-tiktok"
                        href={tiktokUrl}
                        aria-label="TikTok"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          alt=""
                          loading="lazy"
                          width="24"
                          height="24"
                          decoding="async"
                          data-nimg="1"
                          style={{ color: "transparent" }}
                          src="/assets/images/tiktok.svg"
                        />
                      </a>
                      {youtubeUrl ? (
                        <a
                          className="cs-social-btn"
                          href={youtubeUrl}
                          aria-label="YouTube"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="bi bi-youtube" aria-hidden="true"></i>
                        </a>
                      ) : null}
                      {xUrl ? (
                        <a
                          className="cs-social-btn"
                          href={xUrl}
                          aria-label="X"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="bi bi-twitter-x" aria-hidden="true"></i>
                        </a>
                      ) : null}
                      {linkedinUrl ? (
                        <a
                          className="cs-social-btn"
                          href={linkedinUrl}
                          aria-label="LinkedIn"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="bi bi-linkedin" aria-hidden="true"></i>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
