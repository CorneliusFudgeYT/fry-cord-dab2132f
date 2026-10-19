import { useMediaUrl } from "@/lib/media";
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

export function UserAvatar({ name, src, size = "md", online, className }: Props) {
  const { data: picture } = useMediaUrl(src);
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {picture ? (
        <img src={picture} alt={name} className={cn("rounded-full object-cover", sizes[size])} />
      ) : (
        <span
          className={cn(
            "grid place-items-center rounded-full font-semibold text-primary-foreground bg-primary",
            sizes[size],
          )}
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
