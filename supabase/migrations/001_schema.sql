-- Gram Yojana core schema. Run in the Supabase SQL editor (or `supabase db push`).
create extension if not exists postgis;
create extension if not exists pgcrypto;

create table if not exists villages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gram_panchayat text,
  district text,
  state text,
  centroid geometry(Point, 4326),
  boundary geometry(Polygon, 4326)
);

create table if not exists buildings (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references villages(id) on delete cascade,
  footprint geometry(Polygon, 4326) not null,
  height_m numeric(5,2) default 3.2,
  roof_type text check (roof_type in ('RCC','Tiled','Tin','Thatch')) default 'RCC',
  floors int default 1
);
create index if not exists buildings_fp_gix on buildings using gist (footprint);

create table if not exists roads (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references villages(id) on delete cascade,
  geometry geometry(LineString, 4326) not null,
  road_type text check (road_type in ('BT','CC','WBM','Gravel')) default 'Gravel',
  width_m numeric(4,2) default 3.5,
  is_existing boolean default true
);
create index if not exists roads_geom_gix on roads using gist (geometry);

create table if not exists players (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text check (role in ('villager','panchayat','youth')) default 'villager',
  points int default 0,
  rank text default 'Panch'
);

create table if not exists resource_envelopes (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references villages(id) on delete cascade,
  scheme_name text not null,
  eleventh_schedule_subject int[] default '{}',
  total_amount numeric(14,2) not null,
  spent_amount numeric(14,2) not null default 0
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references villages(id) on delete cascade,
  player_id uuid references players(id) on delete set null,
  type text not null check (type in ('road','drain','water','toilet','streetlight')),
  geometry geometry(Geometry, 4326),
  params jsonb not null default '{}',
  estimated_cost numeric(14,2) not null default 0,
  scheme_id uuid references resource_envelopes(id),
  status text not null default 'planned' check (status in ('planned','voted','committed','rejected'))
);
create index if not exists activities_geom_gix on activities using gist (geometry);

create table if not exists rate_card (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null,
  variant text not null,
  unit text not null,
  rate_per_unit numeric(12,2) not null,
  unique (activity_type, variant)
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references villages(id) on delete cascade,
  player_id uuid references players(id) on delete set null,
  title text not null,
  total_cost numeric(14,2) default 0,
  created_at timestamptz default now(),
  shared_slug text unique
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  badge text not null,
  earned_at timestamptz default now(),
  unique (player_id, badge)
);

create or replace view leaderboard as
  select p.id as player_id, p.display_name, p.points, p.rank,
         (select count(*) from achievements a where a.player_id = p.id) as badges
  from players p order by p.points desc;

-- Duplicate-road check usable straight from SQL / an RPC (the Python service does the same in metres)
create or replace function overlapping_roads(vid uuid, candidate geometry, tolerance_m numeric default 3)
returns table (road_id uuid, overlap_ratio numeric) language sql stable as $$
  select r.id,
         round((st_length(st_intersection(candidate::geography::geometry, st_buffer(r.geometry::geography, tolerance_m)::geometry)::geography)
               / nullif(st_length(candidate::geography), 0))::numeric, 3)
  from roads r
  where r.village_id = vid and st_dwithin(r.geometry::geography, candidate::geography, tolerance_m)
$$;

-- ---------------------------------------------------------------- row level security
alter table villages enable row level security;
alter table buildings enable row level security;
alter table roads enable row level security;
alter table resource_envelopes enable row level security;
alter table rate_card enable row level security;
alter table activities enable row level security;
alter table plans enable row level security;
alter table players enable row level security;
alter table achievements enable row level security;

-- reference data: anyone can read
create policy "read villages" on villages for select using (true);
create policy "read buildings" on buildings for select using (true);
create policy "read roads" on roads for select using (true);
create policy "read envelopes" on resource_envelopes for select using (true);
create policy "read rate card" on rate_card for select using (true);
create policy "read players" on players for select using (true);
create policy "read achievements" on achievements for select using (true);

-- player data: you can only touch your own
create policy "own profile" on players for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own activities" on activities for all using (auth.uid() = player_id) with check (auth.uid() = player_id);
create policy "own plans" on plans for all using (auth.uid() = player_id) with check (auth.uid() = player_id);
create policy "shared plans readable" on plans for select using (shared_slug is not null);
