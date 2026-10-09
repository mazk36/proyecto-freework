begin;

select plan(27);

set local role anon;
select throws_ok(
  'select * from public.business_problems',
  '42501', null,
  'anonymous users cannot read business problem rows directly'
);
select throws_ok(
  'select public.get_my_company_problems()',
  '42501', null,
  'anonymous users cannot call private company RPCs'
);
reset role;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'company-one@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Uno","role":"company"}'),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'company-two@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Dos","role":"company"}'),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'freelancer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Freelancer","role":"freelancer"}');

insert into public.company_profiles (user_id, company_name, industry, country_code)
values
  ('00000000-0000-4000-8000-000000000001', 'Empresa Uno', 'Comercio', 'PE'),
  ('00000000-0000-4000-8000-000000000002', 'Empresa Dos', 'Salud', 'PE');

insert into public.business_problems (
  id, company_user_id, status, title, description, industry_snapshot,
  objectives, budget_choice, currency, deadline_choice, reviewed_and_consented,
  show_company_name, special_conditions, published_at
) values (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'open', 'Problema empresarial de ejemplo',
  'Descripción suficientemente extensa para una publicación de prueba real.',
  'Comercio', array['save_time'], 'unknown', 'PEN', 'flexible', true,
  false, 'dato privado de prueba', now()
), (
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  'paused', 'Publicación de la otra empresa',
  'Descripción privada de la publicación en pausa.',
  'Salud', array['reduce_errors'], 'unknown', 'PEN', 'flexible', true,
  true, '', null
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  'select public.get_my_company_problems()',
  '42501', null,
  'an authenticated session without a user id cannot access company data'
);
select throws_ok(
  'select * from public.business_problems',
  '42501', null,
  'authenticated clients cannot bypass the database functions'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select role::text from public.app_users where id = auth.uid()),
  'freelancer',
  'the database retains the role created for the signed-in account'
);
select throws_ok(
  $$update public.app_users set role = 'company' where id = auth.uid()$$,
  '42501', null,
  'a signed-in user cannot change their role through the database API'
);
select throws_ok(
  $$select public.save_business_problem_draft(null, '{"title":"Intento","description":"Intento de escritura"}'::jsonb)$$,
  '42501', null,
  'a freelancer cannot create company publications'
);
select is(
  public.list_open_business_problems() -> 0 ->> 'company_name',
  null::text,
  'the public feed does not reveal a company name when the owner hides it'
);
select ok(
  not (public.list_open_business_problems() -> 0 ? 'special_conditions'),
  'the public feed omits private business context'
);
select ok(
  not exists (
    select 1 from jsonb_array_elements(public.list_open_business_problems()) as item
    where item ->> 'id' = '10000000-0000-4000-8000-000000000002'
  ),
  'paused problems are not available to freelancers'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  public.save_business_problem_draft(
    '20000000-0000-4000-8000-000000000001',
    '{"title":"Atrasos en los pedidos del local","description":"Actualmente registramos pedidos de clientes en hojas separadas y se pierden varias horas de trabajo cada semana.","impacts":["time"],"locations_count":2,"people_affected":8,"current_process":"Registro manual","current_tools":"Hojas de cálculo","special_conditions":"","objectives":["save_time"],"success_criteria":"Atender el mismo día","budget_choice":"unknown","deadline_choice":"flexible","current_step":3,"show_company_name":false,"reviewed_and_consented":true}'::jsonb
  )::text,
  '20000000-0000-4000-8000-000000000001',
  'a company can create a server-persisted draft'
);
select is(
  public.get_my_company_problem('20000000-0000-4000-8000-000000000001') ->> 'current_step',
  '3',
  'a saved draft restores the current wizard step'
);
select is(
  public.get_my_company_problem('20000000-0000-4000-8000-000000000001') ->> 'budget_choice',
  'unknown',
  'an unknown budget is saved as a valid answer'
);
select is(
  public.publish_business_problem('20000000-0000-4000-8000-000000000001')::text,
  '20000000-0000-4000-8000-000000000001',
  'a valid reviewed draft can be published'
);
select is(
  public.publish_business_problem('20000000-0000-4000-8000-000000000001')::text,
  '20000000-0000-4000-8000-000000000001',
  'repeating publish returns the same publication'
);
select is(
  jsonb_array_length(public.get_my_company_problems()),
  2,
  'repeating publish does not create a duplicate record'
);
select is(
  public.save_business_problem_draft(
    '20000000-0000-4000-8000-000000000002',
    '{"title":"Corto","description":"Breve","objectives":[],"budget_choice":"","deadline_choice":"","current_step":1}'::jsonb
  )::text,
  '20000000-0000-4000-8000-000000000002',
  'a company can keep an incomplete private draft'
);
select throws_ok(
  $$select public.publish_business_problem('20000000-0000-4000-8000-000000000002')$$,
  '22023', null,
  'invalid fields cannot be published by bypassing the frontend'
);
select is(
  public.transition_business_problem('20000000-0000-4000-8000-000000000001', 'pause')::text,
  '20000000-0000-4000-8000-000000000001',
  'a company can pause its own open publication'
);
select is(
  public.get_my_company_problem('20000000-0000-4000-8000-000000000001') ->> 'status',
  'paused',
  'the paused status is persisted'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select ok(
  not exists (
    select 1 from jsonb_array_elements(public.list_open_business_problems()) as item
    where item ->> 'id' = '20000000-0000-4000-8000-000000000001'
  ),
  'paused publications no longer appear in the freelancer feed'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  public.transition_business_problem('20000000-0000-4000-8000-000000000001', 'resume')::text,
  '20000000-0000-4000-8000-000000000001',
  'a company can resume its own paused publication'
);
select is(
  public.transition_business_problem('20000000-0000-4000-8000-000000000001', 'close')::text,
  '20000000-0000-4000-8000-000000000001',
  'a company can close its own publication'
);
select is(
  public.get_my_company_problem('20000000-0000-4000-8000-000000000001') ->> 'status',
  'closed',
  'the closed status is persisted'
);
select throws_ok(
  $$select public.transition_business_problem('20000000-0000-4000-8000-000000000001', 'resume')$$,
  '22023', null,
  'a closed publication cannot be reopened'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(
  public.get_my_company_problem('20000000-0000-4000-8000-000000000001'),
  null::jsonb,
  'one company cannot read another company''s problem'
);
select throws_ok(
  $$select public.save_business_problem_draft('20000000-0000-4000-8000-000000000001', '{"title":"Intento de edición","description":"Intento de editar una publicación de otra empresa."}'::jsonb)$$,
  '42501', null,
  'one company cannot edit another company''s problem'
);

select * from finish();
rollback;
