import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {useNavigate} from '@tanstack/react-router';
import {useQueryClient} from '@tanstack/react-query';
import {Users} from 'lucide-react';
import {toast} from 'sonner';
import {createGroup} from '@/lib/groups.functions';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {useApp} from './app-context';
export function GroupDialog(){const {me,profiles}=useApp();const [open,setOpen]=useState(false);const [name,setName]=useState('');const [members,setMembers]=useState<string[]>([]);const [busy,setBusy]=useState(false);const create=useServerFn(createGroup);const nav=useNavigate();const qc=useQueryClient();return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" className="mx-2 mt-2 justify-start"><Users/>New group chat</Button></DialogTrigger><DialogContent><DialogTitle>Create group chat</DialogTitle><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);try{const g=await create({data:{name,members}});qc.invalidateQueries({queryKey:['groups']});setOpen(false);await nav({to:'/app/groups/$groupId',params:{groupId:g.id}});}catch(e){toast.error(e instanceof Error?e.message:'Could not create group');}finally{setBusy(false);}}}><Input aria-label="Group name" placeholder="Group name" value={name} onChange={e=>setName(e.target.value)} required maxLength={80}/><div className="max-h-64 space-y-3 overflow-y-auto">{[...profiles.values()].filter(p=>p.id!==me).map(p=><label key={p.id} className="flex items-center gap-3"><Checkbox checked={members.includes(p.id)} onCheckedChange={v=>setMembers(a=>v?[...a,p.id]:a.filter(id=>id!==p.id))}/>{p.display_name} <span className="text-sm text-muted-foreground">@{p.username}</span></label>)}</div><Button disabled={busy||!name.trim()}>Create group</Button></form></DialogContent></Dialog>;}