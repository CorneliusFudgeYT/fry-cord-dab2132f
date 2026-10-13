import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Hash } from "lucide-react";

import { useChannels } from "@/hooks/use-chat";
import { PaneHeader } from "@/components/frying/MessagePane";

export const Route = createFileRoute("/_authenticated/app/servers/$serverId/")({
  component: ServerIndex,
});

function ServerIndex() {
  const { serverId } = Route.useParams();
  const { data: channels, isLoading } = useChannels(serverId);
  const navigate = useNavigate();

  useEffect(() => {
    const first = channels?.find((c) => c.kind === "text") ?? channels?.[0];
    if (first) {
      navigate({ to: "/app/servers/$serverId/$channelId", params: { serverId, channelId: first.id }, replace: true });
    }
  }, [channels, serverId, navigate]);

  return (
    <>
      <PaneHeader icon={<Hash className="h-5 w-5" />} title="…" />
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        {isLoading ? "Heating up…" : "No channels yet. Create one from the server menu."}
      </div>
    </>
  );
}
