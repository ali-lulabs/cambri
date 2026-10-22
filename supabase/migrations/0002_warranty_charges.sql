-- Out-of-warranty repairs: warranty status, charge amount and payment tracking.
-- Additive only: new columns and functions; transition_ticket() keeps its signature.

alter table tickets
  add column under_warranty boolean,
  add column charge_amount numeric(12, 2) check (charge_amount is null or charge_amount > 0),
  add column payment_received_at timestamptz,
  add column payment_received_by uuid references profiles (id),
  add constraint charge_matches_warranty check (
    (under_warranty is distinct from false and charge_amount is null and payment_received_at is null)
    or (under_warranty = false and charge_amount is not null)
  );

-- Timeline entries for warranty/payment changes (status stays the same).
alter table ticket_events
  add column kind text not null default 'status' check (kind in ('status', 'warranty', 'payment'));

-- Tickets approved under the old process were all warranty jobs.
update tickets set under_warranty = true
where under_warranty is null and status not in ('SUBMITTED', 'REJECTED');

-- ---------------------------------------------------------------------------
-- Set warranty / charge. Staff only, while the ticket is open.
-- ---------------------------------------------------------------------------
create or replace function set_ticket_charge(
  p_ticket_id uuid,
  p_under_warranty boolean,
  p_charge_amount numeric default null
) returns tickets
language plpgsql security definer set search_path = public as $$
declare
  t tickets;
begin
  if not is_staff() then
    raise exception 'Only support staff can set warranty and charges';
  end if;
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

-- ---------------------------------------------------------------------------
-- Mark the customer's payment received (or undo). Staff only.
-- ---------------------------------------------------------------------------
create or replace function set_ticket_payment(p_ticket_id uuid, p_received boolean)
returns tickets
language plpgsql security definer set search_path = public as $$
declare
  t tickets;
begin
  if not is_staff() then
    raise exception 'Only support staff can record payments';
  end if;

  select * into t from tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
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

revoke execute on function set_ticket_charge(uuid, boolean, numeric) from public, anon;
revoke execute on function set_ticket_payment(uuid, boolean) from public, anon;
grant execute on function set_ticket_charge(uuid, boolean, numeric) to authenticated;
grant execute on function set_ticket_payment(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Approval now requires a warranty decision. Same signature as before.
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
