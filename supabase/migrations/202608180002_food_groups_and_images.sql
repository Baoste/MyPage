-- Evolve food_entries from one-row-per-image into group metadata plus food_images.
-- Existing rows are preserved as legacy groups and their storage paths are copied
-- into food_images without moving the underlying private Storage objects.

alter table public.food_entries
  add column category text,
  add column review text,
  add column occurred_at timestamptz,
  add column timezone text,
  add column location_country_code text,
  add column location_country_name text,
  add column location_region_code text,
  add column location_region_name text,
  add column location_city_code text,
  add column location_city_name text,
  add column status text not null default 'ready',
  add column upload_request_id uuid,
  add column legacy_record boolean not null default false;

update public.food_entries
set
  category = coalesce(nullif(btrim(name), ''), '未分类'),
  review = description,
  occurred_at = (food_date + time '12:00') at time zone 'Asia/Shanghai',
  timezone = 'Asia/Shanghai',
  location_country_code = 'ZZ',
  location_country_name = '未指定',
  location_city_name = coalesce(nullif(btrim(location), ''), '未指定'),
  status = 'ready',
  legacy_record = true
where category is null;

alter table public.food_entries
  alter column category set not null,
  alter column occurred_at set not null,
  alter column timezone set not null,
  alter column location_country_code set not null,
  alter column location_country_name set not null,
  alter column location_city_name set not null,
  add constraint food_entries_category_length
    check (char_length(category) between 1 and 40),
  add constraint food_entries_review_length
    check (review is null or char_length(review) <= 2000),
  add constraint food_entries_status_value
    check (status in ('draft', 'ready')),
  add constraint food_entries_timezone_china
    check (timezone = 'Asia/Shanghai'),
  add constraint food_entries_location_lengths
    check (
      char_length(location_country_code) between 2 and 32
      and char_length(location_country_name) between 1 and 100
      and (location_region_code is null or char_length(location_region_code) <= 80)
      and (location_region_name is null or char_length(location_region_name) <= 100)
      and (location_city_code is null or char_length(location_city_code) <= 80)
      and char_length(location_city_name) between 1 and 100
    ),
  add constraint food_entries_new_rating_required
    check (legacy_record or rating is not null),
  add constraint food_entries_upload_request_unique unique (upload_request_id);

create table public.food_images (
  id uuid primary key default gen_random_uuid(),
  food_entry_id uuid not null references public.food_entries(id) on delete cascade,
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
  constraint food_images_sort_order_nonnegative check (sort_order >= 0),
  constraint food_images_dimensions_positive check (width > 0 and height > 0),
  constraint food_images_byte_size_positive check (byte_size > 0 and byte_size <= 10485760),
  constraint food_images_mime_type_allowed
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint food_images_storage_path_safe check (
    storage_path !~ '^/' and storage_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint food_images_group_path check (
    legacy_path
    or storage_path ~ (
      '^food/' || food_entry_id::text || '/' || id::text || '\.(jpg|jpeg|png|webp)$'
    )
  ),
  constraint food_images_group_sort_unique unique (food_entry_id, sort_order)
);

insert into public.food_images (
  id,
  food_entry_id,
  storage_path,
  sort_order,
  width,
  height,
  mime_type,
  byte_size,
  captured_at,
  legacy_path,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  id,
  storage_path,
  0,
  4,
  3,
  case
    when lower(storage_path) like '%.png' then 'image/png'
    when lower(storage_path) like '%.webp' then 'image/webp'
    else 'image/jpeg'
  end,
  1,
  (food_date + time '12:00') at time zone 'Asia/Shanghai',
  true,
  created_at,
  updated_at
from public.food_entries
where storage_path is not null
on conflict (storage_path) do nothing;

create index food_entries_ready_occurred_idx
  on public.food_entries (occurred_at desc)
  where status = 'ready';
create index food_entries_category_idx
  on public.food_entries (category)
  where status = 'ready';
create index food_entries_city_idx
  on public.food_entries (location_country_code, location_city_code, location_city_name)
  where status = 'ready';
create index food_images_group_order_idx
  on public.food_images (food_entry_id, sort_order asc);

drop trigger if exists food_images_set_updated_at on public.food_images;
create trigger food_images_set_updated_at
before update on public.food_images
for each row execute function public.set_updated_at();

alter table public.food_images enable row level security;

-- Intentionally no anon/authenticated policies. The service-role client remains
-- the only database path, after the Next.js private session is verified.
