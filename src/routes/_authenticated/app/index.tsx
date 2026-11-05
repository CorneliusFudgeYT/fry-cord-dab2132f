import { createFileRoute } from "@tanstack/react-router";
import { Flame, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApp } from "@/components/frying/app-context";
import { PaneHeader } from "@/components/frying/MessagePane";
import { ServerDialog } from "@/components/frying/ServerDialog";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Home — FryCord" }, { name: "description", content: "Your conversations and communities on FryCord." }, { property: "og:title", content: "Home — FryCord" }, { property: "og:description", content: "Your conversations and communities on FryCord." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Home,
});

function Home() {
  const { profile, openNav } = useApp();
  return (
    <>
      <PaneHeader icon={<Flame className="h-5 w-5" />} title="Home" />
      <div className="bg-ember flex flex-1 flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-extrabold text-foreground">
          Hey {profile?.display_name ?? "there"} <span className="text-flame">—</span> welcome to FryCord
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Your people. Your conversations.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ServerDialog>
            <Button variant="flame" size="lg">
              <Plus /> Add a server
            </Button>
          </ServerDialog>
          <Button variant="outline" size="lg" className="md:hidden" onClick={openNav}>
            Find people
          </Button>
        </div>
      </div>
    </>
  );
}
