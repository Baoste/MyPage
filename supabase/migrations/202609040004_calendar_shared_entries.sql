alter table public.calendar_entries
  drop constraint if exists calendar_entries_owner_user_id_entry_date_key;

create unique index if not exists calendar_entries_entry_date_key
  on public.calendar_entries (entry_date);

drop index if exists public.calendar_entries_owner_month_idx;
