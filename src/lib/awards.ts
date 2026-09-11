export type AwardTier = {
  label: string;
  goal: number;
  metal: string;
  ring: string;
  /** Fundo interno da placa — cada nível com sua cor */
  plate: string;
};

export const AWARD_TIERS: AwardTier[] = [
  {
    label: "10K",
    goal: 10_000,
    metal: "linear-gradient(150deg, oklch(0.72 0.06 250), oklch(0.42 0.04 265))",
    ring: "oklch(0.75 0.05 250 / 0.55)",
    plate: "linear-gradient(160deg, oklch(0.32 0.05 250), oklch(0.18 0.03 265))",
  },
  {
    label: "30K",
    goal: 30_000,
    metal: "linear-gradient(150deg, oklch(0.8 0.05 200), oklch(0.45 0.05 230))",
    ring: "oklch(0.8 0.06 205 / 0.55)",
    plate: "linear-gradient(160deg, oklch(0.33 0.06 205), oklch(0.18 0.03 230))",
  },
  {
    label: "50K",
    goal: 50_000,
    metal: "linear-gradient(150deg, oklch(0.82 0.04 150), oklch(0.44 0.07 165))",
    ring: "oklch(0.8 0.09 155 / 0.6)",
    plate: "linear-gradient(160deg, oklch(0.32 0.08 155), oklch(0.18 0.04 165))",
  },
  {
    label: "100K",
    goal: 100_000,
    metal: "linear-gradient(150deg, oklch(0.88 0.13 92), oklch(0.55 0.13 75))",
    ring: "oklch(0.86 0.14 88 / 0.65)",
    plate: "linear-gradient(160deg, oklch(0.36 0.1 88), oklch(0.19 0.05 75))",
  },
  {
    label: "250K",
    goal: 250_000,
    metal: "linear-gradient(150deg, oklch(0.84 0.16 55), oklch(0.5 0.16 40))",
    ring: "oklch(0.82 0.17 50 / 0.65)",
    plate: "linear-gradient(160deg, oklch(0.35 0.12 50), oklch(0.19 0.06 40))",
  },
  {
    label: "500K",
    goal: 500_000,
    metal: "linear-gradient(150deg, oklch(0.78 0.2 320), oklch(0.45 0.2 300))",
    ring: "oklch(0.75 0.21 310 / 0.7)",
    plate: "linear-gradient(160deg, oklch(0.34 0.15 315), oklch(0.19 0.08 300))",
  },
  {
    label: "1M",
    goal: 1_000_000,
    metal: "linear-gradient(150deg, oklch(0.95 0.03 300), oklch(0.58 0.24 300))",
    ring: "oklch(0.85 0.16 305 / 0.8)",
    plate: "linear-gradient(160deg, oklch(0.4 0.16 300), oklch(0.2 0.08 290))",
  },
];

export const tierProgress = (revenue: number, goal: number) =>
  Math.max(0, Math.min(100, (revenue / goal) * 100));
