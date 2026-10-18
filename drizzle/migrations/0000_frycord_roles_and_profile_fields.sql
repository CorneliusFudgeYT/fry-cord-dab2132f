-- Extend the role system with FryCord ranks
alter type public.app_role add value if not exists 'developer';
alter type public.app_role add value if not exists 'vip';
alter type public.app_role add value if not exists 'youtuber';
alter type public.app_role add value if not exists 'tiktoker';
alter type public.app_role add value if not exists 'streamer';

-- Extend channel kinds for the World Chat sections
alter type public.channel_kind add value if not exists 'forum';
alter type public.channel_kind add value if not exists 'reels';
alter type public.channel_kind add value if not exists 'music';
alter type public.channel_kind add value if not exists 'livestream';
alter type public.channel_kind add value if not exists 'applications';
alter type public.channel_kind add value if not exists 'staff';

-- Profile: points, preferences, theme, background
alter table public.profiles
  add column if not exists points integer not null default 0,
  add column if not exists language text not null default 'en',
  add column if not exists theme text not null default 'dark',
  add column if not exists background_url text,
  add column if not exists region text not null default 'other',
  add column if not exists last_points_claim date;

-- Media attachments on messages
alter table public.messages add column if not exists media_url text;
alter table public.dm_messages add column if not exists media_url text;