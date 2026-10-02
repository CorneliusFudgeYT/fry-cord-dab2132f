DROP POLICY IF EXISTS "server_members_join_self" ON public.server_members;
CREATE POLICY "server_members_insert_manage" ON public.server_members FOR INSERT TO authenticated
  WITH CHECK (app.can_manage_server(server_id, auth.uid()) AND role <> 'owner');