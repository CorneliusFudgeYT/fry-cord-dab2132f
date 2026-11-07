import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const createGroup = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({name:z.string().trim().min(1).max(80),members:z.array(z.string().uuid()).max(50)}).parse(input)).handler(async({data,context})=>{
  const {data:suspended}=await context.supabase.rpc('is_suspended',{_user_id:context.userId});
  if(suspended)throw new Error('Your account is temporarily suspended');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {data:group,error}=await supabaseAdmin.from('group_chats').insert({name:data.name,owner_id:context.userId}).select('id').single();
  if(error||!group)throw new Error('Could not create group');
  const members=[...new Set([context.userId,...data.members])];
  const {error:memberError}=await supabaseAdmin.from('group_members').insert(members.map(user_id=>({group_id:group.id,user_id})));
  if(memberError){await supabaseAdmin.from('group_chats').delete().eq('id',group.id);throw new Error('Could not add members');}
  return group;
});