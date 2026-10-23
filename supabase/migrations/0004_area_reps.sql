-- Area reps: assigned to stores by managers (one area rep per store).
-- Area reps review (approve/reject), set warranty/charge and record payment for their stores.
-- Support (plant team) sees all tickets and runs logistics/repair steps only.
-- Additive: new column, helpers, one new policy; existing policies altered in place.

alter table stores add column area_rep_id uuid references profiles (id) on delete set null;
create index stores_area_rep_idx on stores (area_rep_id);

create or replace function check_store_area_rep() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.area_rep_id is not null
     and not exists (select 1 from profiles where id = new.area_rep_id and role = 'area_rep') then
    raise exception 'Only an area rep can be assigned to a store';
  end if;
  return new;
end $$;

create trigger stores_area_rep_check
before insert or update of area_rep_id on stores
for each row execute function check_store_area_rep();

-- True for managers, and for the area rep assigned to the store.
create or replace function can_review_store(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() = 'manager', false)
      or (app_role() = 'area_rep'
          and exists (select 1 from stores s where s.id = p_store and s.area_rep_id = auth.uid()))
$$;

revoke execute on function check_store_area_rep() from public, anon, authenticated;
revoke execute on function can_review_store(uuid) from public, anon;
grant execute on function can_review_store(uuid) to authenticated;

-- Reads: support + managers see all; area reps see their stores; store reps unchanged.
alter policy "staff read tickets" on tickets
  using (is_staff() or can_review_store(store_id));

-- Area reps (and managers) can log tickets for stores they cover.
create policy "area rep create ticket" on tickets for insert to authenticated
  with check (
    app_role() in ('area_rep', 'manager')
    and can_review_store(store_id)
    and created_by = (select auth.uid())
    and status = 'SUBMITTED'
  );

-- An event is visible exactly when its ticket is.
alter policy "read ticket events" on ticket_events
  using (exists (select 1 from tickets t where t.id = ticket_events.ticket_id));

-- Workflow functions: same signatures, role checks per step.
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
  select * into t from tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;
  v_from := t.status;

  -- Review belongs to the store's area rep (or a manager); every later step to support (or a manager).
  if p_to in ('APPROVED', 'REJECTED') then
    if not can_review_store(t.store_id) then
      raise exception 'Only the area rep for this store or a manager can review this request';
    end if;
  elsif not is_staff() then
    raise exception 'Only the support team can update this step';
  end if;

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

  if p_to = 'APPROVED' and t.under_warranty is null then
    raise exception 'Choose whether the unit is under warranty before approving';
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

create or replace function set_ticket_charge(
  p_ticket_id uuid,
  p_under_warranty boolean,
  p_charge_amount numeric default null
) returns tickets
language plpgsql security definer set search_path = public as $$
declare
  t tickets;
begin
  if p_under_warranty is null then
    raise exception 'Choose whether the unit is under warranty';
  end if;
  if not p_under_warranty and (p_charge_amount is null or p_charge_amount <= 0) then
    raise exception 'Enter the amount to charge the customer';
  end if;

  select * into t from tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;
  if not can_review_store(t.store_id) then
    raise exception 'Only the area rep for this store or a manager can set warranty and charges';
  end if;
  if t.status in ('REJECTED', 'DELIVERED') then
    raise exception 'This ticket is closed';
  end if;

  -- Nothing changed: don't add a timeline entry.
  if t.under_warranty is not distinct from p_under_warranty
     and (p_under_warranty or t.charge_amount = round(p_charge_amount, 2)) then
    return t;
  end if;

  update tickets set
    under_warranty = p_under_warranty,
    charge_amount = case when p_under_warranty then null else round(p_charge_amount, 2) end,
    payment_received_at = case when p_under_warranty then null else payment_received_at end,
    payment_received_by = case when p_under_warranty then null else payment_received_by end,
    updated_at = now()
  where id = p_ticket_id
  returning * into t;

  insert into ticket_events (ticket_id, actor_id, from_status, to_status, kind, note)
  values (
    p_ticket_id, auth.uid(), t.status, t.status, 'warranty',
    case when p_under_warranty then 'Under warranty, no charge'
         else 'Out of warranty, charge Rs ' || (case when t.charge_amount = trunc(t.charge_amount) then to_char(t.charge_amount, 'FM999,999,999,990') else to_char(t.charge_amount, 'FM999,999,999,990.00') end) end
  );
  return t;
end $$;

create or replace function set_ticket_payment(p_ticket_id uuid, p_received boolean)
returns tickets
language plpgsql security definer set search_path = public as $$
declare
  t tickets;
begin
  select * into t from tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;
  if not can_review_store(t.store_id) then
    raise exception 'Only the area rep for this store or a manager can record payments';
  end if;
  if t.under_warranty is distinct from false then
    raise exception 'This ticket has no charge';
  end if;
  if (t.payment_received_at is not null) = p_received then
    return t;
  end if;

  update tickets set
    payment_received_at = case when p_received then now() else null end,
    payment_received_by = case when p_received then auth.uid() else null end,
    updated_at = now()
  where id = p_ticket_id
  returning * into t;

  insert into ticket_events (ticket_id, actor_id, from_status, to_status, kind, note)
  values (
    p_ticket_id, auth.uid(), t.status, t.status, 'payment',
    case when p_received then 'Payment of Rs ' || (case when t.charge_amount = trunc(t.charge_amount) then to_char(t.charge_amount, 'FM999,999,999,990') else to_char(t.charge_amount, 'FM999,999,999,990.00') end) || ' received'
         else 'Payment marked as not received' end
  );
  return t;
end $$;
