-- Support stable keyset pagination for the private Photos gallery.
create index if not exists photo_entries_ready_pagination_idx
  on public.photo_entries (occurred_at desc, created_at desc, id desc)
  where status = 'ready';
