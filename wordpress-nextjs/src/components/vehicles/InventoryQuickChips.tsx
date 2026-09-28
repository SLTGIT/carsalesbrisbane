import Link from "next/link";
import type { QuickSearchChip } from "@/lib/inventory/quick-search-chips";

/**
 * Quick-start categories above the results.
 *
 * Buyers rarely arrive knowing the exact model — they start from a budget, a
 * fuel type, a body shape or a brand. Each chip carries its live count, and
 * the list is built from current stock, so none of them lead to an empty page.
 */
export default function InventoryQuickChips({
  chips,
}: {
  chips: QuickSearchChip[];
}) {
  if (chips.length === 0) return null;

  return (
    <nav className="inventory-quick-chips" aria-label="Quick searches">
      <span className="inventory-quick-chips__label">Popular searches</span>
      <ul className="inventory-quick-chips__list">
        {chips.map((chip) => (
          <li key={chip.label}>
            <Link href={chip.href} className="inventory-quick-chip">
              {chip.label}
              <span className="inventory-quick-chip__count">{chip.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
