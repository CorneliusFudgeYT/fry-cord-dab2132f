import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { Crown, Search, Shield } from "lucide-react";
import { toast } from "sonner";

import { listAccounts, setAdminRole } from "@/lib/accounts.functions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/components/frying/app-context";
import { PaneHeader } from "@/components/frying/MessagePane";
import { UserAvatar } from "@/components/frying/UserAvatar";
import { manageRank, suspendAccount } from "@/lib/community.functions";
import { ApplicationsBoard } from "@/components/frying/CommunityBoards";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/owner")({
  head: () => ({meta:[{title:"Owner & moderation — FryCord"},{name:"description",content:"FryCord account management and moderation."},{property:"og:title",content:"Owner & moderation — FryCord"},{property:"og:description",content:"FryCord account management and moderation."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),
  component: OwnerPanel,
});

function OwnerPanel() {
  const { isStaff, isOwner, me, online, profiles } = useApp();
  const rank = useServerFn(manageRank);
  const suspend = useServerFn(suspendAccount);
  const fetchAccounts = useServerFn(listAccounts);
  const toggleAdmin = useServerFn(setAdminRole);
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ["accounts"],
    enabled: isOwner,
    queryFn: () => fetchAccounts(),
  });

  if (!isStaff) {
    return (
      <>
        <PaneHeader icon={<Shield className="h-5 w-5" />} title="Staff only" />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">You don't have access to this page.</div>
      </>
    );
  }

  const visible = isOwner ? (accounts ?? []) : [...profiles.values()].map(p=>({id:p.id,username:p.username,displayName:p.display_name,avatarUrl:p.avatar_url,bio:p.bio,createdAt:p.created_at,lastSignInAt:null,roles:[] as string[],serverCount:0}));
  const filtered = visible.filter((a) =>
    `${a.username} ${a.displayName}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  async function onToggle(userId: string, makeAdmin: boolean) {
    try {
      await toggleAdmin({ data: { userId, makeAdmin } });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(makeAdmin ? "Admin assigned" : "Admin removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      <PaneHeader
        icon={isOwner ? <Crown className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
        title={isOwner ? "Owner panel" : "Admin panel"}
        subtitle={accounts ? `${accounts.length} accounts` : null}
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts" className="pl-9" />
          </div>
          {isLoading && <p className="text-muted-foreground">Loading accounts…</p>}
          {error && <p className="text-destructive">Could not load accounts.</p>}
          <div className="grid gap-3">
            {filtered.map((a) => {
              const isAdmin = a.roles.includes("admin");
              const isSiteOwner = a.roles.includes("owner");
              return (
                <div key={a.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <UserAvatar name={a.displayName} src={a.avatarUrl} size="lg" online={online.has(a.id)} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{a.displayName}</span>
                        <span className="text-sm text-muted-foreground">@{a.username}</span>
                        {isSiteOwner && <Badge className="bg-flame text-primary-foreground"><Crown className="mr-1 h-3 w-3" />Owner</Badge>}
                        {isAdmin && <Badge variant="secondary"><Shield className="mr-1 h-3 w-3" />Admin</Badge>}
                      </div>
                      {a.bio && <p className="mt-0.5 truncate text-sm text-muted-foreground">{a.bio}</p>}
                      <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Joined {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                        <span>Last sign-in {a.lastSignInAt ? formatDistanceToNow(new Date(a.lastSignInAt), { addSuffix: true }) : "never"}</span>
                        <span>{a.serverCount} servers</span>
                        <span className="font-mono">ID {a.id.slice(0, 8)}</span>
                      </dl>
                    </div>
                  </div>
                  {isOwner && !isSiteOwner && a.id !== me && (
                    <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm text-foreground">
                      Admin
                      <Switch checked={isAdmin} onCheckedChange={(v) => onToggle(a.id, v)} />
                    </label><label className="flex items-center gap-2 text-sm">Developer<Switch checked={a.roles.includes('developer')} onCheckedChange={async enabled=>{try{await rank({data:{userId:a.id,role:'developer',enabled}});queryClient.invalidateQueries({queryKey:['accounts']});queryClient.invalidateQueries({queryKey:['staff-list']});toast.success('Developer rank updated');}catch(e){toast.error(e instanceof Error?e.message:'Could not update rank');}}}/></label></div>
                  )}
                  {!isSiteOwner && a.id!==me && <Button variant="outline" size="sm" onClick={async()=>{const days=Number(prompt('Suspend for how many days? (1–30)'));if(!Number.isInteger(days)||days<1||days>30)return;const reason=prompt('Reason for suspension');if(!reason?.trim())return;try{await suspend({data:{userId:a.id,days,reason}});toast.success('Account suspended');}catch(e){toast.error(e instanceof Error?e.message:'Could not suspend account');}}}>Suspend</Button>}
                </div>
              );
            })}
          </div>
          <div className="mt-8"><ApplicationsBoard /></div>
        </div>
      </div>
    </>
  );
}
