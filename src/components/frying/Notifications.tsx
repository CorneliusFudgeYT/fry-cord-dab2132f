import { Bell, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useApp } from './app-context';
export function Notifications() {
  const { me } = useApp();
  const qc = useQueryClient();
  const { data: items = [], error } = useQuery({ queryKey: ['notifications', me], refetchInterval: 10000, queryFn: async () => {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', me).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  }});
  return <section className="space-y-3 border-t border-border pt-6"><h3 className="flex items-center gap-2 font-semibold"><Bell className="h-4 w-4"/>Notifications</h3>{error && <p className="text-sm text-destructive">Could not load notifications.</p>}{!items.length && <p className="text-sm text-muted-foreground">No notifications yet.</p>}{items.map(n => <div key={n.id} className="flex items-start gap-3 border-b border-border py-3"><div className="min-w-0 flex-1"><p className={n.read ? 'text-muted-foreground' : 'font-semibold'}>{n.title}</p>{n.body && <p className="mt-1 break-words text-sm text-muted-foreground">{n.body}</p>}<p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p></div>{!n.read && <Button aria-label="Mark notification read" size="icon" variant="ghost" onClick={async () => { const {error} = await supabase.from('notifications').update({read:true}).eq('id',n.id); if (!error) qc.invalidateQueries({queryKey:['notifications']}); }}><Check/></Button>}</div>)}</section>;
}