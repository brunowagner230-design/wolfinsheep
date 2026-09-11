export type AwardTier = {
  label: string;
  goal: number;
  metal: string;
  ring: string;
};

export const AWARD_TIERS: AwardTier[] = [
  {
    label: "10K",
    goal: 10_000,
    metal: "linear-gradient(150deg, oklch(0.72 0.06 250), oklch(0.42 0.04 265))",
    ring: "oklch(0.75 0.05 250 / 0.55)",
  },
  {
    label: "30K",
    goal: 30_000,
    metal: "linear-gradient(150deg, oklch(0.8 0.05 200), oklch(0.45 0.05 230))",
    ring: "oklch(0.8 0.06 205 / 0.55)",
  },
  {
    label: "50K",
    goal: 50_000,
    metal: "linear-gradient(150deg, oklch(0.82 0.04 150), oklch(0.44 0.07 165))",
    ring: "oklch(0.8 0.09 155 / 0.6)",
  },
  {
    label: "100K",
    goal: 100_000,
    metal: "linear-gradient(150deg, oklch(0.88 0.13 92), oklch(0.55 0.13 75))",
    ring: "oklch(0.86 0.14 88 / 0.65)",
  },
  {
    label: "250K",
    goal: 250_000,
    metal: "linear-gradient(150deg, oklch(0.84 0.16 55), oklch(0.5 0.16 40))",
    ring: "oklch(0.82 0.17 50 / 0.65)",
  },
  {
    label: "500K",
    goal: 500_000,
    metal: "linear-gradient(150deg, oklch(0.78 0.2 320), oklch(0.45 0.2 300))",
    ring: "oklch(0.75 0.21 310 / 0.7)",
  },
  {
    label: "1M",
    goal: 1_000_000,
    metal: "linear-gradient(150deg, oklch(0.95 0.03 300), oklch(0.58 0.24 300))",
    ring: "oklch(0.85 0.16 305 / 0.8)",
  },
];

export const tierProgress = (revenue: number, goal: number) =>
  Math.max(0, Math.min(100, (revenue / goal) * 100));
