begin;

select plan(90);

-- Unauthenticated users cannot read either table or execute any RPC.
set local role anon;
select throws_ok('select * from public.messages', '42501', null, 'anon cannot read messages');
select throws_ok('select * from public.conversation_reads', '42501', null, 'anon cannot read read markers');
select throws_ok($$select public.send_message(null, 'hola')$$, '42501', null, 'anon cannot send');
select throws_ok('select * from public.list_conversations()', '42501', null, 'anon cannot list conversations');
select throws_ok('select * from public.list_messages(null)', '42501', null, 'anon cannot list messages');
select throws_ok('select public.mark_conversation_read(null)', '42501', null, 'anon cannot mark read');
select throws_ok('select public.unread_total()', '42501', null, 'anon cannot count unread messages');
select throws_ok($$insert into public.messages (match_id, sender_id, body) values (null, null, 'x')$$, '42501', null, 'anon cannot insert messages');
select throws_ok('update public.messages set body = body', '42501', null, 'anon cannot update messages');
select throws_ok('delete from public.messages', '42501', null, 'anon cannot delete messages');
select throws_ok('insert into public.conversation_reads (match_id, user_id) values (null, null)', '42501', null, 'anon cannot insert read markers');
select throws_ok('update public.conversation_reads set last_read_at = null', '42501', null, 'anon cannot update read markers');
select throws_ok('delete from public.conversation_reads', '42501', null, 'anon cannot delete read markers');
reset role;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'chat-company@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Uno","role":"company"}'),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'chat-company2@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Dos","role":"company"}'),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'chat-freelancer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Profesional Uno","role":"freelancer"}'),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'chat-freelancer2@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Profesional Dos","role":"freelancer"}');

insert into public.company_profiles (user_id, company_name, industry, country_code) values
  ('00000000-0000-4000-8000-000000000001', 'Empresa Reservada', 'Servicios', 'PE'),
  ('00000000-0000-4000-8000-000000000002', 'Empresa Visible', 'Servicios', 'PE');

insert into public.business_problems (id, company_user_id, status, title, show_company_name) values
  ('12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'closed', 'Título actualizado', false),
  ('12000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'open', 'Segundo problema', true),
  ('12000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'open', 'Otro problema', true);

insert into public.proposals (id, problem_id, freelancer_id, status, submitted_at, problem_title_snapshot) values
  ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'submitted', now(), 'Título original'),
  ('22000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004', 'submitted', now(), 'Segundo original'),
  ('22000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', 'submitted', now(), 'Otro original');

insert into public.matches (id, problem_id, proposal_id, company_user_id, freelancer_id) values
  ('32000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'),
  ('32000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004'),
  ('32000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000003', '22000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004');

select ok(
  not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
  or exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'),
  'messages belongs to the Realtime publication when it exists'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
select is((select count(*) from public.messages), 0::bigint, 'a session without a user sees no messages');
select is((select count(*) from public.conversation_reads), 0::bigint, 'a session without a user sees no read markers');
select throws_ok('select * from public.list_conversations()', '42501', 'not authenticated', 'listing requires an authenticated user');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000001', 'Hola')$$, '42501', 'not authenticated', 'sending requires an authenticated user');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.list_conversations()), 2::bigint, 'company lists only its two matches');
select ok((select problem_title = 'Título original' and counterpart_name = 'Profesional Uno' and counterpart_role = 'freelancer'
  and last_message_body is null and last_message_at is null and last_message_sender_is_me is null and unread_count = 0
  from public.list_conversations() where match_id = '32000000-0000-4000-8000-000000000001'),
  'empty conversation uses the proposal snapshot and permitted freelancer name');
select is((public.send_message('32000000-0000-4000-8000-000000000001', '  Hola  ', '42000000-0000-4000-8000-000000000001')).body, 'Hola', 'company sends trimmed text after the problem closes');
select is((public.send_message('32000000-0000-4000-8000-000000000001', 'distinto', '42000000-0000-4000-8000-000000000001')).body, 'Hola', 'retry returns the original message');
select is((select count(*) from public.messages where match_id = '32000000-0000-4000-8000-000000000001'), 1::bigint, 'retry does not duplicate the message');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000001', '')$$, '22023', 'message body empty', 'empty text is rejected');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000001', '   ')$$, '22023', 'message body empty', 'spaces alone are rejected');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000001', E'\n\t')$$, '22023', 'message body empty', 'other whitespace alone is rejected');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000001', null)$$, '22023', 'message body empty', 'null text is rejected');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000001', repeat('x', 2001))$$, '22023', 'message body too long', 'text over 2000 characters is rejected');
select is(pg_catalog.char_length((public.send_message('32000000-0000-4000-8000-000000000001', repeat('x', 2000))).body), 2000, 'exactly 2000 characters are accepted');
select ok((select pg_catalog.char_length(last_message_body) = 140 and last_message_sender_is_me and unread_count = 0
  from public.list_conversations() where match_id = '32000000-0000-4000-8000-000000000001'), 'conversation preview is limited to 140 and excludes own unread messages');
select is(public.unread_total(), 0, 'own sent messages do not count as unread');
select throws_ok($$insert into public.messages (match_id, sender_id, body) values ('32000000-0000-4000-8000-000000000001', auth.uid(), 'direct')$$, '42501', null, 'company cannot insert messages directly');
select throws_ok($$update public.messages set body = 'changed'$$, '42501', null, 'company cannot update messages directly');
select throws_ok('delete from public.messages', '42501', null, 'company cannot delete messages directly');
select throws_ok($$insert into public.conversation_reads (match_id, user_id) values ('32000000-0000-4000-8000-000000000001', auth.uid())$$, '42501', null, 'company cannot insert read markers directly');
select throws_ok('update public.conversation_reads set last_read_at = null', '42501', null, 'company cannot update read markers directly');
select throws_ok('delete from public.conversation_reads', '42501', null, 'company cannot delete read markers directly');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.messages), 2::bigint, 'matched freelancer can read both messages via RLS');
select ok((select counterpart_name is null and counterpart_role = 'company' and problem_title = 'Título original' and unread_count = 2
  from public.list_conversations() where match_id = '32000000-0000-4000-8000-000000000001'), 'hidden company name remains private and both messages are unread');
select is(public.unread_total(), 2, 'freelancer sees unread total');
select lives_ok($$select public.mark_conversation_read('32000000-0000-4000-8000-000000000001')$$, 'freelancer can mark messages read');
select is(public.unread_total(), 0, 'marking read clears the unread total');
select is((select unread_count from public.list_conversations() where match_id = '32000000-0000-4000-8000-000000000001'), 0, 'marking read clears the conversation count');
select is((select count(*) from public.conversation_reads), 1::bigint, 'freelancer sees only its own read marker');
select is((public.send_message('32000000-0000-4000-8000-000000000001', 'Respuesta', '42000000-0000-4000-8000-000000000001')).body, 'Respuesta', 'freelancer can reply after problem closes');
select is(public.unread_total(), 0, 'a sender does not create unread messages for itself');
select results_eq(
  $$select body from public.list_messages('32000000-0000-4000-8000-000000000001', null, 2)$$,
  $$values (repeat('x', 2000)), ('Respuesta'::text)$$, 'last page is returned in chronological order'
);
select results_eq(
  $$select body from public.list_messages('32000000-0000-4000-8000-000000000001',
    (select min(created_at) from public.list_messages('32000000-0000-4000-8000-000000000001', null, 2)), 2)$$,
  $$values ('Hola'::text)$$, 'before cursor fetches the preceding messages without duplicates'
);
select is((select count(distinct created_at) from public.messages), 3::bigint, 'server messages in a conversation have distinct pagination timestamps');
select throws_ok($$select * from public.list_messages('32000000-0000-4000-8000-000000000001', null, 101)$$, '22023', 'invalid message page size', 'pages over 100 are rejected');
select throws_ok($$select * from public.list_messages('32000000-0000-4000-8000-000000000001', null, 0)$$, '22023', 'invalid message page size', 'zero page size is rejected');
select throws_ok($$insert into public.messages (match_id, sender_id, body) values ('32000000-0000-4000-8000-000000000001', auth.uid(), 'direct')$$, '42501', null, 'freelancer cannot insert messages directly');
select throws_ok('delete from public.conversation_reads', '42501', null, 'freelancer cannot delete read markers directly');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.conversation_reads), 0::bigint, 'company cannot see the freelancer read marker');
select is(public.unread_total(), 1, 'freelancer reply counts as unread for the company');
select lives_ok($$select public.mark_conversation_read('32000000-0000-4000-8000-000000000001')$$, 'company can mark its conversation read');
select is(public.unread_total(), 0, 'company read marker clears its total');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000003', 'hola')$$, '42501', 'conversation not found', 'company cannot send to another match');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000099', 'hola')$$, '42501', 'conversation not found', 'nonexistent match returns the same send error');
select throws_ok($$select * from public.list_messages('32000000-0000-4000-8000-000000000003')$$, '42501', 'conversation not found', 'company cannot list another match');
select throws_ok($$select * from public.list_messages('32000000-0000-4000-8000-000000000099')$$, '42501', 'conversation not found', 'nonexistent match returns the same list error');
select throws_ok($$select public.mark_conversation_read('32000000-0000-4000-8000-000000000003')$$, '42501', 'conversation not found', 'company cannot mark another match read');
select throws_ok($$select public.mark_conversation_read('32000000-0000-4000-8000-000000000099')$$, '42501', 'conversation not found', 'nonexistent match returns the same read error');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((public.send_message('32000000-0000-4000-8000-000000000001', 'Mensaje nuevo')).body, 'Mensaje nuevo', 'new messages can arrive after a read');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.messages where match_id = '32000000-0000-4000-8000-000000000001'), 0::bigint, 'another freelancer cannot read messages of an unrelated match');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000001', 'intruso')$$, '42501', 'conversation not found', 'another freelancer cannot send to an unrelated match');
select throws_ok($$select * from public.list_messages('32000000-0000-4000-8000-000000000001')$$, '42501', 'conversation not found', 'another freelancer cannot list an unrelated match');
select is((select count(*) from public.list_conversations()), 2::bigint, 'another freelancer lists only its own matches');
select ok((select counterpart_name = 'Empresa Visible' and counterpart_role = 'company'
  from public.list_conversations() where match_id = '32000000-0000-4000-8000-000000000003'), 'visible company name is returned to its participant');
select is((public.send_message('32000000-0000-4000-8000-000000000002', 'Otro mensaje')).body, 'Otro mensaje', 'another freelancer can message its own match');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(public.unread_total(), 2, 'unread total sums both conversations');
select is((select sum(unread_count)::integer from public.list_conversations()), 2, 'per-conversation counts agree with the total');
select is((select match_id from public.list_conversations() limit 1), '32000000-0000-4000-8000-000000000002'::uuid, 'latest message orders conversations');
select lives_ok($$select public.mark_conversation_read('32000000-0000-4000-8000-000000000001')$$, 'one conversation can be marked independently');
select is(public.unread_total(), 1, 'marking one conversation preserves other unread messages');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.messages where match_id = '32000000-0000-4000-8000-000000000001'), 0::bigint, 'another company cannot read messages of an unrelated match');
select is((select count(*) from public.conversation_reads), 0::bigint, 'another company cannot read other users markers');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000001', 'intruso')$$, '42501', 'conversation not found', 'another company cannot send to an unrelated match');
select throws_ok($$select * from public.list_messages('32000000-0000-4000-8000-000000000001')$$, '42501', 'conversation not found', 'another company cannot list an unrelated match');
select is((select count(*) from public.list_conversations()), 1::bigint, 'another company lists only its own match');
select lives_ok($$select public.mark_conversation_read('32000000-0000-4000-8000-000000000003')$$, 'an empty conversation can be marked read');
select is((public.send_message('32000000-0000-4000-8000-000000000003', 'Primero', '42000000-0000-4000-8000-000000000003')).body, 'Primero', 'first message for rate-limit test succeeds');
select is((select count(*) from pg_catalog.generate_series(1, 29) n
  cross join lateral public.send_message('32000000-0000-4000-8000-000000000003', 'Mensaje ' || n::text)), 29::bigint, 'remaining 29 messages within the minute succeed');
select throws_ok($$select public.send_message('32000000-0000-4000-8000-000000000003', 'Mensaje 31')$$, 'P0001', 'message rate limit: maximum 30 messages per minute', '31st message in a minute is rejected');
select is((public.send_message('32000000-0000-4000-8000-000000000003', 'reintento', '42000000-0000-4000-8000-000000000003')).body, 'Primero', 'an idempotent retry succeeds even at the rate limit');
select is((select count(*) from public.messages where match_id = '32000000-0000-4000-8000-000000000003'), 30::bigint, 'quota and retry leave exactly 30 messages');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((public.send_message('32000000-0000-4000-8000-000000000003', 'Respuesta independiente', '42000000-0000-4000-8000-000000000003')).body, 'Respuesta independiente', 'each participant has an independent quota and client id namespace');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(public.unread_total(), 1, 'a message after marking an empty conversation read is unread');

-- Historical fixtures exercise the default and maximum page size without consuming quota.
reset role;
insert into public.messages (match_id, sender_id, body, created_at)
select '32000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002',
  'Histórico ' || n::text, now() - interval '2 days' + n * interval '1 second'
from pg_catalog.generate_series(1, 110) n;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.list_messages('32000000-0000-4000-8000-000000000003')), 50::bigint, 'default page contains at most 50 messages');
select is((select count(*) from public.list_messages('32000000-0000-4000-8000-000000000003', null, 100)), 100::bigint, 'maximum page contains 100 messages');

select * from finish();
rollback;
