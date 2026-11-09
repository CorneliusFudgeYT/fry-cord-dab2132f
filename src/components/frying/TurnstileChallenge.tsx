import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { getTurnstileConfig } from "@/lib/accounts.functions";
import { turnstileErrorMessage } from "@/lib/turnstile";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "auto";
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": (code: string) => boolean;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptRequest: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptRequest) return scriptRequest;

  scriptRequest = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-frycord-turnstile]");
    const script = existing ?? document.createElement("script");

    script.addEventListener("load", () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Cloudflare Turnstile did not initialize"));
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Cloudflare Turnstile could not load")), { once: true });

    if (!existing) {
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset["frycordTurnstile"] = "true";
      document.head.appendChild(script);
    }
  }).catch((error) => {
    scriptRequest = null;
    throw error;
  });

  return scriptRequest;
}

export function TurnstileChallenge({ onTokenChange }: { onTokenChange: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const getConfig = useServerFn(getTurnstileConfig);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;
    const container = containerRef.current;
    if (!container) return;

    setLoading(true);
    setError(null);
    onTokenChange("");

    async function mount() {
      try {
        const { siteKey } = await getConfig();
        if (!siteKey) throw new Error("The Cloudflare bot check is not configured yet");
        const turnstile = await loadTurnstile();
        if (cancelled || !container) return;
        widgetId = turnstile.render(container, {
          sitekey: siteKey,
          theme: "auto",
          size: "flexible",
          callback: (token) => onTokenChange(token),
          "expired-callback": () => onTokenChange(""),
          "error-callback": (code) => {
            onTokenChange("");
            setError(turnstileErrorMessage(code));
            return true;
          },
        });
        if (!cancelled) setLoading(false);
      } catch (cause) {
        if (!cancelled) {
          setLoading(false);
          setError(cause instanceof Error ? cause.message : "The bot check could not load");
        }
      }
    }

    void mount();
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [attempt, getConfig, onTokenChange]);

  return (
    <div className="mb-5 space-y-2" aria-live="polite">
      <div ref={containerRef} className="min-h-[65px] w-full" />
      {loading && <p className="text-xs text-muted-foreground">Loading Cloudflare bot check…</p>}
      {error && (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>{error}</p>
          <button type="button" className="font-medium text-primary underline" onClick={() => setAttempt((value) => value + 1)}>
            Retry bot check
          </button>
        </div>
      )}
    </div>
  );
}
