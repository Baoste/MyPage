-- Public Articles stored as Markdown in PostgreSQL.
-- Browsers never access this table directly; reads and password-protected
-- writes go through the Next.js server-only service-role client.

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  content text not null,
  tags text[] not null default '{}'::text[],
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_slug_format check (
    char_length(slug) between 1 and 120
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint articles_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint articles_summary_length check (char_length(btrim(summary)) between 1 and 500),
  constraint articles_content_length check (char_length(btrim(content)) between 1 and 200000),
  constraint articles_tags_count check (cardinality(tags) <= 12)
);

create index if not exists articles_public_order_idx
  on public.articles (published_at desc, id desc)
  where is_published = true;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

alter table public.articles enable row level security;

revoke all on table public.articles from public, anon, authenticated;
grant select, insert on table public.articles to service_role;
