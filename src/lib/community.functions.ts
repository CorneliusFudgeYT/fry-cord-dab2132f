import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
export const manageRank = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({userId:z.string().uuid(),role:z.enum(['admin','developer']),enabled:z.boolean()}).parse(input)).handler(async ({data,context}) => {
  const {data: owner} = await context.supabase.rpc('has_role', {_user_id:context.userId,_role:'owner'});
  if (!owner) throw new Error('Only the owner can assign staff');
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const {error} = data.enabled ? await supabaseAdmin.from('user_roles').upsert({user_id:data.userId,role:data.role},{onConflict:'user_id,role'}) : await supabaseAdmin.from('user_roles').delete().eq('user_id',data.userId).eq('role',data.role);
  if(error) throw new Error('Could not update this rank');
  await supabaseAdmin.from('notifications').insert({user_id:data.userId,kind:'rank',title:data.enabled ? `${data.role} rank assigned` : `${data.role} rank removed`});
  return {ok:true};
});
export const reviewApplication = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({id:z.string().uuid(),approve:z.boolean()}).parse(input)).handler(async ({data,context}) => {
  const {data:staff} = await context.supabase.rpc('is_staff',{_user_id:context.userId});
  if(!staff) throw new Error('Staff only');
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const {data:application,error} = await supabaseAdmin.from('applications').update({status:data.approve?'approved':'denied',reviewed_by:context.userId}).eq('id',data.id).eq('status','pending').select('*').maybeSingle();
  if(error || !application) throw new Error('Application is no longer pending');
  if(data.approve) { const {error: rankError} = await supabaseAdmin.from('user_roles').upsert({user_id:application.user_id,role:application.kind as 'youtuber'|'tiktoker'},{onConflict:'user_id,role'}); if(rankError) throw new Error('Could not assign the rank'); }
  await supabaseAdmin.from('notifications').insert({user_id:application.user_id,kind:'application',title:`${application.kind} application ${data.approve?'approved':'denied'}`});
  return {ok:true};
});
export const suspendAccount = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({userId:z.string().uuid(),days:z.number().int().min(1).max(30),reason:z.string().trim().min(1).max(300)}).parse(input)).handler(async ({data,context}) => {
  const {data:staff} = await context.supabase.rpc('is_staff',{_user_id:context.userId});
  if(!staff) throw new Error('Staff only');
  const {data:owner} = await context.supabase.rpc('has_role',{_user_id:data.userId,_role:'owner'});
  if(owner || data.userId===context.userId) throw new Error('Cannot suspend this account');
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const {error} = await supabaseAdmin.from('suspensions').insert({user_id:data.userId,suspended_by:context.userId,until_at:new Date(Date.now()+data.days*86400000).toISOString(),reason:data.reason});
  if(error) throw new Error('Could not suspend this account');
  await supabaseAdmin.from('notifications').insert({user_id:data.userId,kind:'suspension',title:`Suspended for ${data.days} days`,body:data.reason});
  return {ok:true};
});
export const changeUsername = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input: unknown)=>z.object({username:z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9._-]+$/)}).parse(input)).handler(async ({data,context})=>{
  const {data:profile} = await context.supabase.from('profiles').select('username').eq('id',context.userId).single();
  if(profile?.username==='son') throw new Error('The owner username stays Son');
  const username=data.username.toLowerCase();
  if(username==='son') throw new Error('That username is reserved');
  const {data:existing} = await context.supabase.from('profiles').select('id').ilike('username',username).maybeSingle();
  if(existing && existing.id!==context.userId) throw new Error('That username is taken');
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const {data:user} = await context.supabase.auth.getUser();
  if(user.user?.email?.endsWith('@users.fryingpan.app')) {
    const {error} = await supabaseAdmin.auth.admin.updateUserById(context.userId,{email:`${username}@users.fryingpan.app`,email_confirm:true});
    if(error) throw new Error('Could not change your username');
  }
  const {error} = await supabaseAdmin.from('profiles').update({username}).eq('id',context.userId);
  if(error) throw new Error('Could not change your username');
  return {ok:true};
});
