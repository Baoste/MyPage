-- Personal site: database, storage buckets, indexes, constraints, and RLS.
-- This migration is designed for a standard Supabase project.
-- The projects table below is retained for installations that already applied
-- this historical migration. Homepage Works now uses src/data/projects.ts and
-- does not query or write this table.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text,
  cover_path text,
  tags text[] not null default '{}'::text[],
  project_date date,
  project_url text,
  github_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_cover_path_safe check (
    cover_path is null or (cover_path !~ '^/' and cover_path !~ '(^|/)\.\.(/|$)')
  )
);

create table if not exists public.photo_entries (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  title text,
  description text,
  photo_date date not null,
  location text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photo_entries_storage_path_safe check (
    storage_path !~ '^/' and storage_path !~ '(^|/)\.\.(/|$)'
  )
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  storage_path text not null,
  description text,
  restaurant text,
  location text,
  rating smallint,
  food_date date not null,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_entries_rating_range check (rating is null or rating between 1 and 5),
  constraint food_entries_storage_path_safe check (
    storage_path !~ '^/' and storage_path !~ '(^|/)\.\.(/|$)'
  )
);

create index if not exists projects_public_order_idx
  on public.projects (sort_order asc, project_date desc)
  where is_published = true;
create index if not exists photo_entries_date_idx
  on public.photo_entries (photo_date desc);
create index if not exists food_entries_date_idx
  on public.food_entries (food_date desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists photo_entries_set_updated_at on public.photo_entries;
create trigger photo_entries_set_updated_at
before update on public.photo_entries
for each row execute function public.set_updated_at();

drop trigger if exists food_entries_set_updated_at on public.food_entries;
create trigger food_entries_set_updated_at
before update on public.food_entries
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.photo_entries enable row level security;
alter table public.food_entries enable row level security;

drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects"
on public.projects
for select
to anon, authenticated
using (is_published = true);

-- There are intentionally no anon/authenticated policies for photo_entries or
-- food_entries. The server-only service-role client is the sole data path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'public-assets',
    'public-assets',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'private-diary',
    'private-diary',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read public assets" on storage.objects;
create policy "Public can read public assets"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'public-assets');

-- No public policy is created for private-diary. Service-role requests create
-- short-lived signed URLs only after the Next.js private session is verified.
