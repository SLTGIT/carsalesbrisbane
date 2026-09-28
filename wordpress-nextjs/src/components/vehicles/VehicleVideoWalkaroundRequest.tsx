"use client";

import { useId } from "react";
import VehicleEnquiryForm, {
  type VehicleEnquiryItemPayload,
} from "./VehicleEnquiryForm";

/**
 * Request a video walkaround of this vehicle.
 *
 * Statewide sells across Queensland, so a large share of buyers cannot drop
 * into Ormiston before deciding. This runs through the same lead pipeline as
 * every other form — only `form_type` differs, so the dealership can see at a
 * glance that the request is for a video rather than a call back.
 */
export default function VehicleVideoWalkaroundRequest({
  item,
}: {
  item: VehicleEnquiryItemPayload;
}) {
  const id = useId().replace(/:/g, "");

  return (
    <VehicleEnquiryForm
      idPrefix={`vdp-video-${id}`}
      item={item}
      formType="Video Walkaround Request"
      initialComments="Please send me a video walkaround of this vehicle."
      submitLabel="Request video walkaround"
    />
  );
}
