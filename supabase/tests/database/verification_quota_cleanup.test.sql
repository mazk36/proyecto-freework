begin;
select no_plan();
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
 ('d1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'purge-one@example.test', '', now(), '{}', '{"full_name":"Uno","role":"freelancer"}'),
 ('d1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'purge-two@example.test', '', now(), '{}', '{"full_name":"Dos","role":"freelancer"}');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
update public.rate_limit_policies set max_events = 1000 where action = 'problem_interaction';
insert into public.rate_limit_events(user_id, action, created_at)
select 'd1000000-0000-4000-8000-000000000001', 'problem_interaction', pg_catalog.clock_timestamp() - interval '3 hours'
from pg_catalog.generate_series(1, 60);
insert into public.rate_limit_events(user_id, action, created_at) values
 ('d1000000-0000-4000-8000-000000000001', 'problem_interaction', pg_catalog.clock_timestamp() - interval '90 minutes'),
 ('d1000000-0000-4000-8000-000000000001', 'company_interaction', pg_catalog.clock_timestamp() - interval '3 hours'),
 ('d1000000-0000-4000-8000-000000000002', 'problem_interaction', pg_catalog.clock_timestamp() - interval '3 hours');
select public.enforce_rate_limit('problem_interaction');
select is((select count(*) from public.rate_limit_events where user_id = 'd1000000-0000-4000-8000-000000000001' and action = 'problem_interaction' and created_at < now() - interval '2 hours'), 35::bigint, 'one call purges at most 25 stale events for this user/action');
select is((select count(*) from public.rate_limit_events where user_id = 'd1000000-0000-4000-8000-000000000001' and action = 'problem_interaction' and created_at between now() - interval '2 hours' and now() - interval '1 hour'), 1::bigint, 'one extra policy window is retained');
select is((select count(*) from public.rate_limit_events where user_id = 'd1000000-0000-4000-8000-000000000001' and action = 'company_interaction'), 1::bigint, 'another action is not removed by targeted cleanup');
select is((select count(*) from public.rate_limit_events where user_id = 'd1000000-0000-4000-8000-000000000002' and action = 'problem_interaction'), 1::bigint, 'another user is not affected');
select public.enforce_rate_limit('problem_interaction');
select public.enforce_rate_limit('problem_interaction');
select is((select count(*) from public.rate_limit_events where user_id = 'd1000000-0000-4000-8000-000000000001' and action = 'problem_interaction' and created_at < now() - interval '2 hours'), 0::bigint, 'successive calls drain the bounded backlog');
select is((select max_events from public.rate_limit_policies where action = 'company_verification_submit'), 5, 'verification limit defaults to five');
select is((select window_seconds from public.rate_limit_policies where action = 'company_verification_submit'), 86400, 'verification quota uses a one-day window');
select * from finish();
rollback;
