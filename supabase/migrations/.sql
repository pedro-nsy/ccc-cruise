-- Step 3: public_prices schema + seed (store in cents)
create table if not exists public.public_prices (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  occupancy text not null,
  price_cents integer not null,
  effective_from timestamptz not null default now(),
  effective_to   timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_prices_category_ck check (category in ('INTERIOR','OCEANVIEW','BALCONY')),
  constraint public_prices_occupancy_ck check (occupancy in ('DOUBLE','TRIPLE','QUADRUPLE'))
);

create or replace function public.public_prices_biu()
returns trigger language plpgsql as $ts__step3_public_prices.sql
begin new.updated_at = now(); return new; end $ts__step3_public_prices.sql;

drop trigger if exists trg_public_prices_biu on public.public_prices;
create trigger trg_public_prices_biu
before insert or update on public.public_prices
for each row execute function public.public_prices_biu();

create unique index if not exists ux_public_prices_key
  on public.public_prices(category, occupancy, effective_from);

create or replace view public.current_public_prices as
select *
from public.public_prices
where now() >= effective_from
  and (effective_to is null or now() < effective_to);

alter table public.public_prices enable row level security;

drop policy if exists "anon_select_none_public_prices" on public.public_prices;
create policy "anon_select_none_public_prices"
  on public.public_prices for all using (false);

insert into public.public_prices (category, occupancy, price_cents, effective_from, effective_to)
values
  ('INTERIOR','DOUBLE',     2880000, now(), null),
  ('INTERIOR','TRIPLE',     2740000, now(), null),
  ('INTERIOR','QUADRUPLE',  2680000, now(), null),
  ('OCEANVIEW','DOUBLE',    3400000, now(), null),
  ('OCEANVIEW','TRIPLE',    3160000, now(), null),
  ('OCEANVIEW','QUADRUPLE', 3040000, now(), null),
  ('BALCONY','DOUBLE',      3820000, now(), null),
  ('BALCONY','TRIPLE',      3540000, now(), null),
  ('BALCONY','QUADRUPLE',   3400000, now(), null)
on conflict do nothing;
