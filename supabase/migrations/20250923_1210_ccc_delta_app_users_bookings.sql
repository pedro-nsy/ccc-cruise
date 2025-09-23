-- Delta: add app_users and align bookings with code in /src/app/api/booking/start/route.ts

create extension if not exists pgcrypto;

-- app_users: upsert by email in your code
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- bookings: ensure reference + lead_user_id exist
alter table if exists public.bookings
  add column if not exists reference text;

-- unique reference (use a safe name; create only if not exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_reference_key'
  ) then
    alter table public.bookings add constraint bookings_reference_key unique (reference);
  end if;
end$$;

alter table if exists public.bookings
  add column if not exists lead_user_id uuid;

-- fk to app_users (create only if not exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_lead_user_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_lead_user_id_fkey
      foreign key (lead_user_id) references public.app_users(id) on delete set null;
  end if;
end$$;

-- RLS
alter table public.app_users enable row level security;
-- (bookings RLS likely already enabled from earlier migration)

