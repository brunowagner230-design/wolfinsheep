import apostaTudoLogo from "@/assets/aposta-tudo.jpeg";

const LOGOS: Record<string, string> = {
  "aposta-tudo": apostaTudoLogo,
  "aposta tudo": apostaTudoLogo,
};

export function houseLogo(name?: string | null) {
  if (!name) return null;
  const key = Object.keys(LOGOS).find((k) => name.toLowerCase().includes(k));
  return key ? LOGOS[key] : null;
}

export const isWeeklyPayout = (name?: string | null) =>
  !!name && name.toLowerCase().replace("-", " ").includes("aposta tudo");

export function HouseBadge({
  name,
  logoUrl,
}: {
  name: string | null | undefined;
  logoUrl?: string | null;
}) {
  const logo = houseLogo(name) ?? (logoUrl || null);
  if (!name) return <span className="text-muted-foreground">—</span>;
  if (!logo)
    return (
      <span className="inline-flex max-w-full items-center gap-2">
        <span className="truncate">{name}</span>
        {isWeeklyPayout(name) && (
          <span className="shrink-0 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-primary">
            Saque semanal
          </span>
        )}
      </span>
    );
  return (
    <span className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-[oklch(0.78_0.17_150/0.4)] bg-[oklch(0.78_0.17_150/0.12)] py-1 pl-1.5 pr-3 align-middle">
      <img
        src={logo}
        alt={`Logo ${name}`}
        className="size-5 shrink-0 rounded-sm object-contain"
      />
      <span className="truncate font-semibold leading-none">{name}</span>
      {isWeeklyPayout(name) && (
        <span className="shrink-0 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-primary">
          Saque semanal
        </span>
      )}
    </span>
  );
}
