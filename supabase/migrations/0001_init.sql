-- After-sales returns tracker: schema, security rules and ticket workflow.
-- Run once in the Supabase SQL editor (or with `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type user_role as enum ('rep', 'support', 'manager');
create type product_category as enum ('fan', 'microwave', 'blender');
create type ticket_status as enum (
  'SUBMITTED', 'REJECTED', 'APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP',
  'RECEIVED_AT_PLANT', 'REPAIRED', 'REPLACED', 'RETURN_SCHEDULED', 'DELIVERED'
);
create type resolution_type as enum ('repair', 'replace');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  retailer text not null,
  city text not null,
  address text,
  manager_contact text,
  created_at timestamptz not null default now()
);

create table product_models (
  id uuid primary key default gen_random_uuid(),
  category product_category not null,
  model_code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table dispatchers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  vehicle text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per login. Created by an admin (service role), never by self sign-up.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  role user_role not null default 'rep',
  store_id uuid references stores (id),
  created_at timestamptz not null default now(),
  constraint rep_needs_store check (role <> 'rep' or store_id is not null)
);

create sequence ticket_no_seq start 1001;

create table tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique
    default ('RT-' || lpad(nextval('ticket_no_seq')::text, 6, '0')),
  store_id uuid not null references stores (id),
  product_model_id uuid not null references product_models (id),
  serial_no text not null,
  issue_description text not null,
  store_manager_name text not null,
  status ticket_status not null default 'SUBMITTED',
  rejection_reason text,
  resolution resolution_type,
  replacement_serial_no text,
  pickup_dispatcher_id uuid references dispatchers (id),
  return_dispatcher_id uuid references dispatchers (id),
  verify_token uuid not null unique default gen_random_uuid(),
  created_by uuid references profiles (id),
  approved_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index tickets_store_idx on tickets (store_id);
create index tickets_status_idx on tickets (status);

create table ticket_events (
  id bigserial primary key,
  ticket_id uuid not null references tickets (id) on delete cascade,
  actor_id uuid references profiles (id),
  from_status ticket_status,
  to_status ticket_status not null,
  note text,
  created_at timestamptz not null default now()
);
create index ticket_events_ticket_idx on ticket_events (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so RLS policies can call them without recursion)
-- ---------------------------------------------------------------------------
create or replace function app_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function app_store() returns uuid
language sql stable security definer set search_path = public as $$
  select store_id from profiles where id = auth.uid()
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('support', 'manager'), false)
$$;

-- Log the first timeline entry whenever a ticket is created.
create or replace function log_ticket_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into ticket_events (ticket_id, actor_id, from_status, to_status, note, created_at)
  values (new.id, new.created_by, null, new.status, null, new.created_at);
  return new;
end $$;

create trigger tickets_after_insert
after insert on tickets for each row execute function log_ticket_created();

-- ---------------------------------------------------------------------------
-- Workflow: the only way a ticket changes status.
-- Validates the step, applies it and writes the audit event atomically.
-- ---------------------------------------------------------------------------
create or replace function transition_ticket(
  p_ticket_id uuid,
  p_to ticket_status,
  p_note text default null,
  p_dispatcher_id uuid default null,
  p_replacement_serial text default null
) returns tickets
language plpgsql security definer set search_path = public as $$
declare
  t tickets;
  v_from ticket_status;
  allowed ticket_status[];
begin
  if not is_staff() then
    raise exception 'Only support staff can update tickets';
  end if;

  select * into t from tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;
  v_from := t.status;

  allowed := case t.status
    when 'SUBMITTED'         then array['APPROVED', 'REJECTED']::ticket_status[]
    when 'APPROVED'          then array['PICKUP_SCHEDULED']::ticket_status[]
    when 'PICKUP_SCHEDULED'  then array['PICKED_UP']::ticket_status[]
    when 'PICKED_UP'         then array['RECEIVED_AT_PLANT']::ticket_status[]
    when 'RECEIVED_AT_PLANT' then array['REPAIRED', 'REPLACED']::ticket_status[]
    when 'REPAIRED'          then array['RETURN_SCHEDULED']::ticket_status[]
    when 'REPLACED'          then array['RETURN_SCHEDULED']::ticket_status[]
    when 'RETURN_SCHEDULED'  then array['DELIVERED']::ticket_status[]
    else array[]::ticket_status[]
  end;

  if not (p_to = any (allowed)) then
    raise exception 'Cannot move ticket from % to %', t.status, p_to;
  end if;

  if p_to = 'REJECTED' and coalesce(trim(p_note), '') = '' then
    raise exception 'A reason is required to reject';
  end if;
  if p_to in ('PICKUP_SCHEDULED', 'RETURN_SCHEDULED') and p_dispatcher_id is null then
    raise exception 'Choose a dispatcher';
  end if;
  if p_to = 'REPLACED' and coalesce(trim(p_replacement_serial), '') = '' then
    raise exception 'Enter the replacement unit serial number';
  end if;

  update tickets set
    status = p_to,
    updated_at = now(),
    rejection_reason      = case when p_to = 'REJECTED' then trim(p_note) else rejection_reason end,
    approved_by           = case when p_to = 'APPROVED' then auth.uid() else approved_by end,
    pickup_dispatcher_id  = case when p_to = 'PICKUP_SCHEDULED' then p_dispatcher_id else pickup_dispatcher_id end,
    return_dispatcher_id  = case when p_to = 'RETURN_SCHEDULED' then p_dispatcher_id else return_dispatcher_id end,
    resolution            = case when p_to = 'REPAIRED' then 'repair'::resolution_type
                                 when p_to = 'REPLACED' then 'replace'::resolution_type
                                 else resolution end,
    replacement_serial_no = case when p_to = 'REPLACED' then trim(p_replacement_serial) else replacement_serial_no end,
    closed_at             = case when p_to in ('REJECTED', 'DELIVERED') then now() else closed_at end
  where id = p_ticket_id
  returning * into t;

  insert into ticket_events (ticket_id, actor_id, from_status, to_status, note)
  values (p_ticket_id, auth.uid(), v_from, p_to, nullif(trim(p_note), ''));

  return t;
end $$;

-- Public, read-only lookup used by the QR code on printed slips.
create or replace function get_ticket_by_token(p_token uuid)
returns table (
  ticket_no text,
  status ticket_status,
  store_name text,
  retailer text,
  product_name text,
  model_code text,
  serial_no text,
  replacement_serial_no text,
  pickup_dispatcher text,
  pickup_vehicle text,
  return_dispatcher text,
  return_vehicle text,
  updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select t.ticket_no, t.status, s.name, s.retailer, p.name, p.model_code, t.serial_no,
         t.replacement_serial_no, pd.name, pd.vehicle, rd.name, rd.vehicle, t.updated_at
  from tickets t
  join stores s on s.id = t.store_id
  join product_models p on p.id = t.product_model_id
  left join dispatchers pd on pd.id = t.pickup_dispatcher_id
  left join dispatchers rd on rd.id = t.return_dispatcher_id
  where t.verify_token = p_token
$$;

-- ---------------------------------------------------------------------------
-- Grants. Postgres lets PUBLIC execute new functions by default, and newer
-- Supabase projects may not expose new tables automatically, so be explicit.
-- ---------------------------------------------------------------------------
revoke execute on function app_role() from public, anon;
revoke execute on function app_store() from public, anon;
revoke execute on function is_staff() from public, anon;
revoke execute on function log_ticket_created() from public, anon, authenticated;
revoke execute on function transition_ticket(uuid, ticket_status, text, uuid, text) from public, anon;
revoke execute on function get_ticket_by_token(uuid) from public;

-- RLS policies call these helpers as the signed-in user.
grant execute on function app_role() to authenticated;
grant execute on function app_store() to authenticated;
grant execute on function is_staff() to authenticated;
grant execute on function transition_ticket(uuid, ticket_status, text, uuid, text) to authenticated;
-- Public QR verification page.
grant execute on function get_ticket_by_token(uuid) to anon, authenticated;

-- Table access for signed-in users (RLS below decides which rows).
-- The anon role gets no table access at all.
revoke all on stores, product_models, dispatchers, profiles, tickets, ticket_events from anon;
grant select, insert, update, delete on stores, product_models, dispatchers to authenticated;
grant select on profiles, ticket_events to authenticated;
grant select, insert on tickets to authenticated;
grant usage on sequence ticket_no_seq to authenticated;
-- Server-side admin actions and the seed script use the service role.
grant all on stores, product_models, dispatchers, profiles, tickets, ticket_events to service_role;
grant usage, select on sequence ticket_no_seq, ticket_events_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table stores enable row level security;
alter table product_models enable row level security;
alter table dispatchers enable row level security;
alter table profiles enable row level security;
alter table tickets enable row level security;
alter table ticket_events enable row level security;

-- Reference data: any signed-in user can read; managers can change.
create policy "read stores" on stores for select to authenticated using (true);
create policy "manage stores" on stores for all to authenticated
  using (app_role() = 'manager') with check (app_role() = 'manager');

create policy "read products" on product_models for select to authenticated using (true);
create policy "manage products" on product_models for all to authenticated
  using (app_role() = 'manager') with check (app_role() = 'manager');

create policy "read dispatchers" on dispatchers for select to authenticated using (true);
create policy "manage dispatchers" on dispatchers for all to authenticated
  using (app_role() = 'manager') with check (app_role() = 'manager');

-- Names are shown on timelines, so signed-in users can read profiles.
-- Profiles are created and changed only by the server (service role).
create policy "read profiles" on profiles for select to authenticated using (true);

-- Tickets: staff see all; reps see and create only for their own store.
create policy "staff read tickets" on tickets for select to authenticated using (is_staff());
create policy "rep read own store tickets" on tickets for select to authenticated
  using (app_role() = 'rep' and store_id = app_store());
create policy "rep create ticket" on tickets for insert to authenticated
  with check (
    app_role() = 'rep'
    and store_id = app_store()
    and created_by = auth.uid()
    and status = 'SUBMITTED'
  );
-- No update/delete policies: status changes go through transition_ticket().

create policy "read ticket events" on ticket_events for select to authenticated
  using (
    is_staff()
    or exists (
      select 1 from tickets t
      where t.id = ticket_events.ticket_id and t.store_id = app_store()
    )
  );
