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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomValue(): number {
  const values = [150, 200, 250, 300, 350, 400, 500, 600, 750, 900];
  return pick(values);
}

function generateDrop(id: number): Drop {
  const side = Math.random() > 0.5 ? "left" : "right";
  const left = side === "left" ? Math.random() * 18 + 2 : Math.random() * 18 + 80;
  return {
    id,
    phrase: pick(PHRASES),
    house: pick(HOUSES),
    value: `+R$ ${randomValue().toString()}`,
    left,
    duration: 12 + Math.random() * 10,
    delay: Math.random() * 10,
    size: 0.55 + Math.random() * 0.15,
  };
}

export function FallingCommissions() {
  const [mounted, setMounted] = useState(false);
  const drops = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        ...generateDrop(i),
        startY: 25 + Math.random() * 60,
      })),
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        maskImage: "linear-gradient(180deg, transparent 0%, black 18%, black 92%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 18%, black 92%, transparent 100%)",
      }}
    >
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="falling-commission absolute flex items-center gap-1.5 rounded-full border border-success/15 bg-card/35 px-2 py-1 opacity-40 shadow-sm backdrop-blur-sm"
          style={{
            left: `${drop.left}%`,
            top: `${drop.startY}vh`,
            animationDuration: `${drop.duration}s`,
            animationDelay: `${drop.delay}s`,
            fontSize: `${drop.size}rem`,
            boxShadow: "0 0 12px oklch(0.7 0.16 155 / 0.12)",
          }}
        >
          <span className="size-1 shrink-0 rounded-full bg-success/80 shadow-[0_0_5px_currentColor]" />
          <span className="whitespace-nowrap font-medium text-foreground/70">
            {drop.phrase}
          </span>
          <span className="whitespace-nowrap font-bold text-success/90">{drop.value}</span>
          <span className="hidden whitespace-nowrap text-[0.7em] text-muted-foreground/60 sm:inline">
            · {drop.house}
          </span>
        </div>
      ))}
    </div>
  );
}
