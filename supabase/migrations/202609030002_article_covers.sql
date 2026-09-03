-- Article cover files live on the Next.js server's persistent disk.
-- PostgreSQL stores only the stable, site-local public URL.

alter table public.articles
  add column if not exists cover_url text;

alter table public.articles
  drop constraint if exists articles_cover_url_format;

alter table public.articles
  add constraint articles_cover_url_format check (
    cover_url is null
    or cover_url ~ '^/api/articles/covers/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

comment on column public.articles.cover_url is
  'Site-local URL for an article cover stored on the Next.js server persistent disk.';
