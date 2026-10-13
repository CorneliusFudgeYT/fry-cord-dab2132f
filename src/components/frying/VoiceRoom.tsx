import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useApp } from "./app-context";
import { UserAvatar } from "./UserAvatar";

type Signal = { from: string; to: string; kind: "offer" | "answer" | "ice"; data: unknown };
type Presence = { muted: boolean; inRoom: boolean };

const ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];

function RemoteAudio({ stream }: { stream: MediaStream }) {
  return (
    <audio
      autoPlay
      ref={(el) => {
        if (el && el.srcObject !== stream) el.srcObject = stream;
      }}
    />
  );
}

export function VoiceRoom({ channelId, name }: { channelId: string; name: string }) {
  const { me, profiles } = useApp();
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [people, setPeople] = useState<Record<string, Presence>>({});
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});

  const rt = useRef<RealtimeChannel | null>(null);
  const local = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const joinedRef = useRef(false);

  const send = useCallback(
    (s: Omit<Signal, "from">) => rt.current?.send({ type: "broadcast", event: "signal", payload: { ...s, from: me } }),
    [me],
  );

  const closePeer = useCallback((id: string) => {
    peers.current.get(id)?.close();
    peers.current.delete(id);
    setStreams((s) => {
      const n = { ...s };
      delete n[id];
      return n;
    });
  }, []);

  const makePeer = useCallback(
    (other: string) => {
      const existing = peers.current.get(other);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: ICE });
      local.current?.getTracks().forEach((t) => pc.addTrack(t, local.current!));
      pc.onicecandidate = (e) => e.candidate && send({ to: other, kind: "ice", data: e.candidate.toJSON() });
      pc.ontrack = (e) => setStreams((s) => ({ ...s, [other]: e.streams[0]! }));
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") closePeer(other);
      };
      peers.current.set(other, pc);
      return pc;
    },
    [send, closePeer],
  );

  // Watch the room (presence) and handle signaling.
  useEffect(() => {
    const ch = supabase.channel(`voice:${channelId}`, {
      config: { presence: { key: me }, broadcast: { self: false } },
    });
    rt.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Presence>();
      const next: Record<string, Presence> = {};
      for (const [id, metas] of Object.entries(state)) {
        const meta = metas[metas.length - 1];
        if (meta?.inRoom) next[id] = { muted: !!meta.muted, inRoom: true };
      }
      setPeople(next);
      for (const id of peers.current.keys()) if (!next[id]) closePeer(id);
    });

    ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const s = payload as Signal;
      if (s.to !== me || !joinedRef.current) return;
      try {
        if (s.kind === "offer") {
          const pc = makePeer(s.from);
          await pc.setRemoteDescription(s.data as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ to: s.from, kind: "answer", data: answer });
        } else if (s.kind === "answer") {
          await peers.current.get(s.from)?.setRemoteDescription(s.data as RTCSessionDescriptionInit);
        } else {
          await peers.current.get(s.from)?.addIceCandidate(s.data as RTCIceCandidateInit);
        }
      } catch (err) {
        console.warn("voice signal failed", err);
      }
    });

    ch.subscribe();

    return () => {
      joinedRef.current = false;
      for (const id of [...peers.current.keys()]) closePeer(id);
      local.current?.getTracks().forEach((t) => t.stop());
      local.current = null;
      supabase.removeChannel(ch);
      rt.current = null;
      setJoined(false);
    };
  }, [channelId, me, makePeer, send, closePeer]);

  async function join() {
    try {
      local.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      toast.error("Microphone access is needed to join voice");
      return;
    }
    joinedRef.current = true;
    setJoined(true);
    setMuted(false);
    await rt.current?.track({ muted: false, inRoom: true });
    // Newcomer calls everyone already in the room.
    const state = rt.current?.presenceState<Presence>() ?? {};
    for (const [id, metas] of Object.entries(state)) {
      if (id === me || !metas[metas.length - 1]?.inRoom) continue;
      const pc = makePeer(id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ to: id, kind: "offer", data: offer });
    }
  }

  async function leave() {
    joinedRef.current = false;
    for (const id of [...peers.current.keys()]) closePeer(id);
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    setJoined(false);
    await rt.current?.untrack();
  }

  async function toggleMute() {
    const next = !muted;
    local.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
    await rt.current?.track({ muted: next, inRoom: true });
  }

  const ids = Object.keys(people);

  return (
    <div className="bg-ember flex min-h-0 flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <Volume2 className="mx-auto h-8 w-8 text-primary" />
        <h3 className="mt-2 text-2xl font-bold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground">
          {ids.length ? `${ids.length} in the room` : "No one's here yet"}
        </p>
      </div>

      <div className="flex max-w-2xl flex-wrap justify-center gap-4">
        {ids.map((id) => {
          const p = profiles.get(id);
          const label = p?.display_name ?? "Someone";
          return (
            <div key={id} className="flex w-32 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
              <div className="relative">
                <UserAvatar name={label} src={p?.avatar_url} size="xl" />
                {people[id]?.muted && (
                  <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground">
                    <MicOff className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <span className="w-full truncate text-center text-sm font-medium text-foreground">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        {joined ? (
          <>
            <Button variant={muted ? "destructive" : "secondary"} size="lg" onClick={toggleMute}>
              {muted ? <MicOff /> : <Mic />} {muted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="destructive" size="lg" onClick={leave}>
              <PhoneOff /> Leave
            </Button>
          </>
        ) : (
          <Button variant="flame" size="lg" onClick={join}>
            <Mic /> Join voice
          </Button>
        )}
      </div>

      {Object.entries(streams).map(([id, s]) => (
        <RemoteAudio key={id} stream={s} />
      ))}
    </div>
  );
}
