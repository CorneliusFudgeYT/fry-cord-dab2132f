import { Link, useParams } from "@tanstack/react-router";
import { Crown, Plus, Shield } from "lucide-react";

import { useMyServers } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "./app-context";
import { Logo } from "./Logo";
import { ServerDialog } from "./ServerDialog";

function RailItem({
  label,
  active,
  children,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group relative flex w-full justify-center">
          <span
            className={cn(
              "absolute left-0 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all",
              active ? "h-9" : "h-0 group-hover:h-4",
            )}
          />
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

const tile =
  "grid h-12 w-12 place-items-center overflow-hidden rounded-3xl bg-secondary text-sm font-semibold text-foreground transition-all duration-200 hover:rounded-2xl";

export function ServerRail() {
  const { me, isStaff, isOwner } = useApp();
  const { data: servers } = useMyServers(me);
  const params = useParams({ strict: false }) as { serverId?: string };
  const onHome = !params.serverId;

  return (
    <nav className="scrollbar-thin flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-rail py-3">
      <RailItem label="Home" active={onHome}>
        <Link
          to="/app"
          className={cn(tile, onHome ? "bg-flame rounded-2xl text-primary-foreground" : "hover:bg-flame hover:text-primary-foreground")}
        >
          <Logo compact />
        </Link>
      </RailItem>

      <div className="mx-auto h-0.5 w-8 rounded-full bg-border" />

      {servers?.map(({ server }) => {
        const active = params.serverId === server.id;
        return (
          <RailItem key={server.id} label={server.name} active={active}>
            <Link
              to="/app/servers/$serverId"
              params={{ serverId: server.id }}
              className={cn(tile, active ? "rounded-2xl bg-primary text-primary-foreground" : "hover:bg-primary hover:text-primary-foreground")}
            >
              {server.icon_url ? (
                <img src={server.icon_url} alt={server.name} className="h-full w-full object-cover" />
              ) : (
                server.name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 3)
                  .toUpperCase()
              )}
            </Link>
          </RailItem>
        );
      })}

      <RailItem label="Add a server">
        <ServerDialog>
          <button
            type="button"
            aria-label="Add a server"
            className={cn(tile, "text-success hover:bg-success hover:text-success-foreground")}
          >
            <Plus className="h-6 w-6" />
          </button>
        </ServerDialog>
      </RailItem>

      {isStaff && (
        <RailItem label={isOwner ? "Owner panel" : "Admin panel"}>
          <Link
            to="/app/owner"
            className={cn(tile, "text-primary hover:bg-primary hover:text-primary-foreground")}
            activeProps={{ className: "rounded-2xl bg-primary text-primary-foreground" }}
          >
            {isOwner ? <Crown className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
          </Link>
        </RailItem>
      )}
    </nav>
  );
}
