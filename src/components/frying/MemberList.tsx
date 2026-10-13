import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Crown, MessageSquare, MoreVertical, Shield, UserMinus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { MemberRow } from "@/hooks/use-chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "./app-context";
import { useServerPermissions } from "./ChannelSidebar";
import { UserAvatar } from "./UserAvatar";

const ORDER = ["owner", "admin", "moderator", "member"] as const;
const LABEL: Record<MemberRow["role"], string> = {
  owner: "Owner",
  admin: "Admins",
  moderator: "Moderators",
  member: "Members",
};

export function MemberList({ serverId }: { serverId: string }) {
  const { me, profiles, online } = useApp();
  const { members, canManage } = useServerPermissions(serverId);
  const navigate = useNavigate();

  async function setRole(m: MemberRow, role: MemberRow["role"]) {
    const { error } = await supabase.from("server_members").update({ role }).eq("id", m.id);
    if (error) toast.error("Could not change that role");
  }
  async function kick(m: MemberRow) {
    const { error } = await supabase.from("server_members").delete().eq("id", m.id);
    if (error) toast.error("Could not remove that member");
  }

  return (
    <aside className="scrollbar-thin hidden w-60 shrink-0 overflow-y-auto border-l border-border bg-sidebar px-2 py-4 lg:block">
      {ORDER.map((role) => {
        const group = (members ?? []).filter((m) => m.role === role);
        if (!group.length) return null;
        return (
          <div key={role} className="mb-4">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {LABEL[role]} — {group.length}
            </p>
            {group.map((m) => {
              const p = profiles.get(m.user_id);
              const name = p?.display_name ?? "Unknown";
              return (
                <div key={m.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent">
                  <UserAvatar name={name} src={p?.avatar_url} size="sm" online={online.has(m.user_id)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 truncate text-sm font-medium text-sidebar-foreground">
                      {name}
                      {m.role === "owner" && <Crown className="h-3.5 w-3.5 text-primary-glow" />}
                      {m.role === "admin" && <Shield className="h-3.5 w-3.5 text-primary" />}
                    </span>
                  </span>
                  {m.user_id !== me && (
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label="Member options" className="text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate({ to: "/app/dms/$userId", params: { userId: m.user_id } })}>
                          <MessageSquare className="h-4 w-4" /> Message
                        </DropdownMenuItem>
                        {canManage && m.role !== "owner" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Set rank</DropdownMenuLabel>
                            {(["admin", "moderator", "member"] as const).map((r) => (
                              <DropdownMenuItem key={r} disabled={m.role === r} onClick={() => setRole(m, r)} className="capitalize">
                                {r}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => kick(m)}>
                              <UserMinus className="h-4 w-4" /> Kick
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
