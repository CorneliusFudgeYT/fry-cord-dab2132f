import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Apple, ArrowRight, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { registerAccount, verifyTurnstileToken } from "@/lib/accounts.functions";
import { credentialsSchema, signUpSchema, usernameToEmail } from "@/lib/usernames";
import { LANGUAGES } from "@/lib/community-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/frying/Logo";
import { TurnstileChallenge } from "@/components/frying/TurnstileChallenge";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["signin", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Account — FryCord" },
      { name: "description", content: "Sign in to FryCord with your username or Google, Microsoft and Apple." },
      { property: "og:title", content: "Account — FryCord" },
      { property: "og:description", content: "Join the FryCord community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "signin" } = Route.useSearch();
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const register = useServerFn(registerAccount);
  const verifyTurnstile = useServerFn(verifyTurnstileToken);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeVersion, setChallengeVersion] = useState(0);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app" });
    });
  }, [navigate]);

  useEffect(() => {
    setTurnstileToken("");
  }, [mode]);

  function resetChallenge() {
    setTurnstileToken("");
    setChallengeVersion((value) => value + 1);
  }

  async function social(provider: "google" | "microsoft" | "apple") {
    if (isSignup && !turnstileToken) {
      toast.error("Complete the Cloudflare bot check first");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) await verifyTurnstile({ data: { token: turnstileToken } });
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (!result.redirected) navigate({ to: "/app" });
    } catch (error) {
      if (isSignup) resetChallenge();
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isSignup && !turnstileToken) {
      toast.error("Complete the Cloudflare bot check first");
      return;
    }
    const parsed = (isSignup ? signUpSchema : credentialsSchema).safeParse({
      username,
      password,
      ...(displayName.trim() ? { displayName } : {}),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        await register({ data: { ...parsed.data, turnstileToken, language } });
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(parsed.data.username),
        password: parsed.data.password,
      });
      if (error) throw new Error("Wrong username or password");
      await navigate({ to: "/app" });
    } catch (error) {
      if (isSignup) resetChallenge();
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background px-5 py-8">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link to="/"><Logo /></Link>
        <select
          aria-label="Language"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          {LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </header>

      <section className="mx-auto my-auto w-full max-w-sm py-10">
        <h1 className="font-display text-3xl font-bold">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mb-7 mt-2 text-sm text-muted-foreground">
          {isSignup ? "Join FryCord. Find your people." : "Your conversations are waiting."}
        </p>

        {isSignup && <TurnstileChallenge key={`${mode}-${challengeVersion}`} onTokenChange={setTurnstileToken} />}

        <div className="grid gap-2">
          {(["google", "microsoft", "apple"] as const).map((provider) => (
            <Button key={provider} variant="outline" className="h-11 justify-between" disabled={busy} onClick={() => social(provider)}>
              <span className="flex items-center gap-3">
                {provider === "apple" ? <Apple className="h-4 w-4" /> : (
                  <span className="grid h-4 w-4 place-items-center font-bold text-primary">
                    {provider === "google" ? "G" : "⊞"}
                  </span>
                )}
                {provider === "apple" ? "Apple (iCloud)" : provider === "google" ? "Google" : "Microsoft"}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          ))}
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">Default login · no email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={24} required />
          </div>
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="display">Display name</Label>
              <Input id="display" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={32} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} maxLength={72} required />
          </div>
          <Button className="h-11 w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account? " : "New to FryCord? "}
          <Link to="/auth" search={{ mode: isSignup ? "signin" : "signup" }} className="text-primary">
            {isSignup ? "Sign in" : "Create account"}
          </Link>
        </p>
      </section>
      <footer className="text-center text-xs text-muted-foreground">FryCord</footer>
    </main>
  );
}
