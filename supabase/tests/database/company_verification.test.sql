begin;
create function public.test_ver(p_company uuid) returns timestamptz language sql security definer set search_path = ''
as $$ select v.updated_at from public.company_verifications v where v.company_user_id = p_company $$;
grant execute on function public.test_ver(uuid) to anon, authenticated;

select no_plan();

-- BEGIN VERIFICATION TRANSITION CASES
create temporary table verification_transition_cases (id integer, current_status text, action text, expected text) on commit drop;
insert into verification_transition_cases values
  (1, 'not_requested', 'submit', 'pending'),
  (2, 'not_requested', 'verify', null),
  (3, 'not_requested', 'reject', null),
  (4, 'not_requested', 'undo', null),
  (5, 'pending', 'submit', 'pending'),
  (6, 'pending', 'verify', 'verified'),
  (7, 'pending', 'reject', 'rejected'),
  (8, 'pending', 'undo', null),
  (9, 'verified', 'submit', null),
  (10, 'verified', 'verify', 'verified'),
  (11, 'verified', 'reject', null),
  (12, 'verified', 'undo', 'pending'),
  (13, 'rejected', 'submit', 'pending'),
  (14, 'rejected', 'verify', null),
  (15, 'rejected', 'reject', 'rejected'),
  (16, 'rejected', 'undo', null);
-- END VERIFICATION TRANSITION CASES
select is(public.company_verification_transition(current_status, action), expected,
  'verification transition ' || current_status || ' + ' || action) from verification_transition_cases order by id;

-- BEGIN VERIFICATION VALIDATOR CASES
create temporary table verification_validator_cases (id integer, kind text, value text, expected boolean) on commit drop;
insert into verification_validator_cases values
  (1, 'ruc', '12345678901', true),
  (2, 'ruc', ' 12345678901 ', true),
  (3, 'ruc', '1234567890', false),
  (4, 'ruc', '1234567890x', false),
  (5, 'email', 'x@gmail.com', true),
  (6, 'email', ' PERSON@HOTMAIL.ES ', true),
  (7, 'email', 'x@outlook.com', true),
  (8, 'email', 'x@yahoo.es', true),
  (9, 'email', 'x@icloud.com', true),
  (10, 'email', 'x@live.com', true),
  (11, 'email', 'x@msn.com', true),
  (12, 'email', 'x@proton.me', true),
  (13, 'email', 'x@protonmail.com', true),
  (14, 'email', 'x@gmx.net', true),
  (15, 'email', 'x@aol.com', true),
  (16, 'email', 'x@empresa.example', false),
  (17, 'url', 'https://example.com', true),
  (18, 'url', ' HTTPS://example.com/contact ', true),
  (19, 'url', 'http://example.com', false),
  (20, 'url', 'https://user:pass@example.com', false),
  (21, 'url', 'javascript:evil', false),
  (22, 'url', 'https://example.com:99999', false),
  (23, 'url', 'https://example..com', false),
  (24, 'linkedin', 'https://www.linkedin.com/company/acme', true),
  (25, 'linkedin', 'https://linkedin.com.evil.test/company/acme', false),
  (26, 'url', 'https://negócio.pe', true),
  (27, 'url', 'https://[::1]:443/contact', true),
  (28, 'url', 'https://[:::]/', false),
  (29, 'url', 'https://example.com@evil.test', false),
  (30, 'ruc', '	12345678901	', true),
  (31, 'email', '	X@GMAIL.COM	', true);
-- END VERIFICATION VALIDATOR CASES
select is(case kind when 'ruc' then public.is_valid_peruvian_ruc(value)
  when 'email' then public.is_free_email_domain(value)
  when 'url' then public.is_valid_verification_url(value)
  else public.is_valid_verification_url(value, true) end, expected, 'shared validator ' || id::text)
  from verification_validator_cases order by id;

select ok(public.is_valid_peruvian_ruc(' 12345678901 '), 'RUC accepts exactly eleven digits after trimming');
select ok(not public.is_valid_peruvian_ruc('1234567890'), 'RUC rejects ten digits');
select ok(not public.is_valid_peruvian_ruc('1234567890x'), 'RUC rejects non-digits');
select ok(public.is_free_email_domain(' Person@GMAIL.COM '), 'free email comparison normalizes case and spaces');
select ok(public.is_free_email_domain('x@yahoo.es') and public.is_free_email_domain('x@proton.me')
  and public.is_free_email_domain('x@live.com'), 'common free email variants are rejected');
select ok(not public.is_free_email_domain('x@business.example'), 'a corporate domain is not marked free');
select ok(public.is_valid_verification_url(' HTTPS://example.com/contact '), 'HTTPS URL is accepted');
select ok(not public.is_valid_verification_url('https://user:pass@example.com'), 'URL credentials are rejected');
select ok(not public.is_valid_verification_url('javascript:evil'), 'script URL is rejected');
select ok(public.is_valid_verification_url('https://www.linkedin.com/company/example', true), 'LinkedIn subdomain accepted');
select ok(not public.is_valid_verification_url('https://linkedin.com.evil.test/company/example', true), 'lookalike LinkedIn domain rejected');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
 ('a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'verification-admin@example.test', '', now(), '{}', '{"full_name":"Admin","role":"company"}'),
 ('a1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'verification-company@example.test', '', now(), '{}', '{"full_name":"Empresa","role":"company"}'),
 ('a1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'verification-other@example.test', '', now(), '{}', '{"full_name":"Otra","role":"company"}'),
 ('a1000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'verification-freelancer@example.test', '', now(), '{}', '{"full_name":"Freelancer","role":"freelancer"}');
insert into public.company_profiles(user_id, company_name, industry, country_code) values
 ('a1000000-0000-4000-8000-000000000002', 'Empresa', 'Servicios', 'PE'),
 ('a1000000-0000-4000-8000-000000000003', 'Otra', 'Servicios', 'ES');
insert into public.admins(user_id) values ('a1000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.get_my_company_verification()->>'status', 'not_requested', 'no request is represented explicitly');
select throws_ok($$select public.submit_company_verification('{"legal_name":"Empresa SAC","tax_id":"12345678901","corporate_email":"x@gmail.com"}')$$,
  '22023', 'invalid verification data', 'free email alone is not accepted');
select throws_ok($$select public.submit_company_verification('{"legal_name":"Empresa SAC","tax_id":"123","website_url":"https://empresa.test"}')$$,
  '22023', 'invalid verification data', 'Peruvian tax ID requires eleven digits');
select is(public.submit_company_verification('{"legal_name":" Empresa SAC ","tax_id":"12345678901","corporate_email":" CONTACTO@EMPRESA.TEST ","linkedin_url":" HTTPS://LINKEDIN.COM/company/Empresa "}')->>'status',
  'pending', 'company submits a request');
select is(public.get_my_company_verification()->>'corporate_email', 'contacto@empresa.test', 'email is normalized');
select is(public.get_my_company_verification()->>'linkedin_url', 'https://linkedin.com/company/Empresa', 'URL scheme and host are normalized without changing the path');
select is(public.get_my_company_verification()->>'legal_name', 'Empresa SAC', 'own legal name is available');
select throws_ok('select * from public.company_verifications', '42501', null, 'company cannot read verification table directly');
reset role;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.admin_reject_company('a1000000-0000-4000-8000-000000000002', public.test_ver('a1000000-0000-4000-8000-000000000002'), 'mal')$$,
  '22023', 'invalid rejection reason', 'rejection requires at least five characters');
select is((select tax_id from public.admin_list_verification_requests('pending') where company_user_id = 'a1000000-0000-4000-8000-000000000002'), '12345678901', 'admin can read fiscal data via authorized RPC');
select lives_ok($$select public.admin_reject_company('a1000000-0000-4000-8000-000000000002', public.test_ver('a1000000-0000-4000-8000-000000000002'), 'Datos incompletos')$$, 'admin rejects with a reason');
select throws_ok($$select public.admin_verify_company('a1000000-0000-4000-8000-000000000002', public.test_ver('a1000000-0000-4000-8000-000000000002'))$$,
  '22023', 'invalid verification transition', 'admin cannot approve a rejected request before resubmission');
reset role;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.get_my_company_verification()->>'rejection_reason', 'Datos incompletos', 'rejection reason is visible to its company');
select is(public.submit_company_verification('{"legal_name":"Empresa SAC","tax_id":"12345678901","website_url":"https://empresa.test"}')->>'status', 'pending', 'rejected company can resubmit');
select is(public.get_my_company_verification()->>'rejection_reason', null::text, 'resubmitting clears rejection reason');
reset role;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.admin_verify_company('a1000000-0000-4000-8000-000000000002', public.test_ver('a1000000-0000-4000-8000-000000000002'))$$, 'admin verifies pending company');
select lives_ok($$select public.admin_verify_company('a1000000-0000-4000-8000-000000000002', public.test_ver('a1000000-0000-4000-8000-000000000002'))$$, 'repeated verify is idempotent');
reset role;
select is((select count(*) from public.admin_actions where action = 'verify_company' and target_id = 'a1000000-0000-4000-8000-000000000002'), 1::bigint, 'idempotent verify does not add audit noise');
set local role authenticated;
select lives_ok($$select public.admin_undo_company_verification('a1000000-0000-4000-8000-000000000002')$$, 'admin can immediately undo verification');
select lives_ok($$select public.admin_undo_company_verification('a1000000-0000-4000-8000-000000000002')$$, 'repeated undo is an idempotent no-op');
select lives_ok($$select public.admin_verify_company('a1000000-0000-4000-8000-000000000002', public.test_ver('a1000000-0000-4000-8000-000000000002'))$$, 'admin can approve again after undo');
reset role;
update public.admin_actions set created_at = pg_catalog.clock_timestamp() - interval '9 seconds'
  where id = (select max(id) from public.admin_actions where action = 'verify_company');
set local role authenticated;
select throws_ok($$select public.admin_undo_company_verification('a1000000-0000-4000-8000-000000000002')$$,
  '22023', 'verification undo expired', 'undo expires after eight seconds');
reset role;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.get_my_company_verification()->>'status', 'verified', 'company sees verified status');
select throws_ok($$select public.submit_company_verification('{"legal_name":"Empresa SAC","tax_id":"12345678901","website_url":"https://empresa.test"}')$$,
  '22023', 'verified company cannot resubmit', 'verified company cannot resubmit');
reset role;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select throws_ok('select * from public.company_verifications', '42501', null, 'another company cannot read fiscal data');
select is(public.submit_company_verification('{"legal_name":"Otra SL","tax_id":"ABCD1234","website_url":"https://otra.test"}')->>'status', 'pending', 'foreign tax ID accepts text');
select public.submit_company_verification('{"legal_name":"Otra SL","tax_id":"ABCD1234","website_url":"https://otra.test"}');
select public.submit_company_verification('{"legal_name":"Otra SL","tax_id":"ABCD1234","website_url":"https://otra.test"}');
select public.submit_company_verification('{"legal_name":"Otra SL","tax_id":"ABCD1234","website_url":"https://otra.test"}');
select public.submit_company_verification('{"legal_name":"Otra SL","tax_id":"ABCD1234","website_url":"https://otra.test"}');
select throws_ok($$select public.submit_company_verification('{"legal_name":"Otra SL","tax_id":"ABCD1234","website_url":"https://otra.test"}')$$,
  '54000', 'rate limit exceeded', 'sixth verification request hits the five-per-day quota');
reset role;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select throws_ok('select * from public.company_verifications', '42501', null, 'freelancer cannot read fiscal data');
reset role;
set local role anon;
select throws_ok('select * from public.company_verifications', '42501', null, 'anon cannot read fiscal data');
select throws_ok('select public.get_my_company_verification()', '42501', null, 'anon cannot call the own-verification RPC');
select * from finish();
rollback;
