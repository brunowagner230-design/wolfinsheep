const houses = [
  { name: "Bet365", color: "oklch(0.72 0.17 150)" },
  { name: "Betano", color: "oklch(0.78 0.17 75)" },
  { name: "Superbet", color: "oklch(0.68 0.2 25)" },
  { name: "KTO", color: "oklch(0.75 0.18 200)" },
  { name: "Betfair", color: "oklch(0.8 0.16 95)" },
  { name: "Estrela Bet", color: "oklch(0.72 0.19 300)" },
  { name: "Novibet", color: "oklch(0.7 0.17 250)" },
  { name: "Blaze", color: "oklch(0.72 0.2 40)" },
  { name: "Vera Bet", color: "oklch(0.74 0.17 330)" },
  { name: "Bet7k", color: "oklch(0.76 0.17 170)" },
  { name: "Esportiva Bet", color: "oklch(0.74 0.18 130)" },
  { name: "MC Games", color: "oklch(0.75 0.18 60)" },
];

export function HouseMarquee({ label = "Casas de aposta parceiras" }: { label?: string }) {
  const loop = [...houses, ...houses];

  return (
    <div className="w-full">
      <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.35em] text-muted-foreground">
        {label}
      </p>
      <div className="marquee-mask overflow-hidden rounded-xl border border-border/60 bg-card/50 py-3">
        <div className="marquee-track gap-3">
          {loop.map((house, i) => (
            <span
              key={`${house.name}-${i}`}
              className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold uppercase italic tracking-wide"
              style={{
                color: house.color,
                borderColor: `color-mix(in oklab, ${house.color} 40%, transparent)`,
                background: `color-mix(in oklab, ${house.color} 12%, transparent)`,
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: house.color, boxShadow: `0 0 10px ${house.color}` }}
              />
              {house.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
