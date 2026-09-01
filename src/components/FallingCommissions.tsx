import { useEffect, useMemo, useState } from "react";

const PHRASES = [
  "Comissão de CPA recebida",
  "CPA aprovado",
  "Comissão confirmada",
  "CPA validado",
  "Pagamento liberado",
];

const HOUSES = ["Betano", "Bet365", "Superbet", "KTO", "Betfair", "Estrela Bet", "Blaze"];

interface Drop {
  id: number;
  phrase: string;
  house: string;
  value: string;
  left: number;
  duration: number;
  delay: number;
  size: number;
}

function randomValue() {
  const values = [150, 200, 250, 300, 350, 400, 500, 600, 750, 900];
  return values[Math.floor(Math.random() * values.length)];
}

function generateDrop(id: number): Drop {
  return {
    id,
    phrase: PHRASES[Math.floor(Math.random() * PHRASES.length)],
    house: HOUSES[Math.floor(Math.random() * HOUSES.length)],
    value: `+R$ ${randomValue()}`,
    left: Math.random() * 92 + 4,
    duration: 7 + Math.random() * 8,
    delay: Math.random() * 6,
    size: 0.85 + Math.random() * 0.35,
  };
}

export function FallingCommissions() {
  const [mounted, setMounted] = useState(false);
  const drops = useMemo(() => Array.from({ length: 24 }).map((_, i) => generateDrop(i)), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="falling-commission absolute top-0 flex items-center gap-2 rounded-full border border-success/30 bg-card/80 px-3 py-1.5 shadow-lg backdrop-blur-sm"
          style={{
            left: `${drop.left}%`,
            animationDuration: `${drop.duration}s`,
            animationDelay: `${drop.delay}s`,
            fontSize: `${drop.size}rem`,
            boxShadow: "0 0 24px oklch(0.7 0.16 155 / 0.35)",
          }}
        >
          <span className="size-2 shrink-0 rounded-full bg-success shadow-[0_0_10px_currentColor]" />
          <span className="whitespace-nowrap font-semibold text-foreground/90">
            {drop.phrase}
          </span>
          <span className="whitespace-nowrap font-bold text-success">{drop.value}</span>
          <span className="hidden whitespace-nowrap text-[0.7em] text-muted-foreground sm:inline">
            · {drop.house}
          </span>
        </div>
      ))}
    </div>
  );
}
