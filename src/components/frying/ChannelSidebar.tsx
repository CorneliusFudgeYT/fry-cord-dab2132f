import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Copy, Hash, LogOut, Plus, Trash2, Volume2, Video, Music, Film, FileText, Shield, Award } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useChannels, useMembers, useServer } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useApp } from "./app-context";

export function useServerPermissions(serverId: string) {
  const { me, isStaff } = useApp();
  const { data: server } = useServer(serverId);
  const { data: members } = useMembers(serverId);
  const mine = members?.find((m) => m.user_id === me);
  const isServerOwner = server?.owner_id === me;
  const canManage = isStaff || isServerOwner || mine?.role === "admin" || mine?.role === "owner";
  return { server, members, mine, isServerOwner, canManage };
}

export function ChannelSidebar({ serverId }: { serverId: string }) {
  const { data: channels } = useChannels(serverId);
  const { server, canManage, isServerOwner } = useServerPermissions(serverId);
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { me } = useApp();

  const text = channels?.filter((c) => c.kind === "text") ?? [];
  const community = channels?.filter(c => !["text","voice"].includes(c.kind)) ?? [];
  const world = server?.invite_code === "worldchat";
  const voice = channels?.filter((c) => c.kind === "voice") ?? [];

  async function leave() {
    const { error } = await supabase
      .from("server_members")
      .delete()
      .eq("server_id", serverId)
      .eq("user_id", me);
    if (error) { toast.error("Could not leave the server"); return; }
    await queryClient.invalidateQueries({ queryKey: ["my-servers"] });
    navigate({ to: "/app" });
  }

  async function destroy() {
    if (!confirm(`Delete ${server?.name}? This can't be undone.`)) return;
    const { error } = await supabase.from("servers").delete().eq("id", serverId);
    if (error) { toast.error("Could not delete the server"); return; }
    await queryClient.invalidateQueries({ queryKey: ["my-servers"] });
    navigate({ to: "/app" });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-12 items-center justify-between border-b border-sidebar-border px-4 text-left font-display font-bold text-foreground hover:bg-sidebar-accent">
            <span className="truncate">{server?.name ?? "…"}</span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuItem
            onClick={() => {
              if (!server) return;
              navigator.clipboard.writeText(server.invite_code);
              toast.success(`Invite code copied: ${server.invite_code}`);
            }}
          >
            <Copy className="h-4 w-4" /> Copy invite code
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuItem onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create channel
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {!world && (isServerOwner ? (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={destroy}>
              <Trash2 className="h-4 w-4" /> Delete server
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={leave}>
              <LogOut className="h-4 w-4" /> Leave server
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
        <Section title="Text channels" onAdd={canManage ? () => setCreateOpen(true) : undefined} />
        {text.map((c) => (
          <ChannelLink key={c.id} serverId={serverId} channelId={c.id} name={c.name} kind="text" />
        ))}
        <div className="h-4" />
        <Section title="Voice channels" onAdd={canManage ? () => setCreateOpen(true) : undefined} />
        {voice.map((c) => (
          <ChannelLink key={c.id} serverId={serverId} channelId={c.id} name={c.name} kind="voice" />
        ))}
        {community.length > 0 && <><div className="h-4"/><Section title="Community"/>{community.map(c => <ChannelLink key={c.id} serverId={serverId} channelId={c.id} name={c.name} kind={c.kind}/>)}</>}
      </div>

      <CreateChannelDialog serverId={serverId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function Section({ title, onAdd }: { title: string; onAdd?: (() => void) | undefined }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      {onAdd && (
        <button
          onClick={onAdd}
          aria-label={`Add to ${title}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ChannelLink({
  serverId,
  channelId,
  name,
  kind,
}: {
  serverId: string;
  channelId: string;
  name: string;
  kind: import("@/hooks/use-chat").ChannelRow["kind"];
}) {
  const Icon = ({text:Hash,voice:Volume2,livestream:Video,music:Music,reels:Film,forum:FileText,staff:Shield,applications:Award})[kind];
  return (
    <Link
      to="/app/servers/$serverId/$channelId"
      params={{ serverId, channelId }}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      activeProps={{ className: "bg-sidebar-accent text-foreground font-medium" }}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <span className="truncate">{name}</span>
    </Link>
  );
}

function CreateChannelDialog({
  serverId,
  open,
  onOpenChange,
}: {
  serverId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"text" | "voice">("text");
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean =
      kind === "text"
        ? name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "")
        : name.trim();
    if (clean.length < 1 || clean.length > 32) { toast.error("Name must be 1–32 characters"); return; }
    const { data, error } = await supabase
      .from("channels")
      .insert({ server_id: serverId, name: clean, kind, position: 99 })
      .select("id")
      .single();
    if (error || !data) { toast.error("Could not create that channel"); return; }
    setName("");
    onOpenChange(false);
    navigate({ to: "/app/servers/$serverId/$channelId", params: { serverId, channelId: data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <RadioGroup value={kind} onValueChange={(v) => setKind(v as "text" | "voice")} className="grid grid-cols-2 gap-2">
            {(["text", "voice"] as const).map((k) => (
              <Label
                key={k}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary p-3 has-[[data-state=checked]]:border-primary"
              >
                <RadioGroupItem value={k} />
                {k === "text" ? <Hash className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span className="capitalize">{k}</span>
              </Label>
            ))}
          </RadioGroup>
          <div className="space-y-1.5">
            <Label htmlFor="channel-name">Channel name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "text" ? "new-channel" : "Hangout"}
              maxLength={32}
            />
          </div>
          <Button type="submit" variant="flame" className="w-full">
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
