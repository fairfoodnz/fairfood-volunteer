const items = [
  "Mā tātou anō tātou e manaaki",
  "Feeding people, not landfill",
  "Since 2011",
  "Avondale, Tāmaki Makaurau",
  "Open to every body",
  "Powered by 1,400+ volunteers",
];

export function Marquee() {
  return (
    <div className="overflow-hidden border-y border-border/60 bg-background py-3 text-foreground/65">
      <div className="flex w-max animate-[marquee_42s_linear_infinite] gap-12 whitespace-nowrap">
        {[...items, ...items, ...items].map((it, i) => (
          <span
            key={i}
            className="flex items-center gap-12 font-mono text-xs uppercase tracking-[0.22em]"
          >
            {it}
            <span aria-hidden className="text-leaf">
              ✦
            </span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.3333%); }
        }
      `}</style>
    </div>
  );
}
