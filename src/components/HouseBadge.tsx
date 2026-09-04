import betanoLogo from "@/assets/betano-logo.png";
import apostaTudoLogo from "@/assets/aposta-tudo.jpeg";

const LOGOS: Record<string, string> = {
  betano: betanoLogo,
  "aposta-tudo": apostaTudoLogo,
  "aposta tudo": apostaTudoLogo,
};

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
    <span className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-[oklch(0.78_0.17_150/0.4)] bg-[oklch(0.78_0.17_150/0.12)] py-1 pl-1.5 pr-3 align-middle">
      <img
        src={logo}
        alt={`Logo ${name}`}
        className="size-5 shrink-0 rounded-sm object-contain"
      />
      <span className="truncate font-semibold leading-none">{name}</span>
    </span>
  );
}
