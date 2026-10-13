import { createFileRoute } from "@tanstack/react-router";
import { Flame, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApp } from "@/components/frying/app-context";
import { PaneHeader } from "@/components/frying/MessagePane";
import { ServerDialog } from "@/components/frying/ServerDialog";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Home,
});

function Home() {
  const { profile, openNav } = useApp();
  return (
    <>
      <PaneHeader icon={<Flame className="h-5 w-5" />} title="Home" />
      <div className="bg-ember flex flex-1 flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-extrabold text-foreground">
          Hey {profile?.display_name ?? "there"} <span className="text-flame">—</span> what's cooking?
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Start a server for your crew, join one with an invite code, or message someone directly.
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
