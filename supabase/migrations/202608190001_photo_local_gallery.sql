-- Add the metadata and draft lifecycle required by the interactive Photos gallery.
-- Existing rows and their Supabase Storage objects are preserved as legacy records.

alter table public.photo_entries
  add column occurred_at timestamptz,
  add column timezone text,
  add column location_country_code text,
  add column location_country_name text,
  add column location_region_code text,
  add column location_region_name text,
  add column location_city_code text,
  add column location_city_name text,
  add column width integer,
  add column height integer,
  add column mime_type text,
  add column byte_size bigint,
  add column captured_at timestamptz,
  add column status text not null default 'ready',
  add column upload_request_id uuid,
  add column legacy_record boolean not null default false;

update public.photo_entries
set
  occurred_at = (photo_date + time '12:00') at time zone 'Asia/Shanghai',
  timezone = 'Asia/Shanghai',
  location_country_code = 'ZZ',
  location_country_name = '未指定',
  location_city_name = coalesce(nullif(btrim(location), ''), '未指定'),
  width = 4,
  height = 3,
  mime_type = case
    when lower(storage_path) like '%.png' then 'image/png'
    when lower(storage_path) like '%.webp' then 'image/webp'
    else 'image/jpeg'
  end,
  byte_size = 1,
  captured_at = (photo_date + time '12:00') at time zone 'Asia/Shanghai',
  status = 'ready',
  legacy_record = true
where occurred_at is null;

alter table public.photo_entries
  alter column occurred_at set not null,
  alter column timezone set not null,
  alter column location_country_code set not null,
  alter column location_country_name set not null,
  alter column location_city_name set not null,
  alter column width set not null,
  alter column height set not null,
  alter column mime_type set not null,
  alter column byte_size set not null,
  add constraint photo_entries_status_value
    check (status in ('draft', 'ready')),
  add constraint photo_entries_timezone_china
    check (timezone = 'Asia/Shanghai'),
  add constraint photo_entries_dimensions_positive
    check (width > 0 and height > 0),
  add constraint photo_entries_byte_size_positive
    check (byte_size > 0 and byte_size <= 10485760),
  add constraint photo_entries_mime_type_allowed
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  add constraint photo_entries_metadata_lengths
    check (
      legacy_record
      or (
        (title is null or char_length(title) <= 120)
        and (description is null or char_length(description) <= 2000)
        and char_length(location_country_code) between 2 and 32
        and char_length(location_country_name) between 1 and 100
        and (location_region_code is null or char_length(location_region_code) <= 80)
        and (location_region_name is null or char_length(location_region_name) <= 100)
        and (location_city_code is null or char_length(location_city_code) <= 80)
        and char_length(location_city_name) between 1 and 100
        and cardinality(tags) <= 20
      )
    ),
  add constraint photo_entries_local_path
    check (
      legacy_record
      or storage_path ~ (
        '^photos/' || id::text || '/' || id::text || '\.(jpg|jpeg|png|webp)$'
      )
    ),
  add constraint photo_entries_upload_request_unique unique (upload_request_id);

create index photo_entries_ready_occurred_idx
  on public.photo_entries (occurred_at desc, created_at desc)
  where status = 'ready';
create index photo_entries_ready_city_idx
  on public.photo_entries (
    location_country_code,
    location_city_code,
    location_city_name
  )
  where status = 'ready';

-- RLS is already enabled by the initial migration. No anon/authenticated policy
-- is added: the server-only service-role client remains the sole data path.

