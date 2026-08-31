import { cn } from "@/lib/utils";
import lockup from "@/assets/wolf-lockup.png";
import mark from "@/assets/wolf-mark.png";

export function Wordmark({ className }: { className?: string }) {
  return (
    <img
      src={lockup}
      alt="WOLF IN SHEEP AFFILIATES"
      className={cn("h-8 w-auto select-none object-contain", className)}
      draggable={false}
    />
  );
}

export function WolfMark({ className }: { className?: string }) {
  return (
    <img
      src={mark}
      alt="Wolf in Sheep"
      className={cn("h-9 w-auto shrink-0 select-none object-contain", className)}
      draggable={false}
    />
  );
}
