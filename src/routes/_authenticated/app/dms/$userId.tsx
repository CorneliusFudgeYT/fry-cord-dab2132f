import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { ensureDmThread, useDmMessages } from "@/hooks/use-chat";
import { useApp } from "@/components/frying/app-context";
import { MessagePane, PaneHeader } from "@/components/frying/MessagePane";

export const Route = createFileRoute("/_authenticated/app/dms/$userId")({
  component: DmPage,
});

function DmPage() {
  const { userId } = Route.useParams();
  const { me, profiles } = useApp();
  const queryClient = useQueryClient();
  const other = profiles.get(userId);

  const { data: threadId } = useQuery({
    queryKey: ["dm-thread", me, userId],
    queryFn: async () => {
      const id = await ensureDmThread(me, userId);
      queryClient.invalidateQueries({ queryKey: ["dm-threads"] });
      return id;
    },
  });
  const { data: messages = [] } = useDmMessages(threadId);
  const name = other?.display_name ?? "Conversation";

  return (
    <>
      <PaneHeader icon={<AtSign className="h-5 w-5" />} title={name} subtitle={other ? `@${other.username}` : null} />
      <MessagePane
        messages={messages}
        emptyTitle={name}
        placeholder={`Message @${other?.username ?? "…"}`}
        canDelete={(m) => m.author_id === me}
        onSend={async (content) => {
          if (!threadId) return;
          const { error } = await supabase.from("dm_messages").insert({ thread_id: threadId, author_id: me, content });
          if (error) toast.error("Message didn't send");
        }}
        onDelete={async (id) => {
          await supabase.from("dm_messages").delete().eq("id", id);
        }}
      />
    </>
  );
}
