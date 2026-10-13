import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Outlet, useLocation, useParams } from "@tanstack/react-router";

import { useAllProfiles } from "@/hooks/use-chat";
import { useOnlineUsers } from "@/hooks/use-presence";
import { useMyRoles } from "@/hooks/use-session";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppContext } from "@/components/frying/app-context";
import { ChannelSidebar } from "@/components/frying/ChannelSidebar";
import { HomeSidebar } from "@/components/frying/HomeSidebar";
import { ServerRail } from "@/components/frying/ServerRail";
import { UserBar } from "@/components/frying/UserBar";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Frying Pan" }] }),
  component: AppShell,
});

function AppShell() {
  const { user } = Route.useRouteContext();
  const me = user.id;
  const { data: profileData } = useAllProfiles();
  const { data: roles = [] } = useMyRoles(me);
  const online = useOnlineUsers(me);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const params = useParams({ strict: false }) as { serverId?: string };

  useEffect(() => setNavOpen(false), [location.pathname]);

  const profiles = profileData?.byId ?? new Map();
  const value = useMemo(
    () => ({
      me,
      profile: profiles.get(me) ?? null,
      roles,
      isStaff: roles.length > 0,
      isOwner: roles.includes("owner"),
      online,
      profiles,
      openNav: () => setNavOpen(true),
    }),
    [me, profiles, roles, online],
  );

  const sidebar = params.serverId ? <ChannelSidebar serverId={params.serverId} /> : <HomeSidebar />;
  const column = (
    <>
      <ServerRail />
      <div className="flex w-60 min-w-0 flex-col bg-sidebar">
        {sidebar}
        <UserBar />
      </div>
    </>
  );

  return (
    <AppContext.Provider value={value}>
      <TooltipProvider delayDuration={150}>
        <div className="flex h-dvh overflow-hidden bg-background">
          <div className="hidden md:flex">{column}</div>
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetContent side="left" className="flex w-[312px] max-w-[85vw] gap-0 border-r-0 p-0 [&>button]:hidden">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {column}
            </SheetContent>
          </Sheet>
          <main className="flex min-w-0 flex-1 flex-col">
            <Outlet />
          </main>
        </div>
      </TooltipProvider>
    </AppContext.Provider>
  );
}
