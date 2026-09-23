import { pushAnalyticsEvent } from "./gtag";

export type VdpAnalyticsContext = {
  stockNumber: string;
  make: string;
  model: string;
  year: string | number;
  slug?: string;
};

function vdpParams(ctx: VdpAnalyticsContext): Record<string, string | number> {
  const params: Record<string, string | number> = {
    stock_number: ctx.stockNumber.trim(),
    vehicle_make: ctx.make.trim(),
    vehicle_model: ctx.model.trim(),
    vehicle_year: String(ctx.year),
  };
  const slug = ctx.slug?.trim();
  if (slug) params.vehicle_slug = slug;
  if (typeof window !== "undefined") {
    params.page_path = window.location.pathname;
  }
  return params;
}

export function trackVdpView(ctx: VdpAnalyticsContext): void {
  pushAnalyticsEvent("vdp_view", vdpParams(ctx));
}

export function trackVdpPhoneReveal(ctx: VdpAnalyticsContext): void {
  pushAnalyticsEvent("vdp_phone_reveal", vdpParams(ctx));
}

/**
 * A tap on the dealer phone number. `vdp_phone_reveal` still exists because
 * GTM triggers key off it, but the number is no longer masked, so this is the
 * event that now counts a call intent.
 */
export function trackVdpPhoneClick(ctx: VdpAnalyticsContext): void {
  const params = vdpParams(ctx);
  pushAnalyticsEvent("vdp_phone_click", params);
  // Keep the legacy event firing so existing GTM/Ads conversions do not go
  // silent on the day the reveal button disappears.
  pushAnalyticsEvent("vdp_phone_reveal", params);
}

export type VdpCtaName =
  | "enquire"
  | "test_drive"
  | "call"
  | "value_trade"
  | "finance"
  | "request_video";

/** A tap on one of the primary action buttons (VDP block, sticky bar, card). */
export function trackVdpCtaClick(
  ctx: VdpAnalyticsContext,
  cta: VdpCtaName,
  placement: "vdp_primary" | "vdp_sticky" | "stock_card",
): void {
  pushAnalyticsEvent("vdp_cta_click", {
    ...vdpParams(ctx),
    cta_name: cta,
    cta_placement: placement,
  });
}

export function trackVdpFormSubmit(
  ctx: VdpAnalyticsContext,
  formType: "enquiry" | "test_drive",
): void {
  pushAnalyticsEvent("vdp_form_submit", {
    ...vdpParams(ctx),
    form_type: formType,
  });
}
