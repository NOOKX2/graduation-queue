-- Graduation Queue MVP
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  nickname text not null check (char_length(trim(nickname)) between 1 and 50),
  queue_number integer not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.event_state (
  id integer primary key check (id = 1),
  current_queue integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.event_state (id, current_queue)
values (1, 0)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.queue_entries enable row level security;
alter table public.event_state enable row level security;

-- Profiles: signed-in users can read only their own profile.
drop policy if exists "profile self read" on public.profiles;
create policy "profile self read"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Queue: anyone can read a row if they know its public token.
-- Admins can read all queue entries.
drop policy if exists "queue public token read" on public.queue_entries;
create policy "queue public token read"
on public.queue_entries for select
to anon, authenticated
using (
  public_token::text = current_setting('request.jwt.claims', true)::jsonb->>'queue_token'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Event state is readable to everyone so the user dashboard can show the current queue.
drop policy if exists "event state read" on public.event_state;
create policy "event state read"
on public.event_state for select
to anon, authenticated
using (true);

-- No direct client insert/update/delete policies on queue or event_state.
-- All writes happen through controlled functions below.

create or replace function public.register_queue(p_nickname text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
  new_token uuid;
begin
  if trim(p_nickname) = '' or char_length(trim(p_nickname)) > 50 then
    raise exception 'ชื่อเล่นไม่ถูกต้อง';
  end if;

  select coalesce(max(queue_number), 0) + 1
  into next_number
  from public.queue_entries;

  insert into public.queue_entries (nickname, queue_number)
  values (trim(p_nickname), next_number)
  returning public_token into new_token;

  return new_token;
end;
$$;

grant execute on function public.register_queue(text) to anon, authenticated;

create or replace function public.admin_set_current_queue(p_queue_number integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role <> 'admin' then
    raise exception 'ไม่มีสิทธิ์ผู้ดูแล';
  end if;

  if p_queue_number < 0 then
    raise exception 'หมายเลขคิวไม่ถูกต้อง';
  end if;

  update public.event_state
  set current_queue = p_queue_number, updated_at = now()
  where id = 1;

  return p_queue_number;
end;
$$;

grant execute on function public.admin_set_current_queue(integer) to authenticated;

-- Automatically create a profile when an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Realtime
alter publication supabase_realtime add table public.event_state;
alter publication supabase_realtime add table public.queue_entries;
