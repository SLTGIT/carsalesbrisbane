export default function VdpKeyHighlights({ chips }: { chips: string[] }) {
  const visible = chips.map((c) => c.trim()).filter(Boolean);
  if (!visible.length) return null;

  return (
    <section className="cs-card p-4 p-lg-5 mb-4 vdp-ref-highlights">
      <h2 className="h4 fw-bold mb-3">Key highlights</h2>
      {/*
        The "Generated with AI from seller comments and car specifications.*"
        line that sat under these chips is gone. Customers read it as "the
        dealer did not check this"; the chips are drawn from the listing, and
        the page-level disclaimer still covers confirming details before sale.
      */}
      <ul className="vdp-ref-highlight-chips list-unstyled mb-0 d-flex flex-wrap gap-2">
        {visible.map((chip) => (
          <li key={chip}>
            <span className="vdp-ref-highlight-chip">{chip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
