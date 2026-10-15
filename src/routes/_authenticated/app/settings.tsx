import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { displayNameSchema, passwordSchema } from "@/lib/usernames";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/components/frying/app-context";
import { PaneHeader } from "@/components/frying/MessagePane";
import { UserAvatar } from "@/components/frying/UserAvatar";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { me, profile } = useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setBio(profile.bio ?? "");
    setAvatar(profile.avatar_url ?? "");
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const name = displayNameSchema.safeParse(displayName);
    if (!name.success) { toast.error(name.error.issues[0]!.message); return; }
    const url = avatar.trim();
    if (url && !/^https:\/\/\S+$/.test(url)) { toast.error("Picture link must start with https://"); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.data, bio: bio.trim().slice(0, 190) || null, avatar_url: url || null })
      .eq("id", me);
    if (error) { toast.error("Could not save your profile"); return; }
    await queryClient.invalidateQueries({ queryKey: ["profiles"] });
    toast.success("Profile saved");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const p = passwordSchema.safeParse(password);
    if (!p.success) { toast.error(p.error.issues[0]!.message); return; }
    const { error } = await supabase.auth.updateUser({ password: p.data });
    if (error) { toast.error(error.message); return; }
    setPassword("");
    toast.success("Password changed");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  return (
    <>
      <PaneHeader icon={<Settings className="h-5 w-5" />} title="Settings" />
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-xl space-y-8">
          <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <UserAvatar name={displayName || "?"} src={avatar || null} size="xl" />
              <div>
                <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dn">Display name</Label>
              <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="av">Profile picture link</Label>
              <Input id="av" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">About me</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={190} rows={3} />
            </div>
            <Button type="submit" variant="flame">Save profile</Button>
          </form>

          <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground">Change password</h3>
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)" maxLength={72} />
            <Button type="submit" variant="secondary">Update password</Button>
          </form>

          <Button variant="destructive" onClick={signOut} className="w-full">
            <LogOut /> Sign out
          </Button>
        </div>
      </div>
    </>
  );
}
