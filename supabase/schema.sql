-- Balegram — Supabase schema (lightweight JSONB mirror)
-- Run this in the Supabase SQL editor, then put the project URL + anon key
-- into Balegram → Settings → Cloud sync.
--
-- SECURITY NOTE: these policies are demo-grade (anon key = full access).
-- Before going public, replace them with per-user policies keyed on
-- auth.uid() and add a `owner_id` column populated from a verified
-- Bale initData hash on your bot server.

create table if not exists bg_profiles (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists bg_chats (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists bg_messages (
  id         text primary key,
  chat_id    text not null,
  ts         bigint not null,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists bg_messages_chat_ts on bg_messages (chat_id, ts);

alter table bg_profiles enable row level security;
alter table bg_chats    enable row level security;
alter table bg_messages enable row level security;

-- Demo policies: anyone holding the anon key can read/write.
drop policy if exists bg_profiles_anon on bg_profiles;
drop policy if exists bg_chats_anon    on bg_chats;
drop policy if exists bg_messages_anon on bg_messages;

create policy bg_profiles_anon on bg_profiles for all using (true) with check (true);
create policy bg_chats_anon    on bg_chats    for all using (true) with check (true);
create policy bg_messages_anon on bg_messages for all using (true) with check (true);

-- Realtime: the client subscribes to postgres_changes on chats + messages.
alter publication supabase_realtime add table bg_chats;
alter publication supabase_realtime add table bg_messages;