import { cn } from "@/lib/utils";

type Props = {
  name: string;
  src?: string | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
};

const sizes = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
  xl: "h-20 w-20 text-2xl",
};

/** Hue derived from the name so every person gets a stable warm tint. */
function hueFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return 20 + (h % 60);
}

export function UserAvatar({ name, src, size = "md", online, className }: Props) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        <img src={src} alt={name} className={cn("rounded-full object-cover", sizes[size])} />
      ) : (
        <span
          className={cn(
            "grid place-items-center rounded-full font-semibold text-primary-foreground",
            sizes[size],
          )}
          style={{ backgroundColor: `oklch(0.66 0.14 ${hueFor(name)})` }}
        >
          {initials}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar",
            online ? "bg-success" : "bg-muted-foreground",
          )}
        />
      )}
    </span>
  );
}
