-- Add account-attributed comments to ready Food entries.

create table public.food_comments (
  id uuid primary key default gen_random_uuid(),
  food_entry_id uuid not null
    references public.food_entries(id) on delete cascade,
  author_user_id uuid
    references public.private_users(id) on delete set null,
  author_username text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint food_comments_author_username_length
    check (char_length(author_username) between 2 and 32),
  constraint food_comments_content_length
    check (char_length(btrim(content)) between 1 and 1000)
);

create index food_comments_entry_created_idx
  on public.food_comments (food_entry_id, created_at, id);

create index food_comments_author_idx
  on public.food_comments (author_user_id)
  where author_user_id is not null;

alter table public.food_comments enable row level security;

-- Browsers never access comments directly. Authenticated reads and writes go
-- through the Next.js server after its private Session checks.
revoke all on table public.food_comments from public, anon, authenticated;
grant select, insert on table public.food_comments to service_role;
