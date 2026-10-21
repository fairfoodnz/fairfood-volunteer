const stats = [
  { number: "4.7M", label: "kg of kai rescued", suffix: "since 2011" },
  { number: "10.6M", label: "meals shared", suffix: "with whānau" },
  { number: "12,655", label: "tonnes of CO₂", suffix: "kept from landfill" },
  { number: "2,400+", label: "kg every day", suffix: "out the door" },
];

// All text is solid cream on leaf-deep (5.1:1). Any opacity on cream drops
// below 4.5:1 here, so hierarchy comes from size and weight instead.
export function StatsBand() {
  return (
    <section className="bg-leaf-deep text-cream">
      <div className="container-x grid grid-cols-2 gap-y-10 py-14 md:grid-cols-4 md:gap-y-0">
        {stats.map((s) => (
          <div
            key={s.label}
            className="relative px-2 md:px-6 md:[&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-cream/15"
          >
            <div className="display text-[2.6rem] font-semibold leading-none -tracking-[0.02em] md:text-[3rem]">
              {s.number}
            </div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.16em]">
              {s.label}
            </div>
            <div className="mt-1 text-sm">{s.suffix}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
