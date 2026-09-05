-- Evolve Photos into group metadata plus ordered images.
-- Existing records become one-image groups without moving their files.

alter table public.photo_entries
  drop constraint if exists photo_entries_local_path;

alter table public.photo_entries
  add constraint photo_entries_group_path
    check (
      legacy_record
      or storage_path ~ (
        '^photos/' || id::text || '/[0-9a-f-]+\.(jpg|jpeg|png|webp)$'
      )
    );

create table public.photo_images (
  id uuid primary key default gen_random_uuid(),
  photo_entry_id uuid not null references public.photo_entries(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0,
  width integer not null,
  height integer not null,
  mime_type text not null,
  byte_size bigint not null,
  captured_at timestamptz,
  legacy_path boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photo_images_sort_order_nonnegative check (sort_order >= 0),
  constraint photo_images_dimensions_positive check (width > 0 and height > 0),
  constraint photo_images_byte_size_positive check (byte_size > 0 and byte_size <= 10485760),
  constraint photo_images_mime_type_allowed check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint photo_images_storage_path_safe check (
    storage_path !~ '^/' and storage_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint photo_images_group_path check (
    legacy_path
    or storage_path ~ (
      '^photos/' || photo_entry_id::text || '/' || id::text || '\.(jpg|jpeg|png|webp)$'
    )
  ),
  constraint photo_images_group_sort_unique unique (photo_entry_id, sort_order)
);

insert into public.photo_images (
  id, photo_entry_id, storage_path, sort_order, width, height, mime_type,
  byte_size, captured_at, legacy_path, created_at, updated_at
)
select
  id, id, storage_path, 0, width, height, mime_type, byte_size,
  captured_at, legacy_record, created_at, updated_at
from public.photo_entries
on conflict (storage_path) do nothing;

create index photo_images_group_order_idx
  on public.photo_images (photo_entry_id, sort_order asc);

drop trigger if exists photo_images_set_updated_at on public.photo_images;
create trigger photo_images_set_updated_at
before update on public.photo_images
for each row execute function public.set_updated_at();

alter table public.photo_images enable row level security;

-- No anon/authenticated policies. The server-only service-role client remains
-- the sole database path after the private session is verified.
