import Link from "next/link";
import Image from "next/image";
import styles from "./Footer.module.scss";
import { getCustomSettings } from "@/lib/wordpress/api/settings";
import { socialLinksFromSettings } from "@/lib/social-links";

// Same fallbacks the header uses when WordPress has no URL configured.
const FALLBACK_SOCIAL = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1DREXJCBhb/?mibextid=wwXIfr",
    icon: "bi-facebook",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/carsalesbrisbaneau?igsh=MTg5bmtic2hjdnNzMg%3D%3D&utm_source=qr",
    icon: "bi-instagram",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@carsalesbrisbane?_r=1&_t=ZS-95OLtLR1kfQ",
    icon: "bi-tiktok",
  },
];

export default async function Footer() {
  const currentYear = new Date().getFullYear();
  const settings = await getCustomSettings();
  const configured = socialLinksFromSettings(settings);
  const socialLinks = configured.length > 0 ? configured : FALLBACK_SOCIAL;

  return (
    <footer className=" text-white" style={{ background: "#122033" }}>
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-5">
            <h3 className="h5 fw-bold">Our Identity</h3>
            {/*
              The relationship line is worded the same way everywhere on the
              site (footer, About, vehicle pages), per the client brief: keep
              the Statewide Auto Group connection, but make it look intended.
            */}
            <p className="text-white mb-2 fw-semibold">
              Car Sales Brisbane, proudly supported by Statewide Auto Group.
            </p>
            <p className="text-white-50 mb-1">
              We are an online used-car sales channel specialising in vehicle
              sourcing, finance and Queensland-wide delivery.
            </p>
            <p className="text-white-50 mb-3">QLD Dealer License: 4065904</p>
            <address className={`${styles.footerContact} mb-0`}>
              <a href="tel:0418908870">
                <i className="bi bi-telephone-fill" aria-hidden /> 0418 908 870
              </a>
              <a
                href="https://maps.app.goo.gl/3A3Upx5e3bczUtsq9"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="bi bi-geo-alt-fill" aria-hidden /> 56 Freeth St W,
                Ormiston QLD 4160
              </a>
            </address>
            <ul
              className={styles.social}
              aria-label="Car Sales Brisbane on social media"
            >
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} (opens in a new tab)`}
                    className={styles.socialLink}
                  >
                    <i className={`bi ${link.icon}`} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <p className={`${styles.poweredBy} text-white-50 mb-0 mt-3`}>
              Powered and maintained by{" "}
              <a href="https://dealersales.co" target="_blank" rel="noopener noreferrer" className={styles.provider}>Dealer Sales LLC</a>
            </p>
          </div>
          <div className="col-lg-1"></div>
          <div className="col-lg-3">
            <h3 className="h5 fw-bold">Used Cars</h3>
            <ul className={`${styles.footerNav} mb-0`}>
              <li>
                <Link href="/search/4x4" className={styles.footerLink}>
                  Used 4x4 Cars for Sale
                </Link>
              </li>
              <li>
                <Link href="/search/utility" className={styles.footerLink}>
                  Used Utility Cars for Sale
                </Link>
              </li>
              <li>
                <Link href="/search/suv" className={styles.footerLink}>
                  Used SUVs for Sale
                </Link>
              </li>
              <li>
                <Link href="/search/hatchback" className={styles.footerLink}>
                  Used Hatchback Cars for Sale
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-lg-3">
            <h3 className="h5 fw-bold">Company</h3>
            <ul className={`${styles.footerNav} mb-0`}>
              <li>
                <Link href="/about-us" className={styles.footerLink}>
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className={styles.footerLink}>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className={styles.footerLink}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className={styles.footerLink}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/finance-disclaimer" className={styles.footerLink}>
                  Finance Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="copyright-text">
        <div className="copyright-text-container">
          <div className="copyright-text-content text-center">
            <p className=" mb-1 text-white-50 fw-normal" suppressHydrationWarning>
              Car Sales Brisbane - Car Dealership in Australia - Copyright
              &copy; {currentYear} All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
