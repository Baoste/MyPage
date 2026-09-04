with ranked_notes as (
  select
    owner_user_id,
    note_month,
    row_number() over (
      partition by note_month
      order by updated_at desc, created_at desc, owner_user_id::text desc
    ) as position
  from public.calendar_month_notes
)
delete from public.calendar_month_notes as note
using ranked_notes as ranked
where note.owner_user_id = ranked.owner_user_id
  and note.note_month = ranked.note_month
  and ranked.position > 1;

alter table public.calendar_month_notes
  drop constraint if exists calendar_month_notes_pkey;

alter table public.calendar_month_notes
  add constraint calendar_month_notes_pkey primary key (note_month);
