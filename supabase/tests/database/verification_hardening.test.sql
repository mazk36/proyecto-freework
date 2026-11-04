begin;
select no_plan();

create function public.test_ver(p_company uuid) returns timestamptz language sql security definer set search_path = ''
as $$ select v.updated_at from public.company_verifications v where v.company_user_id = p_company $$;
grant execute on function public.test_ver(uuid) to anon, authenticated;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
 ('d1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'hardening-admin@example.test', '', now(), '{}', '{"full_name":"Admin","role":"company"}'),
 ('d1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'hardening-company@example.test', '', now(), '{}', '{"full_name":"Empresa","role":"company"}'),
 ('d1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'hardening-pending@example.test', '', now(), '{}', '{"full_name":"Pendiente","role":"company"}');
insert into public.company_profiles(user_id, company_name, industry, country_code) values
 ('d1000000-0000-4000-8000-000000000002', 'Empresa', 'Servicios', 'PE'),
 ('d1000000-0000-4000-8000-000000000003', 'Pendiente', 'Servicios', 'PE');
insert into public.admins(user_id) values ('d1000000-0000-4000-8000-000000000001');

-- The company submits, then edits its request after the admin loaded it.
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.submit_company_verification('{"legal_name":"Empresa SAC","tax_id":"12345678901","website_url":"https://empresa.test"}');
reset role;
select set_config('test.seen_version', public.test_ver('d1000000-0000-4000-8000-000000000002')::text, true);
set local role authenticated;
select public.submit_company_verification('{"legal_name":"Otra Razon SAC","tax_id":"12345678902","website_url":"https://empresa.test"}');
reset role;

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.admin_verify_company('d1000000-0000-4000-8000-000000000002', current_setting('test.seen_version')::timestamptz)$$,
  '40001', 'verification request changed', 'verify with the version the admin saw fails after the company edited the request');
select throws_ok($$select public.admin_reject_company('d1000000-0000-4000-8000-000000000002', current_setting('test.seen_version')::timestamptz, 'Datos incompletos')$$,
  '40001', 'verification request changed', 'reject with a stale version fails');
select is((select status from public.admin_list_verification_requests('all') where company_user_id = 'd1000000-0000-4000-8000-000000000002'), 'pending', 'a stale action left the request pending');
select throws_ok($$select public.admin_verify_company('d1000000-0000-4000-8000-000000000002', null)$$,
  '22023', 'expected request version required', 'verify requires an expected version');
select lives_ok($$select public.admin_verify_company('d1000000-0000-4000-8000-000000000002', (select updated_at from public.admin_list_verification_requests('pending') where company_user_id = 'd1000000-0000-4000-8000-000000000002'))$$,
  'verify with the current version succeeds');
select is((select status from public.admin_list_verification_requests('all') where company_user_id = 'd1000000-0000-4000-8000-000000000002'), 'verified', 'company is verified');
reset role;

-- Renaming a verified company sends it back to pending; a pending one is unaffected.
update public.company_profiles set company_name = 'Banco Famoso S.A.' where user_id = 'd1000000-0000-4000-8000-000000000002';
select is((select status from public.company_verifications where company_user_id = 'd1000000-0000-4000-8000-000000000002'), 'pending', 'renaming a verified company withdraws the badge');
select ok(not exists (select 1 from public.company_verifications where company_user_id = 'd1000000-0000-4000-8000-000000000002' and verified_at is not null), 'verified_at is cleared');

set local role authenticated;
select lives_ok($$select public.admin_verify_company('d1000000-0000-4000-8000-000000000002', (select updated_at from public.admin_list_verification_requests('pending') where company_user_id = 'd1000000-0000-4000-8000-000000000002'))$$,
  'admin can re-verify after the rename');
reset role;

-- A pending request is not touched by a rename.
reset role;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select public.submit_company_verification('{"legal_name":"Pendiente SAC","tax_id":"12345678903","website_url":"https://pendiente.test"}');
reset role;
update public.company_profiles set company_name = 'Pendiente Renombrada' where user_id = 'd1000000-0000-4000-8000-000000000003';
select is((select status from public.company_verifications where company_user_id = 'd1000000-0000-4000-8000-000000000003'), 'pending', 'renaming a pending company keeps the request pending');

-- Changing the country invalidates the submitted tax id for verified and pending requests.
update public.company_profiles set country_code = 'ES' where user_id = 'd1000000-0000-4000-8000-000000000002';
select is((select status from public.company_verifications where company_user_id = 'd1000000-0000-4000-8000-000000000002'), 'rejected', 'country change on a verified company rejects the request');
select ok((select rejection_reason from public.company_verifications where company_user_id = 'd1000000-0000-4000-8000-000000000002') like 'Cambió el país%', 'the company sees why');
update public.company_profiles set country_code = 'ES' where user_id = 'd1000000-0000-4000-8000-000000000003';
select is((select status from public.company_verifications where company_user_id = 'd1000000-0000-4000-8000-000000000003'), 'rejected', 'country change on a pending company rejects the request');

select * from finish();
rollback;
