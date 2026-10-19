import pan from "@/assets/frycord-pan.png.asset.json";
export function Logo({ compact = false }: { compact?: boolean }) {
  return <span className="inline-flex items-center gap-3"><img src={pan.url} alt="FryCord" className="h-10 w-10 rounded-lg object-cover" />{!compact && <span className="font-display text-2xl font-bold text-foreground">FryCord</span>}</span>;
}
