-- Support stable keyset pagination for the private Food gallery.
create index if not exists food_entries_ready_pagination_idx
  on public.food_entries (occurred_at desc, created_at desc, id desc)
  where status = 'ready';
