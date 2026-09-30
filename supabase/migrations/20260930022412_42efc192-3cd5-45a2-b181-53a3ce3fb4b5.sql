-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('owner', 'admin');
CREATE TYPE public.server_role AS ENUM ('owner', 'admin', 'moderator', 'member');
CREATE TYPE public.channel_kind AS ENUM ('text', 'voice');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  bio text,
  status text NOT NULL DEFAULT 'online',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ PLATFORM ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

-- ============ SERVERS ============
CREATE TABLE public.servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_url text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(5), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servers TO authenticated;
GRANT ALL ON public.servers TO service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.server_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.server_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);
CREATE INDEX server_members_user_idx ON public.server_members (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_members TO authenticated;
GRANT ALL ON public.server_members TO service_role;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_server_member(_server_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.server_members WHERE server_id = _server_id AND user_id = _user_id)
      OR public.is_staff(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_server(_server_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = _server_id AND user_id = _user_id AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.servers WHERE id = _server_id AND owner_id = _user_id
  ) OR public.is_staff(_user_id);
$$;

-- ============ CHANNELS ============
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  topic text,
  kind public.channel_kind NOT NULL DEFAULT 'text',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX channels_server_idx ON public.channels (server_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.channel_server(_channel_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT server_id FROM public.channels WHERE id = _channel_id;
$$;

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_channel_idx ON public.messages (channel_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============ DIRECT MESSAGES ============
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT ON public.dm_threads TO authenticated;
GRANT ALL ON public.dm_threads TO service_role;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dm_messages_thread_idx ON public.dm_messages (thread_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.in_dm_thread(_thread_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_threads
    WHERE id = _thread_id AND (user_a = _user_id OR user_b = _user_id)
  );
$$;

-- ============ POLICIES ============
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "user_roles_select_staff_or_self" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "servers_select_members" ON public.servers FOR SELECT TO authenticated
  USING (public.is_server_member(id, auth.uid()));
CREATE POLICY "servers_insert_own" ON public.servers FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "servers_update_manage" ON public.servers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "servers_delete_manage" ON public.servers FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "server_members_select" ON public.server_members FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "server_members_join_self" ON public.server_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.can_manage_server(server_id, auth.uid()));
CREATE POLICY "server_members_update_manage" ON public.server_members FOR UPDATE TO authenticated
  USING (public.can_manage_server(server_id, auth.uid()))
  WITH CHECK (public.can_manage_server(server_id, auth.uid()));
CREATE POLICY "server_members_delete" ON public.server_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_server(server_id, auth.uid()));

CREATE POLICY "channels_select_members" ON public.channels FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "channels_write_manage" ON public.channels FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_server(server_id, auth.uid()));
CREATE POLICY "channels_update_manage" ON public.channels FOR UPDATE TO authenticated
  USING (public.can_manage_server(server_id, auth.uid()))
  WITH CHECK (public.can_manage_server(server_id, auth.uid()));
CREATE POLICY "channels_delete_manage" ON public.channels FOR DELETE TO authenticated
  USING (public.can_manage_server(server_id, auth.uid()));

CREATE POLICY "messages_select_members" ON public.messages FOR SELECT TO authenticated
  USING (public.is_server_member(public.channel_server(channel_id), auth.uid()));
CREATE POLICY "messages_insert_self" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_server_member(public.channel_server(channel_id), auth.uid()));
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "messages_delete_own_or_mod" ON public.messages FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.can_manage_server(public.channel_server(channel_id), auth.uid()));

CREATE POLICY "dm_threads_select_participants" ON public.dm_threads FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());
CREATE POLICY "dm_threads_insert_participant" ON public.dm_threads FOR INSERT TO authenticated
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "dm_messages_select_participants" ON public.dm_messages FOR SELECT TO authenticated
  USING (public.in_dm_thread(thread_id, auth.uid()));
CREATE POLICY "dm_messages_insert_self" ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.in_dm_thread(thread_id, auth.uid()));
CREATE POLICY "dm_messages_delete_own" ON public.dm_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ REALTIME ============
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;
ALTER TABLE public.channels REPLICA IDENTITY FULL;
ALTER TABLE public.server_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;