import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Creates a server, makes the caller its owner, and adds starter channels. */
export const createServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(40),
        description: z.string().trim().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: server, error } = await supabaseAdmin
      .from("servers")
      .insert({ name: data.name, description: data.description ?? null, owner_id: context.userId })
      .select("id")
      .single();
    if (error || !server) throw new Error("Could not create that server");

    await supabaseAdmin
      .from("server_members")
      .insert({ server_id: server.id, user_id: context.userId, role: "owner" });

    const { data: channels } = await supabaseAdmin
      .from("channels")
      .insert([
        { server_id: server.id, name: "general", kind: "text", position: 0, topic: "Fresh off the pan" },
        { server_id: server.id, name: "off-topic", kind: "text", position: 1 },
        { server_id: server.id, name: "Lounge", kind: "voice", position: 0 },
      ])
      .select("id, kind, position");

    const first = channels?.find((c) => c.kind === "text" && c.position === 0);
    return { serverId: server.id, channelId: first?.id ?? null };
  });

/** Joins a server using its invite code. */
export const joinServerByInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().trim().min(4).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.replace(/^.*\//, "");

    const { data: server } = await supabaseAdmin
      .from("servers")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();
    if (!server) throw new Error("That invite code doesn't match any server");

    const { error } = await supabaseAdmin
      .from("server_members")
      .upsert(
        { server_id: server.id, user_id: context.userId, role: "member" },
        { onConflict: "server_id,user_id", ignoreDuplicates: true },
      );
    if (error) throw new Error("Could not join that server");

    return { serverId: server.id };
  });
