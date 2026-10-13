import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/servers/$serverId")({
  component: () => <Outlet />,
});
