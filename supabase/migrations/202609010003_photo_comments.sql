-- Add account-attributed comments to ready Photo entries.

create table public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_entry_id uuid not null
    references public.photo_entries(id) on delete cascade,
  author_user_id uuid
    references public.private_users(id) on delete set null,
  author_username text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint photo_comments_author_username_length
    check (char_length(author_username) between 2 and 32),
  constraint photo_comments_content_length
    check (char_length(btrim(content)) between 1 and 1000)
);

create index photo_comments_entry_created_idx
  on public.photo_comments (photo_entry_id, created_at, id);

create index photo_comments_author_idx
  on public.photo_comments (author_user_id)
  where author_user_id is not null;

alter table public.photo_comments enable row level security;

-- Browsers never access comments directly. Authenticated reads and writes go
-- through the Next.js server after its private Session checks.
revoke all on table public.photo_comments from public, anon, authenticated;
grant select, insert on table public.photo_comments to service_role;
