import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./use-session";

export type ServerRow = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  owner_id: string;
  invite_code: string;
  created_at: string;
};

export type ChannelRow = {
  id: string;
  server_id: string;
  name: string;
  topic: string | null;
  kind: "text" | "voice" | "forum" | "reels" | "music" | "livestream" | "applications" | "staff";
  position: number;
};

export type MessageRow = {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  media_url?: string | null;
  created_at: string;
};

export type MemberRow = {
  id: string;
  server_id: string;
  user_id: string;
  role: "owner" | "admin" | "moderator" | "member";
  joined_at: string;
};

export function useAllProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, status, created_at, points, theme, language, region, background_url, last_points_claim");
      if (error) throw error;
      const list = (data ?? []) as Profile[];
      return { list, byId: new Map(list.map((p) => [p.id, p])) };
    },
  });
}

export function useMyServers(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-servers", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("server_members")
        .select("role, servers(*)")
        .eq("user_id", userId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((row) => row.servers)
        .map((row) => ({ role: row.role, server: row.servers as unknown as ServerRow }));
    },
  });
}

export function useChannels(serverId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`channels-${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels", filter: `server_id=eq.${serverId}` },
        () => queryClient.invalidateQueries({ queryKey: ["channels", serverId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  return useQuery({
    queryKey: ["channels", serverId],
    enabled: !!serverId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("id, server_id, name, topic, kind, position")
        .eq("server_id", serverId!)
        .order("kind", { ascending: true })
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChannelRow[];
    },
  });
}

export function useServer(serverId: string | undefined) {
  return useQuery({
    queryKey: ["server", serverId],
    enabled: !!serverId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servers")
        .select("*")
        .eq("id", serverId!)
        .maybeSingle();
      if (error) throw error;
      return data as ServerRow | null;
    },
  });
}

export function useMembers(serverId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`members-${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${serverId}` },
        () => queryClient.invalidateQueries({ queryKey: ["members", serverId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  return useQuery({
    queryKey: ["members", serverId],
    enabled: !!serverId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("server_members")
        .select("id, server_id, user_id, role, joined_at")
        .eq("server_id", serverId!);
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });
}

export function useMessages(channelId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId) return;
    const channel = supabase
      .channel(`messages-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", channelId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return useQuery({
    queryKey: ["messages", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, channel_id, author_id, content, created_at, media_url")
        .eq("channel_id", channelId!)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });
}

/** Finds (or creates) the private thread between two people. */
export async function ensureDmThread(me: string, other: string) {
  const [a, b] = [me, other].sort();
  const { data: found } = await supabase
    .from("dm_threads")
    .select("id")
    .eq("user_a", a!)
    .eq("user_b", b!)
    .maybeSingle();
  if (found) return found.id;

  const { data: created, error } = await supabase
    .from("dm_threads")
    .insert({ user_a: a!, user_b: b! })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

export function useDmThreads(userId: string | undefined) {
  return useQuery({
    queryKey: ["dm-threads", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dm_threads")
        .select("id, user_a, user_b, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        otherId: t.user_a === userId ? t.user_b : t.user_a,
      }));
    },
  });
}

export function useDmMessages(threadId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`dm-${threadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
        () => queryClient.invalidateQueries({ queryKey: ["dm-messages", threadId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  return useQuery({
    queryKey: ["dm-messages", threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("id, thread_id, author_id, content, created_at, media_url")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
}
