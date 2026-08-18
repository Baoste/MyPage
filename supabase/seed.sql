-- Optional local-development content. No private records are seeded because
-- their matching Storage objects must exist before rows are useful.

insert into public.projects (
  id,
  title,
  description,
  tags,
  project_date,
  sort_order,
  is_published
)
values (
  '75b4f94a-6d51-49bd-b6f0-491ed25c5911',
  'A first project',
  'Replace this seed record with a concise description of real work.',
  array['Next.js', 'Supabase'],
  '2026-08-01',
  1,
  true
)
on conflict (id) do nothing;
