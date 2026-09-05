-- Account-scoped notifications for shared Photos/Food activity.

create table public.private_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.private_users(id) on delete cascade,
  actor_user_id uuid references public.private_users(id) on delete set null,
  actor_username text not null,
  kind text not null,
  resource_type text not null,
  resource_id uuid not null,
  resource_label text not null,
  comment_excerpt text,
  event_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint private_notifications_kind_allowed
    check (kind in ('photo_published', 'food_published', 'photo_commented', 'food_commented')),
  constraint private_notifications_resource_type_allowed
    check (resource_type in ('photo', 'food')),
  constraint private_notifications_actor_username_length
    check (char_length(actor_username) between 2 and 32),
  constraint private_notifications_resource_label_length
    check (char_length(resource_label) between 1 and 160),
  constraint private_notifications_comment_excerpt_length
    check (comment_excerpt is null or char_length(comment_excerpt) <= 240),
  constraint private_notifications_event_key_length
    check (char_length(event_key) between 1 and 160),
  constraint private_notifications_recipient_event_unique
    unique (recipient_user_id, event_key)
);

create index private_notifications_recipient_recent_idx
  on public.private_notifications (recipient_user_id, created_at desc);

create index private_notifications_recipient_unread_idx
  on public.private_notifications (recipient_user_id, created_at desc)
  where read_at is null;

alter table public.private_notifications enable row level security;

revoke all on table public.private_notifications from public, anon, authenticated;
grant select, insert, update, delete on table public.private_notifications to service_role;

-- No browser role receives a policy. Notification access remains behind the
-- private Next.js session and the server-only service-role client.
