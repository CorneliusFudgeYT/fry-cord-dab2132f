import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import { useApp } from "./app-context";
import { UserAvatar } from "./UserAvatar";

export function UserBar() {
  const { profile, me, online } = useApp();
  const name = profile?.display_name ?? "You";
  return (
    <div className="flex items-center gap-2 border-t border-sidebar-border bg-rail/60 px-2 py-2">
      <UserAvatar name={name} src={profile?.avatar_url} size="md" online={online.has(me)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">@{profile?.username}</p>
      </div>
      <Link
        to="/app/settings"
        aria-label="Settings"
        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  );
}
