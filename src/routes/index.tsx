import { createFileRoute, Link } from "@tanstack/react-router";
import { Hash, Mic, Shield, MessagesSquare } from "lucide-react";

import hero from "@/assets/frying-pan-hero.jpg";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/frying/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Frying Pan — where your crew gets cooking" },
      {
        name: "description",
        content: "Text channels, voice rooms and DMs. Sign up with just a username and password.",
      },
      { property: "og:title", content: "Frying Pan — where your crew gets cooking" },
      {
        property: "og:description",
        content: "Text channels, voice rooms and DMs. Sign up with just a username and password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Hash, title: "Text channels", body: "Organize every conversation into its own channel." },
  { icon: Mic, title: "Voice rooms", body: "Drop into a room and talk — no calls to schedule." },
  { icon: MessagesSquare, title: "Direct messages", body: "Private one-on-one chats with anyone." },
  { icon: Shield, title: "No email needed", body: "Just a username and a password. That's it." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="bg-ember pointer-events-none absolute inset-0" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
          </Button>
          <Button asChild variant="flame" size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>Join</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-6 lg:grid-cols-2 lg:pt-16">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            Hot off the stove
          </p>
          <h1 className="text-5xl font-extrabold leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
            Where your crew <span className="text-flame">gets cooking.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Servers, channels, voice rooms and DMs — all in one place. No email, no fuss.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="flame" size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>Create your account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth" search={{ mode: "signin" }}>I have an account</Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="bg-flame absolute -inset-6 rounded-[2rem] opacity-20 blur-3xl" />
          <img
            src={hero}
            alt="A cast-iron frying pan glowing with molten copper embers"
            width={1536}
            height={1024}
            className="shadow-panel relative aspect-[3/2] w-full rounded-3xl border border-border object-cover"
          />
        </div>
      </main>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-4 px-5 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card/70 p-5">
            <f.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold text-foreground">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
