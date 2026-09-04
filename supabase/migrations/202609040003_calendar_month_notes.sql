create table if not exists public.calendar_month_notes (
  owner_user_id uuid not null references public.private_users(id) on delete cascade,
  note_month date not null check (extract(day from note_month) = 1),
  content text not null default '' check (char_length(content) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, note_month)
);

drop trigger if exists calendar_month_notes_touch_updated_at on public.calendar_month_notes;
create trigger calendar_month_notes_touch_updated_at before update on public.calendar_month_notes
for each row execute function public.touch_calendar_entry_updated_at();

alter table public.calendar_month_notes enable row level security;
revoke all on public.calendar_month_notes from anon, authenticated;
grant all on public.calendar_month_notes to service_role;
