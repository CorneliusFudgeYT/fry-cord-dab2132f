-- Helper functions (must exist before the policies that use them)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','admin','developer'));
$$;

-- Rank applications (YouTuber / TikToker)
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('youtuber','tiktoker')),
  link text not null,
  followers integer not null default 0,
  likes integer not null default 0,
  views integer not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  reviewed_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "apply own" on public.applications for insert to authenticated with check (auth.uid() = user_id);
create policy "read own or staff" on public.applications for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "staff update applications" on public.applications for update to authenticated using (public.is_staff(auth.uid()));

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id);

-- Suspensions (temporary, up to 1 month; staff managed)
create table if not exists public.suspensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  suspended_by uuid not null,
  until_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.suspensions to authenticated;
grant all on public.suspensions to service_role;
alter table public.suspensions enable row level security;
create policy "read suspensions" on public.suspensions for select to authenticated using (true);
create policy "staff insert suspensions" on public.suspensions for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff update suspensions" on public.suspensions for update to authenticated using (public.is_staff(auth.uid()));
create policy "staff delete suspensions" on public.suspensions for delete to authenticated using (public.is_staff(auth.uid()));

-- Suspension check helper (after the table exists)
create or replace function public.is_suspended(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.suspensions where user_id = _user_id and until_at > now());
$$;

-- Reels and music uploads
create table if not exists public.media_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('reel','music')),
  media_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.media_posts to authenticated;
grant all on public.media_posts to service_role;
alter table public.media_posts enable row level security;
create policy "read media posts" on public.media_posts for select to authenticated using (true);
create policy "insert own media" on public.media_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own or staff media" on public.media_posts for delete to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));

-- Public posting (forum)
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.forum_posts to authenticated;
grant all on public.forum_posts to service_role;
alter table public.forum_posts enable row level security;
create policy "read forum" on public.forum_posts for select to authenticated using (true);
create policy "insert forum" on public.forum_posts for insert to authenticated with check (auth.uid() = author_id);
create policy "delete forum" on public.forum_posts for delete to authenticated using (auth.uid() = author_id or public.is_staff(auth.uid()));

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.forum_comments to authenticated;
grant all on public.forum_comments to service_role;
alter table public.forum_comments enable row level security;
create policy "read comments" on public.forum_comments for select to authenticated using (true);
create policy "insert comments" on public.forum_comments for insert to authenticated with check (auth.uid() = author_id);
create policy "delete comments" on public.forum_comments for delete to authenticated using (auth.uid() = author_id or public.is_staff(auth.uid()));

-- Livestreams
create table if not exists public.livestreams (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null,
  title text not null,
  is_live boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
grant select, insert, update on public.livestreams to authenticated;
grant all on public.livestreams to service_role;
alter table public.livestreams enable row level security;
create policy "read streams" on public.livestreams for select to authenticated using (true);
create policy "host insert streams" on public.livestreams for insert to authenticated with check (auth.uid() = host_id);
create policy "host update streams" on public.livestreams for update to authenticated using (auth.uid() = host_id or public.is_staff(auth.uid()));

-- Staff and own-message deletion on existing message tables
create policy "delete own or staff messages" on public.messages for delete to authenticated using (auth.uid() = author_id or public.is_staff(auth.uid()));
create policy "delete own or staff dm messages" on public.dm_messages for delete to authenticated using (auth.uid() = author_id or public.is_staff(auth.uid()));

-- Storage: read access for public buckets, upload for signed-in users
create policy "frycord media read" on storage.objects for select using (bucket_id in ('chat-media','backgrounds','avatars'));
create policy "frycord media insert" on storage.objects for insert to authenticated with check (bucket_id in ('chat-media','backgrounds','avatars'));
create policy "frycord media update" on storage.objects for update to authenticated using (bucket_id in ('chat-media','backgrounds','avatars'));