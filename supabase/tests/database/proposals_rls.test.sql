begin;

select plan(74);

set local role anon;
select throws_ok(
  'select * from public.proposals', '42501', null,
  'anonymous users cannot read proposals'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  '42501', null, 'anonymous users cannot save proposal drafts'
);
select throws_ok(
  $$select public.submit_proposal('20000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anonymous users cannot submit proposals'
);
select throws_ok(
  $$select public.withdraw_proposal('20000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anonymous users cannot withdraw proposals'
);
reset role;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'company-one@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Uno","role":"company"}'),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'company-two@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Dos","role":"company"}'),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'freelancer-one@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Freelancer Uno","role":"freelancer"}'),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'freelancer-two@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Freelancer Dos","role":"freelancer"}');

insert into public.business_problems (id, company_user_id, status) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'open'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'open'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'draft'),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'paused'),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'closed');

select throws_ok(
  $$insert into public.proposals (problem_id, freelancer_id, currency) values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'EUR')$$,
  '23514', null, 'the table constraint independently rejects unsupported currencies'
);
select throws_ok(
  $$insert into public.proposals (problem_id, freelancer_id, price) values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', -1)$$,
  '23514', null, 'the table constraint independently rejects negative prices'
);
select throws_ok(
  $$insert into public.proposals (problem_id, freelancer_id, price) values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'NaN')$$,
  '23514', null, 'the table constraint independently rejects NaN prices'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
select is((select count(*) from public.proposals), 0::bigint, 'a session without a user id cannot see proposals');
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  '42501', null, 'a session without a user id cannot save a proposal'
);
select throws_ok(
  $$select public.submit_proposal('20000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'a session without a user id cannot submit a proposal'
);
select throws_ok(
  $$select public.withdraw_proposal('20000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'a session without a user id cannot withdraw a proposal'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000003', '{}'::jsonb)$$,
  '22023', null, 'a draft problem does not accept proposals'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000004', '{}'::jsonb)$$,
  '22023', null, 'a paused problem does not accept proposals'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000005', '{}'::jsonb)$$,
  '22023', null, 'a closed problem does not accept proposals'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000099', '{}'::jsonb)$$,
  '22023', null, 'a nonexistent problem does not accept proposals'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{"id":"20000000-0000-4000-8000-000000000099"}'::jsonb)$$,
  '42501', null, 'a nonexistent draft cannot be edited'
);
select throws_ok(
  $$select public.submit_proposal('20000000-0000-4000-8000-000000000099')$$,
  '42501', null, 'a nonexistent proposal cannot be submitted'
);
select throws_ok(
  $$select public.withdraw_proposal('20000000-0000-4000-8000-000000000099')$$,
  '42501', null, 'a nonexistent proposal cannot be withdrawn'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{"currency":"EUR"}'::jsonb)$$,
  '22023', null, 'unsupported currencies are rejected'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{"currency":null}'::jsonb)$$,
  '22023', null, 'an explicit null currency is rejected'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{"price":-0.001}'::jsonb)$$,
  '22023', null, 'negative prices are rejected before numeric rounding'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{"price":"NaN"}'::jsonb)$$,
  '22023', null, 'a non-numeric price is rejected'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{"freelancer_id":"00000000-0000-4000-8000-000000000004"}'::jsonb)$$,
  '22023', null, 'clients cannot choose the proposal owner'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{"status":"submitted"}'::jsonb)$$,
  '22023', null, 'clients cannot choose a proposal status'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{"id":"not-a-uuid"}'::jsonb)$$,
  '22023', null, 'an invalid draft id is rejected'
);

select set_config(
  'test.proposal_id',
  public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{}'::jsonb)::text,
  true
);
select is((select count(*) from public.proposals), 1::bigint, 'the author can read their draft');
select is((select currency from public.proposals), 'PEN', 'a draft defaults to PEN');
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  '23505', null, 'a second active proposal for the same problem is rejected'
);
select throws_ok(
  $$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$,
  '22023', null, 'an incomplete draft cannot be submitted'
);
select throws_ok(
  $$update public.proposals set diagnosis = 'Direct update'$$,
  '42501', null, 'the author cannot update proposals directly'
);
select throws_ok(
  $$insert into public.proposals (problem_id, freelancer_id) values ('10000000-0000-4000-8000-000000000002', auth.uid())$$,
  '42501', null, 'the author cannot insert proposals directly'
);
select throws_ok(
  $$delete from public.proposals$$,
  '42501', null, 'the author cannot delete proposals directly'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.proposals), 0::bigint, 'the company cannot read an unsubmitted draft');
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  '42501', null, 'a company cannot create a proposal'
);
select throws_ok(
  $$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$,
  '42501', null, 'a company cannot submit a proposal'
);
select throws_ok(
  $$select public.withdraw_proposal(current_setting('test.proposal_id')::uuid)$$,
  '42501', null, 'a company cannot withdraw a proposal'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.proposals), 0::bigint, 'another freelancer cannot read the draft');
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'diagnosis', 'Other'))$$,
  '42501', null, 'another freelancer cannot edit the draft'
);
select throws_ok(
  $$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$,
  '42501', null, 'another freelancer cannot submit the draft'
);
select throws_ok(
  $$select public.withdraw_proposal(current_setting('test.proposal_id')::uuid)$$,
  '42501', null, 'another freelancer cannot withdraw the draft'
);
select set_config(
  'test.other_proposal_id',
  public.save_proposal_draft(
    '10000000-0000-4000-8000-000000000001',
    '{"diagnosis":"Diagnóstico dos","solution":"Solución dos","deliverables":"Entrega dos","timeline":"Dos semanas","price":400,"currency":"USD"}'::jsonb
  )::text, true
);
select is(
  public.submit_proposal(current_setting('test.other_proposal_id')::uuid)::text,
  current_setting('test.other_proposal_id'),
  'another freelancer can submit their own proposal for the same problem'
);
select set_config(
  'test.other_company_proposal_id',
  public.save_proposal_draft(
    '10000000-0000-4000-8000-000000000002',
    '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb
  )::text, true
);
select is(
  public.submit_proposal(current_setting('test.other_company_proposal_id')::uuid)::text,
  current_setting('test.other_company_proposal_id'),
  'a freelancer can submit a proposal for a different problem'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.proposals), 1::bigint, 'an author cannot read another freelancer’s submitted proposal');
select is(
  public.save_proposal_draft(
    '10000000-0000-4000-8000-000000000001',
    jsonb_build_object('id', current_setting('test.proposal_id'), 'diagnosis', 'Diagnóstico', 'solution', 'Solución', 'deliverables', 'Entrega', 'timeline', 'Tres semanas', 'price', 0, 'currency', 'USD')
  )::text,
  current_setting('test.proposal_id'),
  'the author can update their draft, including a zero price and USD'
);
select public.save_proposal_draft(
  '10000000-0000-4000-8000-000000000001',
  jsonb_build_object('id', current_setting('test.proposal_id'), 'recurring_costs', 'Sin costos recurrentes')
);
select is((select solution from public.proposals), 'Solución', 'a partial draft update preserves omitted fields');
select is((select price from public.proposals), 0.00::numeric, 'the price is stored without currency conversion');
select is((select currency from public.proposals), 'USD', 'USD remains the explicitly selected currency');

select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'diagnosis', ' '));
select throws_ok($$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'diagnosis is required to submit');
select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'diagnosis', E'\n\t'));
select throws_ok($$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'newlines and tabs alone do not satisfy a required field');
select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'diagnosis', 'Diagnóstico', 'solution', ''));
select throws_ok($$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'solution is required to submit');
select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'solution', 'Solución', 'deliverables', ''));
select throws_ok($$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'deliverables are required to submit');
select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'deliverables', 'Entrega', 'timeline', ''));
select throws_ok($$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'timeline is required to submit');
select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'timeline', 'Tres semanas', 'price', null));
select throws_ok($$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'price is required to submit');
select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'price', 125.50));

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.transition_business_problem('10000000-0000-4000-8000-000000000001', 'pause');
select is((select count(*) from public.proposals), 1::bigint, 'the company retains access to already submitted proposals when paused');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'solution', 'Cambio'))$$,
  '22023', null, 'a draft cannot be edited while the problem is paused'
);
select throws_ok($$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'a proposal cannot be submitted while the problem is paused');
select throws_ok($$select public.withdraw_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'a proposal cannot be withdrawn while the problem is paused');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.transition_business_problem('10000000-0000-4000-8000-000000000001', 'resume');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  public.submit_proposal(current_setting('test.proposal_id')::uuid)::text,
  current_setting('test.proposal_id'), 'the author can submit a complete proposal'
);
select ok((select submitted_at is not null from public.proposals), 'submission records the submission time');
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'solution', 'Cambio'))$$,
  '22023', null, 'submitted proposals cannot be edited as drafts'
);
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  '23505', null, 'a submitted proposal also prevents a second active proposal'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.proposals), 2::bigint, 'the owner company can read both submitted proposals');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.proposals), 1::bigint, 'another company sees only the proposal for its own problem');
select is(
  (select problem_id::text from public.proposals), '10000000-0000-4000-8000-000000000002',
  'a company cannot read proposals submitted to a different company'
);
select throws_ok(
  $$update public.proposals set status = 'withdrawn'$$,
  '42501', null, 'a company cannot update proposal rows directly'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  public.withdraw_proposal(current_setting('test.proposal_id')::uuid)::text,
  current_setting('test.proposal_id'), 'the author can withdraw a submitted proposal'
);
select is((select status from public.proposals), 'withdrawn', 'the author retains access to the withdrawn proposal');
select ok((select submitted_at is not null from public.proposals), 'withdrawing preserves the submission timestamp');
select throws_ok($$select public.withdraw_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'an already withdrawn proposal cannot be withdrawn again');
select throws_ok($$select public.submit_proposal(current_setting('test.proposal_id')::uuid)$$, '22023', null, 'a withdrawn proposal cannot be submitted again');
select throws_ok(
  $$select public.save_proposal_draft('10000000-0000-4000-8000-000000000001', jsonb_build_object('id', current_setting('test.proposal_id'), 'solution', 'Cambio'))$$,
  '22023', null, 'a withdrawn proposal cannot be edited as a draft'
);
select set_config(
  'test.replacement_id',
  public.save_proposal_draft('10000000-0000-4000-8000-000000000001', '{}'::jsonb)::text,
  true
);
select is((select count(*) from public.proposals), 2::bigint, 'a withdrawn proposal permits a new draft and preserves history');
select is(
  public.withdraw_proposal(current_setting('test.replacement_id')::uuid)::text,
  current_setting('test.replacement_id'), 'the author can also withdraw a draft'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.proposals), 1::bigint, 'the company no longer sees withdrawn proposals');

select * from finish();
rollback;
