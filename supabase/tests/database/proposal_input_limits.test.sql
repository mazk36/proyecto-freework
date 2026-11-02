begin;

select plan(52);

create temporary table proposal_limit_cases (field_name text, max_chars integer);
insert into proposal_limit_cases (field_name, max_chars) values
  ('diagnosis', 5000),
  ('solution', 5000),
  ('deliverables', 5000),
  ('timeline', 300),
  ('recurring_costs', 2000),
  ('maintenance_warranty', 2000),
  ('related_experience', 2000);
grant select on proposal_limit_cases to authenticated;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('09000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'limits-company@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa","role":"company"}'),
  ('09000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'limits-freelancer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Profesional","role":"freelancer"}');

insert into public.business_problems (id, company_user_id, status) values
  ('19000000-0000-4000-8000-000000000001', '09000000-0000-4000-8000-000000000001', 'open');

select throws_ok(
  pg_catalog.format(
    'insert into public.proposals (problem_id, freelancer_id, %I) values (%L::uuid, %L::uuid, pg_catalog.repeat(%L, %s))',
    field_name, '19000000-0000-4000-8000-000000000001', '09000000-0000-4000-8000-000000000002', 'x', max_chars + 1
  ),
  '23514', null, 'the table independently rejects an overlong ' || field_name
)
from proposal_limit_cases order by field_name;

set local role authenticated;
select set_config('request.jwt.claim.sub', '09000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"09000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select throws_ok(
  pg_catalog.format(
    'select public.save_proposal_draft(%L::uuid, pg_catalog.jsonb_build_object(%L, pg_catalog.repeat(%L, %s)))',
    '19000000-0000-4000-8000-000000000001', field_name, 'x', max_chars + 1
  ),
  '22023', 'proposal field too long', 'creating a draft rejects an overlong ' || field_name
)
from proposal_limit_cases order by field_name;

select throws_ok(
  pg_catalog.format(
    'select public.save_proposal_draft(%L::uuid, pg_catalog.jsonb_build_object(%L, %s::numeric))',
    '19000000-0000-4000-8000-000000000001', 'price', price
  ),
  '22023', 'invalid proposal price', 'creating a draft rejects price ' || price::text
)
from (values (0.004::numeric), (10000000000::numeric), (-0.01::numeric), (1.001::numeric)) as invalid_prices(price);

select is((select count(*) from public.proposals), 0::bigint, 'invalid input creates no proposal');

select set_config(
  'test.proposal_limits_id',
  public.save_proposal_draft(
    '19000000-0000-4000-8000-000000000001',
    pg_catalog.jsonb_build_object(
      'diagnosis', pg_catalog.repeat('😀', 5000),
      'solution', pg_catalog.repeat('😀', 5000),
      'deliverables', pg_catalog.repeat('😀', 5000),
      'timeline', pg_catalog.repeat('😀', 300),
      'recurring_costs', pg_catalog.repeat('😀', 2000),
      'maintenance_warranty', pg_catalog.repeat('😀', 2000),
      'related_experience', pg_catalog.repeat('😀', 2000),
      'price', 125.50
    )
  )::text, true
);

select is(
  pg_catalog.char_length(pg_catalog.to_jsonb(p) ->> field_name), max_chars,
  'the exact character limit is stored for ' || field_name
)
from public.proposals p cross join proposal_limit_cases
where p.id = current_setting('test.proposal_limits_id')::uuid
order by field_name;
select is((select price from public.proposals), 125.50::numeric, 'price 125.50 is stored without rounding');

select throws_ok(
  pg_catalog.format(
    'select public.save_proposal_draft(%L::uuid, pg_catalog.jsonb_build_object(%L, current_setting(%L), %L, pg_catalog.repeat(%L, %s)))',
    '19000000-0000-4000-8000-000000000001', 'id', 'test.proposal_limits_id', field_name, 'x', max_chars + 1
  ),
  '22023', 'proposal field too long', 'updating a draft rejects an overlong ' || field_name
)
from proposal_limit_cases order by field_name;

select is(
  pg_catalog.char_length(pg_catalog.to_jsonb(p) ->> field_name), max_chars,
  'a rejected update preserves ' || field_name
)
from public.proposals p cross join proposal_limit_cases
where p.id = current_setting('test.proposal_limits_id')::uuid
order by field_name;

select throws_ok(
  $$select public.save_proposal_draft('19000000-0000-4000-8000-000000000001', pg_catalog.jsonb_build_object('id', current_setting('test.proposal_limits_id'), 'diagnosis', pg_catalog.repeat('x', 5000) || ' '))$$,
  '22023', 'proposal field too long', 'input is checked before trimming'
);
select throws_ok(
  $$select public.save_proposal_draft('19000000-0000-4000-8000-000000000001', pg_catalog.jsonb_build_object('id', current_setting('test.proposal_limits_id'), 'solution', 'Cambio', 'price', 0.004))$$,
  '22023', 'invalid proposal price', 'an update rejects a price with more than two decimals'
);
select is((select solution from public.proposals), pg_catalog.repeat('😀', 5000), 'an invalid price does not change other fields');

select is(
  public.save_proposal_draft('19000000-0000-4000-8000-000000000001', pg_catalog.jsonb_build_object('id', current_setting('test.proposal_limits_id'), 'price', 9999999999.99))::text,
  current_setting('test.proposal_limits_id'), 'the maximum representable price is accepted'
);
select is((select price from public.proposals), 9999999999.99::numeric, 'the maximum price is stored exactly');
select throws_ok(
  $$select public.save_proposal_draft('19000000-0000-4000-8000-000000000001', pg_catalog.jsonb_build_object('id', current_setting('test.proposal_limits_id'), 'price', 10000000000))$$,
  '22023', 'invalid proposal price', 'an update rejects a price above the maximum'
);
select is((select price from public.proposals), 9999999999.99::numeric, 'a rejected price leaves the stored price unchanged');
select is(
  public.save_proposal_draft('19000000-0000-4000-8000-000000000001', pg_catalog.jsonb_build_object('id', current_setting('test.proposal_limits_id'), 'price', null))::text,
  current_setting('test.proposal_limits_id'), 'a draft price can still be cleared'
);
select is((select price from public.proposals), null::numeric, 'a null price is stored in a draft');
select is(
  public.save_proposal_draft('19000000-0000-4000-8000-000000000001', pg_catalog.jsonb_build_object('id', current_setting('test.proposal_limits_id'), 'price', 125.50))::text,
  current_setting('test.proposal_limits_id'), 'an update accepts price 125.50'
);
select is((select price from public.proposals), 125.50::numeric, 'an updated price of 125.50 is stored exactly');

select * from finish();
rollback;
