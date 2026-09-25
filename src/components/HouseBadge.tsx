export function houseLogo(_name?: string | null) {
  return null;
}

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
    </span>
  );
}
