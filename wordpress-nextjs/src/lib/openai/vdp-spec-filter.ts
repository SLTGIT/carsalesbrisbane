import type {
  VehicleVdpAiFeatureItem,
  VehicleVdpAiSpecRow,
} from "./vehicleVdpTypes";

/*
  Only data that came from the listing is published.

  The copy model is asked to fill gaps in the spec tables from its own
  knowledge of the model generation, tagging those rows "inferred"/"mixed" and
  hedging the value with "confirm with dealer". On a used-car advert that is a
  trust and compliance problem: a wrong torque figure, towing capacity or
  equipment claim is a wrong statement about the actual car being sold.

  This runs in the server component, before the rows are handed to the client
  tabs, so the inferred values are not in the page payload either — filtering
  only at render still shipped them to the browser inside the RSC stream.
*/
const HEDGED =
  /confirm with dealer|not in listing|usually fitted|typical for this generation/i;

export function listingSourcedSpecRows(
  rows: VehicleVdpAiSpecRow[],
): VehicleVdpAiSpecRow[] {
  return rows.filter((row) => {
    if (row.sourceTag !== "listing") return false;
    const v = row.value.trim();
    if (!v || v === "—") return false;
    return !HEDGED.test(v);
  });
}

export function listingSourcedFeatures(
  items: VehicleVdpAiFeatureItem[],
): VehicleVdpAiFeatureItem[] {
  return items.filter((item) => {
    const v = (item.value ?? "").trim();
    if (!v) return false;
    return !HEDGED.test(v);
  });
}
