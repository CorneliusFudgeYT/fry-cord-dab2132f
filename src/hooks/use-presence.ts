import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** Tracks who is currently online across the whole site. */
export function useOnlineUsers(userId: string | undefined) {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("presence:frying-pan", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return online;
}
