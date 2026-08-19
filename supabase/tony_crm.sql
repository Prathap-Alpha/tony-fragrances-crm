-- Tony Fragrances CRM — shared-passcode storage table (run once in the
-- nakotech Supabase project's SQL editor).
--
-- The whole CRM dataset is ONE JSON document, one row per workspace. The
-- "workspace" key is the SHA-256 of Tony's secret passcode, so two devices that
-- type the same passcode read/write the same row and see the same data.
--
-- Security model: access is gated on that secret workspace key, which the app
-- sends on every request as the `x-workspace` header. Row Level Security only
-- exposes the single row whose key matches the header. Without the exact key
-- (i.e. without the passcode) the public anon key sees NOTHING — the table
-- cannot be listed or dumped. This is the same "possession of the secret grants
-- access" model the old Google-Drive design used, minus the hourly token.

create table if not exists public.tony_crm (
  workspace  text primary key,
  data       jsonb        not null default '{}'::jsonb,
  updated_at timestamptz  not null default now()
);

alter table public.tony_crm enable row level security;

-- Drop first so re-running this file is safe.
drop policy if exists tony_crm_rw on public.tony_crm;

create policy tony_crm_rw on public.tony_crm
  for all
  to anon
  using      ( workspace = current_setting('request.headers', true)::json ->> 'x-workspace' )
  with check ( workspace = current_setting('request.headers', true)::json ->> 'x-workspace' );

-- Note: current_setting('request.headers', true) returns NULL when the header
-- is absent, so the comparison is NULL (denied). Bare anon access = no rows.
