CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA app;
ALTER FUNCTION public.is_staff(uuid) SET SCHEMA app;
ALTER FUNCTION public.is_server_member(uuid, uuid) SET SCHEMA app;
ALTER FUNCTION public.can_manage_server(uuid, uuid) SET SCHEMA app;
ALTER FUNCTION public.channel_server(uuid) SET SCHEMA app;
ALTER FUNCTION public.in_dm_thread(uuid, uuid) SET SCHEMA app;

CREATE OR REPLACE FUNCTION app.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION app.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION app.is_server_member(_server_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
  SELECT EXISTS (SELECT 1 FROM public.server_members WHERE server_id = _server_id AND user_id = _user_id)
      OR app.is_staff(_user_id);
$$;

CREATE OR REPLACE FUNCTION app.can_manage_server(_server_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = _server_id AND user_id = _user_id AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.servers WHERE id = _server_id AND owner_id = _user_id
  ) OR app.is_staff(_user_id);
$$;

CREATE OR REPLACE FUNCTION app.channel_server(_channel_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
  SELECT server_id FROM public.channels WHERE id = _channel_id;
$$;

CREATE OR REPLACE FUNCTION app.in_dm_thread(_thread_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_threads
    WHERE id = _thread_id AND (user_a = _user_id OR user_b = _user_id)
  );
$$;

REVOKE ALL ON FUNCTION app.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.is_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.is_server_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.can_manage_server(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.channel_server(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.in_dm_thread(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.is_server_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.can_manage_server(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.channel_server(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.in_dm_thread(uuid, uuid) TO authenticated, service_role;