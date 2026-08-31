import betanoLogo from "@/assets/betano-logo.png";

const LOGOS: Record<string, string> = { betano: betanoLogo };

export function houseLogo(name?: string | null) {
  if (!name) return null;
  const key = Object.keys(LOGOS).find((k) => name.toLowerCase().includes(k));
  return key ? LOGOS[key] : null;
}

export function HouseBadge({ name }: { name: string | null | undefined }) {
  const logo = houseLogo(name);
  if (!name) return <span className="text-muted-foreground">—</span>;
  if (!logo) return <span>{name}</span>;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.78_0.17_150/0.4)] bg-[oklch(0.78_0.17_150/0.12)] px-2.5 py-1">
      <img src={logo} alt={`Logo ${name}`} className="size-5 rounded-sm object-contain" />
      <span className="font-semibold">{name}</span>
    </span>
  );
}
