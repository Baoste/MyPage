create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.private_users(id) on delete cascade,
  entry_date date not null,
  timezone text not null default 'Asia/Shanghai' check (timezone = 'Asia/Shanghai'),
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'failed')),
  user_note text not null default '' check (char_length(user_note) <= 2000),
  generated_text text not null default '' check (char_length(generated_text) <= 4000),
  final_text text not null default '' check (char_length(final_text) <= 4000),
  source_manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(source_manifest) = 'object'),
  layout_json jsonb not null default '{}'::jsonb check (jsonb_typeof(layout_json) = 'object'),
  generation_meta jsonb not null default '{}'::jsonb check (jsonb_typeof(generation_meta) = 'object'),
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, entry_date)
);

create table if not exists public.calendar_assets (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references public.calendar_entries(id) on delete cascade,
  role text not null check (role in ('cover', 'sticker', 'preview', 'thumbnail')),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  width integer not null check (width > 0 and width <= 8192),
  height integer not null check (height > 0 and height <= 8192),
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists calendar_entries_owner_month_idx on public.calendar_entries (owner_user_id, entry_date);
create index if not exists calendar_assets_entry_idx on public.calendar_assets (calendar_entry_id, role, sort_order);
create unique index if not exists calendar_assets_single_cover_idx on public.calendar_assets (calendar_entry_id) where role = 'cover';
create unique index if not exists calendar_assets_single_preview_idx on public.calendar_assets (calendar_entry_id) where role = 'preview';
create unique index if not exists calendar_assets_single_thumbnail_idx on public.calendar_assets (calendar_entry_id) where role = 'thumbnail';

create or replace function public.touch_calendar_entry_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calendar_entries_touch_updated_at on public.calendar_entries;
create trigger calendar_entries_touch_updated_at before update on public.calendar_entries
for each row execute function public.touch_calendar_entry_updated_at();

alter table public.calendar_entries enable row level security;
alter table public.calendar_assets enable row level security;
revoke all on public.calendar_entries from anon, authenticated;
revoke all on public.calendar_assets from anon, authenticated;
grant all on public.calendar_entries to service_role;
grant all on public.calendar_assets to service_role;
