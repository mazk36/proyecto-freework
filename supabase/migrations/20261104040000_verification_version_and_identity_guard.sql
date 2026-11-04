-- Security hardening found in the adversarial review of 20261104030235.
-- 1) verify/reject must name the exact request version (updated_at) the admin reviewed;
--    if the company edited the request in the meantime the action fails ('verification request changed').
-- 2) the public badge ("verified") must not survive a change of the identity data it vouches for:
--    renaming a verified company sends it back to 'pending'; changing its country invalidates the
--    submitted tax id, so the request is rejected with a reason and the company must resubmit.

drop function public.admin_verify_company(uuid);
drop function public.admin_reject_company(uuid, text);

create function public.admin_verify_company(p_company_user_id uuid, p_expected_updated_at timestamptz)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := public.require_admin(); v_status text; v_updated timestamptz;
begin
  perform public.require_active_account();
  select v.status, v.updated_at into v_status, v_updated
    from public.company_verifications v where v.company_user_id = p_company_user_id for update;
  if not found then raise exception 'verification request not found' using errcode = 'P0002'; end if;
  if p_expected_updated_at is null then raise exception 'expected request version required' using errcode = '22023'; end if;
  if v_status = 'verified' then return; end if;
  if v_updated is distinct from p_expected_updated_at then
    raise exception 'verification request changed' using errcode = '40001';
  end if;
  if public.company_verification_transition(v_status, 'verify') is null then raise exception 'invalid verification transition' using errcode = '22023'; end if;
  update public.company_verifications v set status = 'verified', verified_at = pg_catalog.clock_timestamp(),
    rejection_reason = null, updated_at = pg_catalog.clock_timestamp() where v.company_user_id = p_company_user_id;
  insert into public.admin_actions(admin_id, action, target_type, target_id)
  values (v_admin, 'verify_company', 'company', p_company_user_id::text);
end;
$$;

create function public.admin_reject_company(p_company_user_id uuid, p_expected_updated_at timestamptz, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := public.require_admin(); v_status text; v_updated timestamptz; v_reason text := public.trim_verification_input(p_reason);
begin
  perform public.require_active_account();
  if v_reason is null or pg_catalog.char_length(v_reason) not between 5 and 200 then
    raise exception 'invalid rejection reason' using errcode = '22023';
  end if;
  select v.status, v.updated_at into v_status, v_updated
    from public.company_verifications v where v.company_user_id = p_company_user_id for update;
  if not found then raise exception 'verification request not found' using errcode = 'P0002'; end if;
  if p_expected_updated_at is null then raise exception 'expected request version required' using errcode = '22023'; end if;
  if v_status = 'rejected' and exists (select 1 from public.company_verifications v where v.company_user_id = p_company_user_id and v.rejection_reason = v_reason) then return; end if;
  if v_updated is distinct from p_expected_updated_at then
    raise exception 'verification request changed' using errcode = '40001';
  end if;
  if v_status <> 'pending' then raise exception 'invalid verification transition' using errcode = '22023'; end if;
  update public.company_verifications v set status = 'rejected', rejection_reason = v_reason,
    verified_at = null, updated_at = pg_catalog.clock_timestamp() where v.company_user_id = p_company_user_id;
  insert into public.admin_actions(admin_id, action, target_type, target_id, reason)
  values (v_admin, 'reject_company', 'company', p_company_user_id::text, v_reason);
end;
$$;

revoke all on function public.admin_verify_company(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_reject_company(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.admin_verify_company(uuid, timestamptz) to authenticated;
grant execute on function public.admin_reject_company(uuid, timestamptz, text) to authenticated;

create function public.guard_verified_identity_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.country_code is distinct from old.country_code then
    update public.company_verifications v set status = 'rejected',
      rejection_reason = 'Cambió el país de la empresa: vuelve a enviar los datos de verificación.',
      verified_at = null, updated_at = pg_catalog.clock_timestamp()
    where v.company_user_id = new.user_id and v.status in ('pending', 'verified');
  elsif new.company_name is distinct from old.company_name then
    update public.company_verifications v set status = 'pending', verified_at = null,
      updated_at = pg_catalog.clock_timestamp()
    where v.company_user_id = new.user_id and v.status = 'verified';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_verified_identity_change() from public, anon, authenticated;
create trigger guard_verified_identity_change after update of company_name, country_code on public.company_profiles
  for each row execute function public.guard_verified_identity_change();
