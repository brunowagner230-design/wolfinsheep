const houses = [
  { name: "Superbet", color: "oklch(0.68 0.2 25)" },
];

export function HouseMarquee({ label = "Operação ativa" }: { label?: string }) {
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
