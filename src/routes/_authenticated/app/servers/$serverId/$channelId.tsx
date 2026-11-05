import { createFileRoute } from "@tanstack/react-router";
import { Hash, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useChannels, useMessages } from "@/hooks/use-chat";
import { useApp } from "@/components/frying/app-context";
import { useServerPermissions } from "@/components/frying/ChannelSidebar";
import { MemberList } from "@/components/frying/MemberList";
import { MessagePane, PaneHeader } from "@/components/frying/MessagePane";
import { VoiceRoom } from "@/components/frying/VoiceRoom";
import { ApplicationsBoard, ForumBoard, MediaBoard, StaffBoard } from "@/components/frying/CommunityBoards";

export const Route = createFileRoute("/_authenticated/app/servers/$serverId/$channelId")({
  head: () => ({ meta: [{ title: "Channels — FryCord" }, { name: "description", content: "Chat, share and connect in FryCord channels." }, { property: "og:title", content: "Channels — FryCord" }, { property: "og:description", content: "Chat, share and connect in FryCord channels." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChannelPage,
});

function ChannelPage() {
  const { serverId, channelId } = Route.useParams();
  const { me } = useApp();
  const { data: channels } = useChannels(serverId);
  const { canManage } = useServerPermissions(serverId);
  const channel = channels?.find((c) => c.id === channelId);
  const isVoice = channel?.kind === "voice";
  const { data: messages = [] } = useMessages(isVoice ? undefined : channelId);

  return (
    <>
      <PaneHeader
        icon={isVoice ? <Volume2 className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
        title={channel?.name ?? "…"}
        subtitle={channel?.topic}
      />
      <div className="flex min-h-0 flex-1">
        {channel?.kind === "forum" ? <ForumBoard /> : channel?.kind === "reels" ? <MediaBoard kind="reel" /> : channel?.kind === "music" ? <MediaBoard kind="music" /> : channel?.kind === "applications" ? <ApplicationsBoard /> : channel?.kind === "staff" ? <StaffBoard /> : isVoice ? (
          <VoiceRoom key={channelId} channelId={channelId} name={channel?.name ?? "Voice"} />
        ) : (
          <MessagePane
            messages={messages}
            emptyTitle={`Welcome to #${channel?.name ?? ""}`}
            placeholder={`Message #${channel?.name ?? ""}`}
            canDelete={(m) => m.author_id === me || canManage}
            onSend={async (content, media) => {
              const { error } = await supabase.from("messages").insert({ channel_id: channelId, author_id: me, content, media_url: media ?? null });
              if (error) throw new Error(error.message);
            }}
            onDelete={async (id) => {
              const { error } = await supabase.from("messages").delete().eq("id", id);
              if (error) toast.error("Could not delete that message");
            }}
          />
        )}
        <MemberList serverId={serverId} />
      </div>
    </>
  );
}
