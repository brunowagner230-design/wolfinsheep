import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display font-extrabold tracking-tight leading-none whitespace-nowrap",
        className,
      )}
    >
      <span className="text-primary">WOLF</span>{" "}
      <span className="text-foreground">IN</span>{" "}
      <span className="text-primary">SHEEP</span>{" "}
      <span className="text-foreground">AFFILIATES</span>
    </span>
  );
}

export function WolfMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/40",
        className,
      )}
    >
      <span className="font-display text-lg font-extrabold text-primary">W</span>
    </div>
  );
}
