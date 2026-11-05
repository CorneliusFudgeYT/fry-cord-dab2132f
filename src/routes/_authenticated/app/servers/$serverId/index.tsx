import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Hash } from "lucide-react";

import { useChannels } from "@/hooks/use-chat";
import { PaneHeader } from "@/components/frying/MessagePane";

export const Route = createFileRoute("/_authenticated/app/servers/$serverId/")({
  head: () => ({ meta: [{ title: "Server — FryCord" }, { name: "description", content: "Connect with your FryCord server." }, { property: "og:title", content: "Server — FryCord" }, { property: "og:description", content: "Connect with your FryCord server." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
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
        {isLoading ? "Loading…" : "No channels yet. Create one from the server menu."}
      </div>
    </>
  );
}
