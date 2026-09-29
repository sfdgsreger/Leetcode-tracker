-- ============================================================
-- LeetCode Streak Tracker — Final Fixed Supabase Schema
-- ============================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- 2a. users
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text not null default '',
  created_at    timestamptz not null default now()
);

-- 2b. checkins
create table if not exists public.checkins (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  checkin_date  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- FIX: Make the date conversion immutable by explicitly specifying UTC timezone
create unique index if not exists checkins_user_date_unique 
  on public.checkins (user_id, ((checkin_date AT TIME ZONE 'UTC')::date));

-- 2c. questions
create table if not exists public.questions (
  id              uuid primary key default uuid_generate_v4(),
  checkin_id      uuid not null references public.checkins(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  question_number integer not null,
  submitted_at    timestamptz not null default now()
);

-- 3. INDEXES
create index if not exists idx_checkins_user_id      on public.checkins(user_id);
create index if not exists idx_checkins_date         on public.checkins(checkin_date);
create index if not exists idx_questions_checkin_id  on public.questions(checkin_id);
create index if not exists idx_questions_user_id     on public.questions(user_id);

-- 4. TRIGGER — auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. ROW LEVEL SECURITY
alter table public.users     enable row level security;
alter table public.checkins  enable row level security;
alter table public.questions enable row level security;

-- Drop existing policies if re-running
drop policy if exists "users: authenticated can read all" on public.users;
drop policy if exists "users: insert own row" on public.users;
drop policy if exists "users: update own row" on public.users;

drop policy if exists "checkins: authenticated can read all" on public.checkins;
drop policy if exists "checkins: insert own" on public.checkins;
drop policy if exists "checkins: update own" on public.checkins;

drop policy if exists "questions: authenticated can read all" on public.questions;
drop policy if exists "questions: insert own" on public.questions;
drop policy if exists "questions: update own" on public.questions;

-- users policies
create policy "users: authenticated can read all"
  on public.users for select
  to authenticated
  using (true);

create policy "users: insert own row"
  on public.users for insert
  to authenticated
  with check (id = auth.uid());

create policy "users: update own row"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- checkins policies
create policy "checkins: authenticated can read all"
  on public.checkins for select
  to authenticated
  using (true);

create policy "checkins: insert own"
  on public.checkins for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "checkins: update own"
  on public.checkins for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- questions policies
create policy "questions: authenticated can read all"
  on public.questions for select
  to authenticated
  using (true);

create policy "questions: insert own"
  on public.questions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "questions: update own"
  on public.questions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());