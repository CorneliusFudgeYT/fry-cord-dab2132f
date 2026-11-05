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
import { useServerFn } from "@tanstack/react-start";
import { changeUsername } from "@/lib/community.functions";
import { THEMES, LANGUAGES, REGIONS, VIP_COST } from "@/lib/community-rules";
import { uploadMedia } from "@/lib/media";
import { Notifications } from "@/components/frying/Notifications";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{title:"Settings — FryCord"},{name:"description",content:"Your FryCord profile, preferences and notifications."},{property:"og:title",content:"Settings — FryCord"},{property:"og:description",content:"Your FryCord profile, preferences and notifications."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}] }),
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
  const rename = useServerFn(changeUsername);
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("en");
  const [region, setRegion] = useState("other");
  const [background, setBackground] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setBio(profile.bio ?? "");
    setAvatar(profile.avatar_url ?? "");
    setUsername(profile.username);
    setTheme(profile.theme ?? "dark");
    setLanguage(profile.language ?? "en");
    setRegion(profile.region ?? "other");
    setBackground(profile.background_url ?? null);
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const name = displayNameSchema.safeParse(displayName);
    if (!name.success) { toast.error(name.error.issues[0]?.message ?? "Check your name"); return; }
    const url = avatar.trim();
    if (url && !/^(https:\/\/\S+|storage:avatars:\S+)$/.test(url)) { toast.error("Picture link must start with https://"); return; }
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
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Check your password"); return; }
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
          <form onSubmit={saveProfile} className="space-y-4 border-b border-border pb-6">
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
              <Input aria-label="Upload profile picture" type="file" accept="image/*" onChange={async e => { const f=e.target.files?.[0]; if(!f)return; try {setAvatar(await uploadMedia(f,me,'avatars'));} catch(e){toast.error(e instanceof Error?e.message:'Upload failed');} }}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">About me</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={190} rows={3} />
            </div>
            <Button type="submit" variant="flame">Save profile</Button>
          </form>

          <form onSubmit={async e => {e.preventDefault();try{await rename({data:{username}});await queryClient.invalidateQueries({queryKey:['profiles']});toast.success('Username changed');}catch(e){toast.error(e instanceof Error?e.message:'Could not change username');}}} className="space-y-3 border-b border-border pb-6"><Label htmlFor="handle">Username</Label><Input id="handle" value={username} onChange={e=>setUsername(e.target.value)} maxLength={24}/><Button variant="secondary">Update username</Button></form>
          <form className="space-y-4 border-b border-border pb-6" onSubmit={async e => {e.preventDefault();setBusy(true);const {error}=await supabase.from('profiles').update({theme,language,region,background_url:background}).eq('id',me);setBusy(false);if(error)toast.error('Could not save preferences');else{await queryClient.invalidateQueries({queryKey:['profiles']});toast.success('Preferences saved');}}}>
            <h3 className="font-semibold">Appearance & preferences</h3>
            <div className="flex flex-wrap gap-2">{THEMES.map(t=><Button key={t} type="button" variant={theme===t?'default':'outline'} aria-pressed={theme===t} onClick={()=>setTheme(t)}><span className="theme-dot h-3 w-3 rounded-full" data-choice={t}/><span className="capitalize">{t}</span></Button>)}</div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="language">Language</Label><select id="language" value={language} onChange={e=>setLanguage(e.target.value)} className="w-full rounded-md border border-border bg-card p-2">{LANGUAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div><div className="space-y-2"><Label htmlFor="region">Region</Label><select id="region" value={region} onChange={e=>setRegion(e.target.value)} className="w-full rounded-md border border-border bg-card p-2">{REGIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></div>
            <Label htmlFor="background">Background image</Label><Input id="background" type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setBusy(true);try{setBackground(await uploadMedia(f,me,'backgrounds'));}catch(e){toast.error(e instanceof Error?e.message:'Upload failed');}finally{setBusy(false);}}}/>{background&&<Button type="button" variant="ghost" onClick={()=>setBackground(null)}>Remove background</Button>}<Button disabled={busy}>Save preferences</Button>
          </form>
          <section className="space-y-3 border-b border-border pb-6"><h3 className="font-semibold">Points & rewards</h3><p className="text-2xl font-bold">{profile?.points ?? 0} points</p><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={async()=>{setBusy(true);const {error}=await supabase.rpc('claim_daily_points');setBusy(false);if(error)toast.error(error.message);else{queryClient.invalidateQueries({queryKey:['profiles']});toast.success('50 points claimed');}}}>Claim daily 50 points</Button><Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);const {error}=await supabase.rpc('redeem_vip');setBusy(false);if(error)toast.error(error.message);else{queryClient.invalidateQueries({queryKey:['profiles']});queryClient.invalidateQueries({queryKey:['my-roles']});toast.success('VIP unlocked');}}}>Redeem VIP · {VIP_COST}</Button></div></section>
          <Notifications />
          <form onSubmit={changePassword} className="space-y-4 border-t border-border pt-6">
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
