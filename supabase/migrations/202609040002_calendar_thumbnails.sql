alter table public.calendar_assets
  drop constraint if exists calendar_assets_role_check;

alter table public.calendar_assets
  add constraint calendar_assets_role_check
  check (role in ('cover', 'sticker', 'preview', 'thumbnail'));

create unique index if not exists calendar_assets_single_thumbnail_idx
  on public.calendar_assets (calendar_entry_id)
  where role = 'thumbnail';
