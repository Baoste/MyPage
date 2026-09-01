-- Replace the shared private-space password with invited user accounts.
-- The Next.js server remains the only data path and uses the service-role key.

create table public.private_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_normalized text not null unique,
  password_hash text not null,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_users_username_length
    check (char_length(username) between 2 and 32),
  constraint private_users_username_normalized_length
    check (char_length(username_normalized) between 2 and 32),
  constraint private_users_password_hash_format
    check (password_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$')
);

create table public.private_invites (
  id uuid primary key default gen_random_uuid(),
  code_digest text not null unique,
  label text,
  max_uses integer not null default 1,
  use_count integer not null default 0,
  expires_at timestamptz,
  disabled_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_invites_digest_format
    check (code_digest ~ '^[0-9a-f]{64}$'),
  constraint private_invites_label_length
    check (label is null or char_length(label) <= 120),
  constraint private_invites_usage_range
    check (max_uses between 1 and 1000 and use_count between 0 and max_uses)
);

drop trigger if exists private_users_set_updated_at on public.private_users;
create trigger private_users_set_updated_at
before update on public.private_users
for each row execute function public.set_updated_at();

drop trigger if exists private_invites_set_updated_at on public.private_invites;
create trigger private_invites_set_updated_at
before update on public.private_invites
for each row execute function public.set_updated_at();

alter table public.photo_entries
  add column owner_user_id uuid
  references public.private_users(id) on delete set null;

alter table public.food_entries
  add column owner_user_id uuid
  references public.private_users(id) on delete set null;

create index photo_entries_owner_user_idx
  on public.photo_entries (owner_user_id)
  where owner_user_id is not null;

create index food_entries_owner_user_idx
  on public.food_entries (owner_user_id)
  where owner_user_id is not null;

alter table public.private_users enable row level security;
alter table public.private_invites enable row level security;

-- Registration must consume an invitation and create the account atomically.
-- It runs as the service-role caller; no browser role receives EXECUTE.
create or replace function public.register_private_user(
  invitation_id uuid,
  account_username text,
  normalized_username text,
  account_password_hash text
)
returns table (user_id uuid, registered_username text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  invitation public.private_invites%rowtype;
  created_user_id uuid;
begin
  select invite.*
  into invitation
  from public.private_invites as invite
  where invite.id = invitation_id
  for update;

  if not found
    or invitation.disabled_at is not null
    or invitation.use_count >= invitation.max_uses
    or (invitation.expires_at is not null and invitation.expires_at <= now())
  then
    raise exception using errcode = 'P0001', message = 'INVITATION_UNAVAILABLE';
  end if;

  insert into public.private_users (
    username,
    username_normalized,
    password_hash
  ) values (
    account_username,
    normalized_username,
    account_password_hash
  )
  returning id into created_user_id;

  update public.private_invites
  set
    use_count = use_count + 1,
    last_used_at = now()
  where id = invitation.id;

  return query select created_user_id, account_username;
end;
$$;

revoke all on table public.private_users from public, anon, authenticated;
revoke all on table public.private_invites from public, anon, authenticated;
revoke all on function public.register_private_user(uuid, text, text, text)
  from public, anon, authenticated;

grant select, insert, update, delete on table public.private_users to service_role;
grant select, insert, update, delete on table public.private_invites to service_role;
grant execute on function public.register_private_user(uuid, text, text, text)
  to service_role;

-- Existing Photo/Food rows intentionally keep a null owner. New uploads receive
-- the authenticated account id from the server and retain that attribution.
