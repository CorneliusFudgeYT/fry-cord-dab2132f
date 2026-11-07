import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { useDmThreads } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useApp } from "./app-context";
import { UserAvatar } from "./UserAvatar";
import { GroupDialog } from "./GroupDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function HomeSidebar() {
  const { me, profiles, online } = useApp();
  const { data: threads } = useDmThreads(me);
  const [query, setQuery] = useState("");
  const {data:groups=[]}=useQuery({queryKey:['groups',me],refetchInterval:5000,queryFn:async()=>{const {data,error}=await supabase.from('group_chats').select('id,name').order('created_at',{ascending:false});if(error)throw error;return data??[];}});

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...profiles.values()]
      .filter(
        (p) =>
          p.id !== me &&
          (p.username.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query, profiles, me]);

  const list = query.trim() ? matches.map((p) => p.id) : (threads ?? []).map((t) => t.otherId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-sidebar-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find someone to message"
            className="h-9 bg-rail pl-8"
          />
        </div>
      </div>
      <p className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {query.trim() ? "People" : "Direct messages"}
      </p>
      <GroupDialog />
      {groups.map(g=><Link key={g.id} to="/app/groups/$groupId" params={{groupId:g.id}} className="mx-2 truncate rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent" activeProps={{className:'bg-sidebar-accent'}}>{g.name}</Link>)}
      <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {list.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {query.trim() ? "No one by that name yet." : "Search above to start a conversation."}
          </p>
        )}
        {list.map((id) => {
          const p = profiles.get(id);
          if (!p) return null;
          return (
            <Link
              key={id}
              to="/app/dms/$userId"
              params={{ userId: id }}
              onClick={() => setQuery("")}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 text-sidebar-foreground hover:bg-sidebar-accent",
              )}
              activeProps={{ className: "bg-sidebar-accent text-foreground" }}
            >
              <UserAvatar name={p.display_name} src={p.avatar_url} size="sm" online={online.has(id)} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.display_name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
