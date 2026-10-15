import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createServer, joinServerByInvite } from "@/lib/servers.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ServerDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createServer);
  const join = useServerFn(joinServerByInvite);

  async function run(fn: () => Promise<{ serverId: string }>) {
    setBusy(true);
    try {
      const { serverId } = await fn();
      await queryClient.invalidateQueries({ queryKey: ["my-servers"] });
      setOpen(false);
      setName("");
      setCode("");
      navigate({ to: "/app/servers/$serverId", params: { serverId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a server</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="join">Join with invite</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <form
              className="space-y-4 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim().length < 2) { toast.error("Give it at least 2 characters"); return; }
                run(() => create({ data: { name: name.trim() } }));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="server-name">Server name</Label>
                <Input
                  id="server-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The Kitchen"
                  maxLength={40}
                />
              </div>
              <Button type="submit" variant="flame" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Create server
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="join">
            <form
              className="space-y-4 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!code.trim()) { toast.error("Paste an invite code"); return; }
                run(() => join({ data: { code: code.trim() } }));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="invite">Invite code</Label>
                <Input
                  id="invite"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="a1b2c3d4e5"
                  maxLength={64}
                />
              </div>
              <Button type="submit" variant="flame" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Join server
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
