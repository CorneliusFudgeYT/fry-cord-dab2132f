import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { normalizeUsername, signUpSchema, usernameToEmail } from "./usernames";
import { turnstileTokenSchema } from "./turnstile";

type TurnstileVerification = {
  success?: boolean;
  "error-codes"?: string[];
};

async function verifyWithCloudflare(token: string, secret: string) {
  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
  } catch {
    throw new Error("Cloudflare could not be reached. Please try the bot check again.");
  }

  if (!response.ok) throw new Error("Cloudflare verification is temporarily unavailable");
  const result = (await response.json().catch(() => null)) as TurnstileVerification | null;
  if (!result?.success) throw new Error("Cloudflare could not verify you. Please retry the bot check.");
  return { verified: true as const };
}

/** Public: returns the publishable key used to render Cloudflare Turnstile. */
export const getTurnstileConfig = createServerFn({ method: "GET" }).handler(async () => ({
  siteKey: process.env["TURNSTILE_SITE_KEY"] ?? null,
}));

/** Public: verifies social-signup visitors before starting their provider flow. */
export const verifyTurnstileToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: turnstileTokenSchema }).parse(input))
  .handler(async ({ data }) => {
    const secret = process.env["TURNSTILE_SECRET_KEY"];
    if (!secret) throw new Error("The Cloudflare bot check is not configured yet");
    return verifyWithCloudflare(data.token, secret);
  });

/** Public: creates an account from a username + password only. */
export const registerAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signUpSchema.extend({ turnstileToken: turnstileTokenSchema, language: z.string().default("en") }).parse(input))
  .handler(async ({ data }) => {
    const turnstileSecret = process.env["TURNSTILE_SECRET_KEY"];
    if (!turnstileSecret) throw new Error("The Cloudflare bot check is not configured yet");
    await verifyWithCloudflare(data.turnstileToken, turnstileSecret);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const username = data.username.trim();
    const handle = normalizeUsername(username);
    if (handle === "son") throw new Error("This username is reserved for the owner");

    const { data: taken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", handle)
      .maybeSingle();

    if (taken) throw new Error("That username is already taken");

    const email = usernameToEmail(handle);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: handle, display_name: data.displayName ?? username },
    });

    if (error || !created?.user) {
      throw new Error(error?.message ?? "Could not create that account");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      username: handle,
      display_name: data.displayName?.trim() || username,
      language: data.language,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Could not finish setting up that account");
    }

    return { email, username: handle };
  });

/** Public: lets the sign-in form turn a username into the internal address. */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ username: z.string().trim().min(1) }).parse(input))
  .handler(async ({ data }) => ({ email: usernameToEmail(data.username) }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireStaff(ctx: { supabase: any; userId: string }): Promise<"owner" | "admin" | "developer"> {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (error) throw new Error("Could not verify your permissions");
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("owner")) return "owner";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("developer")) return "developer";
  throw new Error("Only the site owner and admins can do that");
}

/** Owner/admin: full account listing including the internal address and activity. */
export const listAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (await requireStaff(context) !== "owner") throw new Error("Only the owner can view private account information");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw new Error("Could not load accounts");

    const [{ data: profiles }, { data: roles }, { data: memberships }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, username, display_name, avatar_url, bio, created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("server_members").select("user_id, server_id"),
    ]);

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const rolesById = new Map<string, string[]>();
    for (const r of roles ?? []) {
      rolesById.set(r.user_id, [...(rolesById.get(r.user_id) ?? []), r.role]);
    }
    const serverCount = new Map<string, number>();
    for (const m of memberships ?? []) {
      serverCount.set(m.user_id, (serverCount.get(m.user_id) ?? 0) + 1);
    }

    return authUsers.users.map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        username: profile?.username ?? "(no profile)",
        displayName: profile?.display_name ?? "(no profile)",
        avatarUrl: profile?.avatar_url ?? null,
        bio: profile?.bio ?? null,
        loginAddress: user.email ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        roles: rolesById.get(user.id) ?? [],
        serverCount: serverCount.get(user.id) ?? 0,
      };
    });
  });

/** Owner only: grant or revoke an admin badge. */
export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), makeAdmin: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const level = await requireStaff(context);
    if (level !== "owner") throw new Error("Only the site owner can assign admins");
    if (data.userId === context.userId) throw new Error("You already own this place");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error("Could not assign that admin");
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error("Could not remove that admin");
    }

    return { ok: true };
  });
