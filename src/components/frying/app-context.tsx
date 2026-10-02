import { createContext, useContext } from "react";

import type { Profile } from "@/hooks/use-session";

export type AppContextValue = {
  me: string;
  profile: Profile | null;
  roles: ("owner" | "admin")[];
  isStaff: boolean;
  isOwner: boolean;
  online: Set<string>;
  profiles: Map<string, Profile>;
  openNav: () => void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside the app shell");
  return ctx;
}

export function nameOf(profiles: Map<string, Profile>, id: string) {
  return profiles.get(id)?.display_name ?? "Unknown";
}
