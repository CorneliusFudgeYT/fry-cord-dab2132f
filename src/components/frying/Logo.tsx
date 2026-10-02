import { Flame } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="bg-flame shadow-glow grid h-9 w-9 place-items-center rounded-xl">
        <Flame className="h-5 w-5 text-primary-foreground" />
      </span>
      {!compact && (
        <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
          Frying Pan
        </span>
      )}
    </span>
  );
}
