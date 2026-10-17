begin;

select no_plan();

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'freelancer-one@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Freelancer Uno","role":"freelancer"}'),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'freelancer-two@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Freelancer Dos","role":"freelancer"}'),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'freelancer-draft@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Freelancer Borrador","role":"freelancer"}'),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'company@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa","role":"company"}');

update public.profiles
set is_public = true, slug = case id
  when '00000000-0000-4000-8000-000000000001' then 'freelancer-uno'
  when '00000000-0000-4000-8000-000000000002' then 'freelancer-dos'
  else slug
end
where id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002'
);

update public.freelancer_profiles
set headline = case user_id
  when '00000000-0000-4000-8000-000000000001' then 'Ingeniera de automatización'
  when '00000000-0000-4000-8000-000000000002' then 'Diseñador de producto'
  when '00000000-0000-4000-8000-000000000003' then 'Perfil privado'
end
where user_id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003'
);

insert into public.skills (id, slug, name, category, is_active)
values
  ('30000000-0000-4000-8000-000000000001', 'postgresql', 'PostgreSQL', 'Programación', true),
  ('30000000-0000-4000-8000-000000000002', 'legacy-skill', 'Legacy Skill', 'Programación', false);

insert into public.freelancer_skills (freelancer_user_id, skill_id)
values
  ('00000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001');

insert into public.portfolio_projects (
  id, freelancer_user_id, title, is_published
) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Proyecto publicado', true),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Proyecto borrador', false),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'Proyecto de perfil privado', true),
  ('20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'Otro proyecto publicado', true);

insert into public.portfolio_media (project_id, storage_path, alt_text)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001.webp', 'Imagen pública'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000002.webp', 'Imagen de borrador'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003/20000000-0000-4000-8000-000000000003/40000000-0000-4000-8000-000000000003.webp', 'Imagen de perfil privado'),
  ('20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000004/40000000-0000-4000-8000-000000000004.webp', 'Imagen de otro usuario');

-- Metadata fixtures are transaction-local and do not create binary objects in Storage.
insert into storage.objects (bucket_id, name, metadata)
values
  ('portfolio-media', '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001.webp', '{"mimetype":"image/webp","size":123}'::jsonb),
  ('portfolio-media', '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000002.webp', '{"mimetype":"image/webp","size":123}'::jsonb),
  ('portfolio-media', '00000000-0000-4000-8000-000000000003/20000000-0000-4000-8000-000000000003/40000000-0000-4000-8000-000000000003.webp', '{"mimetype":"image/webp","size":123}'::jsonb),
  ('portfolio-media', '00000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000004/40000000-0000-4000-8000-000000000004.webp', '{"mimetype":"image/webp","size":123}'::jsonb);

select is((select public from storage.buckets where id = 'avatars'), true, 'the avatar bucket is configured as public');
select is((select file_size_limit from storage.buckets where id = 'avatars'), 2097152::bigint, 'avatar size is limited to 2 MB');
select is((select allowed_mime_types from storage.buckets where id = 'avatars'), array['image/jpeg', 'image/png', 'image/webp']::text[], 'avatar bucket allows only image MIME types');
select is((select public from storage.buckets where id = 'portfolio-media'), false, 'the portfolio bucket stays private');
select is((select file_size_limit from storage.buckets where id = 'portfolio-media'), 5242880::bigint, 'portfolio images are limited to 5 MB');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is((select count(*)::integer from public.profiles), 2, 'anonymous readers see only published public profiles');
select is((select count(*)::integer from public.profiles where id = '00000000-0000-4000-8000-000000000003'), 0, 'anonymous readers cannot see a profile draft');
select throws_ok('select * from public.app_users', '42501', null, 'anonymous readers cannot query account identity records');
select throws_ok('select email from auth.users', '42501', null, 'anonymous readers cannot query authentication records');
select throws_ok('select * from public.company_profiles', '42501', null, 'anonymous readers cannot query private company profiles');
select is((select count(*)::integer from public.freelancer_profiles), 2, 'anonymous readers see professional details only for public profiles');
select is((select count(*)::integer from public.skills), 1, 'anonymous readers see catalogue skills associated with public profiles');
select is((select count(*)::integer from public.freelancer_skills), 1, 'anonymous readers see skills linked to public profiles');
select is((select count(*)::integer from public.portfolio_projects), 2, 'anonymous readers see published projects only');
select is((select count(*)::integer from public.portfolio_projects where id = '20000000-0000-4000-8000-000000000003'), 0, 'a published project is hidden while its owner profile is private');
select is((select count(*)::integer from public.portfolio_media), 2, 'anonymous readers see media metadata for public projects only');
select is((select count(*)::integer from storage.objects where bucket_id = 'portfolio-media'), 2, 'private portfolio object metadata is visible only for published projects');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('avatars', '00000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000099.webp', '{"mimetype":"image/webp","size":10}'::jsonb)$$,
  '42501', null, 'anonymous users cannot upload avatars'
);
select throws_ok(
  $$update public.profiles set is_public = false where id = '00000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'anonymous users cannot change profile publication'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::integer from public.profiles where id = auth.uid()), 1, 'an authenticated user can read their own unpublished profile');
select is(public.ensure_my_profile() ->> 'is_public', 'false', 'profile creation does not publish a draft');
select ok(not (public.ensure_my_profile() ? 'email'), 'an own-profile response excludes the authentication email');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(public.ensure_my_profile() ->> 'id', '00000000-0000-4000-8000-000000000001', 'a user can ensure their own profile');
select is(public.ensure_my_profile() ->> 'id', '00000000-0000-4000-8000-000000000001', 'profile creation is idempotent');
select ok(not (public.ensure_my_profile() ? 'email'), 'the profile contract does not include an authentication email');
select is((select count(*)::integer from public.profiles where id = auth.uid()), 1, 'ensure does not create duplicate profile rows');
select is((select count(*)::integer from public.profiles where id = '00000000-0000-4000-8000-000000000003'), 0, 'a user cannot read another user draft');
select is(public.save_my_profile('{"display_name":"Nombre actualizado","slug":"nombre-actualizado"}'::jsonb) ->> 'display_name', 'Nombre actualizado', 'a user can update their own public fields');
select throws_ok(
  $$update public.profiles set account_type = 'company' where id = auth.uid()$$,
  '42501', null, 'profile columns cannot be updated directly'
);
select throws_ok(
  $$insert into public.profiles (id, account_type, display_name, slug) values ('00000000-0000-4000-8000-000000000002', 'freelancer', 'Nuevo', 'nuevo-perfil')$$,
  '42501', null, 'users cannot create profile rows for any account through direct table access'
);
select throws_ok(
  $$update public.profiles set display_name = 'Cambio ajeno' where id = '00000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'users cannot edit another profile through direct table access'
);
select throws_ok(
  $$select public.save_my_profile('{"account_type":"company"}'::jsonb)$$,
  '22023', null, 'account type is not accepted by the profile update RPC'
);
select throws_ok(
  $$select public.save_my_profile('{"user_id":"00000000-0000-4000-8000-000000000002"}'::jsonb)$$,
  '22023', null, 'owner identity is not accepted by the profile update RPC'
);
select throws_ok(
  $$select public.save_my_profile('{"slug":"freelancer-dos"}'::jsonb)$$,
  '23505', null, 'profile slugs remain unique'
);
select is(public.save_my_profile('{"is_public":false}'::jsonb) ->> 'is_public', 'false', 'a profile owner can explicitly unpublish their profile');
select is(public.save_my_profile('{"is_public":true}'::jsonb) ->> 'is_public', 'true', 'a profile owner can explicitly publish their profile');
select throws_ok(
  $$update public.app_users set role = 'company' where id = auth.uid()$$,
  '42501', null, 'users cannot modify the trusted account type'
);
update public.freelancer_profiles set headline = 'Actualizado por su titular' where user_id = auth.uid();
select is((select headline from public.freelancer_profiles where user_id = auth.uid()), 'Actualizado por su titular', 'freelancer can edit their own professional details');
update public.freelancer_profiles set headline = 'Intento cruzado' where user_id = '00000000-0000-4000-8000-000000000002';
select is((select headline from public.freelancer_profiles where user_id = '00000000-0000-4000-8000-000000000002'), 'Diseñador de producto', 'freelancer cannot edit another professional profile');
insert into public.freelancer_skills (freelancer_user_id, skill_id)
values (auth.uid(), '30000000-0000-4000-8000-000000000001');
select throws_ok(
  $$insert into public.freelancer_skills (freelancer_user_id, skill_id) values (auth.uid(), '30000000-0000-4000-8000-000000000001')$$,
  '23505', null, 'a freelancer cannot duplicate a catalogue skill relation'
);
select throws_ok(
  $$insert into public.freelancer_skills (freelancer_user_id, skill_id) values (auth.uid(), '30000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'a freelancer cannot link an inactive catalogue skill'
);
insert into public.freelancer_skills (freelancer_user_id, custom_name)
values (auth.uid(), 'Torno CNC');
select throws_ok(
  $$insert into public.freelancer_skills (freelancer_user_id, custom_name) values (auth.uid(), 'torno cnc')$$,
  '23505', null, 'custom skill names are unique per freelancer regardless of case'
);
update public.freelancer_skills set custom_name = 'Habilidad ajena' where freelancer_user_id = '00000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.freelancer_skills where freelancer_user_id = '00000000-0000-4000-8000-000000000002' and skill_id = '30000000-0000-4000-8000-000000000001'), 1, 'freelancer cannot update another skill relation');
insert into public.portfolio_projects (freelancer_user_id, title)
values (auth.uid(), 'Mi proyecto en borrador');
select is((select count(*)::integer from public.portfolio_projects where freelancer_user_id = auth.uid() and title = 'Mi proyecto en borrador' and not is_published), 1, 'new projects start as drafts');
update public.portfolio_projects set is_published = true
where freelancer_user_id = auth.uid() and title = 'Mi proyecto en borrador';
select is((select count(*)::integer from public.portfolio_projects where freelancer_user_id = auth.uid() and title = 'Mi proyecto en borrador' and is_published), 1, 'an owner can explicitly publish their project');
select throws_ok(
  $$insert into public.portfolio_projects (freelancer_user_id, title) values ('00000000-0000-4000-8000-000000000002', 'Proyecto ajeno')$$,
  '42501', null, 'a freelancer cannot create a project for another owner'
);
update public.portfolio_projects set title = 'Intento de edición ajena' where id = '20000000-0000-4000-8000-000000000004';
select is((select title from public.portfolio_projects where id = '20000000-0000-4000-8000-000000000004'), 'Otro proyecto publicado', 'a freelancer cannot edit another project');
delete from public.portfolio_projects where id = '20000000-0000-4000-8000-000000000004';
select is((select count(*)::integer from public.portfolio_projects where id = '20000000-0000-4000-8000-000000000004'), 1, 'a freelancer cannot delete another project');
insert into public.portfolio_media (project_id, storage_path, alt_text)
values ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000099.webp', 'Otra imagen propia');
select throws_ok(
  $$insert into public.portfolio_media (project_id, storage_path) values ('20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000004/40000000-0000-4000-8000-000000000099.webp')$$,
  '42501', null, 'a freelancer cannot attach media to another project'
);
select throws_ok(
  $$insert into public.portfolio_media (project_id, storage_path) values ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000004/40000000-0000-4000-8000-000000000095.webp')$$,
  '23514', null, 'media paths must match the owner and project of the metadata row'
);
select throws_ok(
  $$update public.portfolio_projects set freelancer_user_id = '00000000-0000-4000-8000-000000000002' where id = '20000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'project ownership is protected from column updates'
);
insert into storage.objects (bucket_id, name, metadata)
values ('avatars', '00000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000099.webp', '{"mimetype":"image/webp","size":10}'::jsonb);
select is((select count(*)::integer from storage.objects where bucket_id = 'avatars' and name like '00000000-0000-4000-8000-000000000001/%'), 1, 'a user can upload metadata into their own avatar folder');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('avatars', '00000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000099.webp', '{"mimetype":"image/webp","size":10}'::jsonb)$$,
  '42501', null, 'a user cannot upload into another avatar folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('avatars', '00000000-0000-4000-8000-000000000001/private.txt', '{"mimetype":"text/plain","size":10}'::jsonb)$$,
  '42501', null, 'avatar paths reject non-image extensions'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('avatars', '00000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000098.webp', '{"mimetype":"application/octet-stream","size":10}'::jsonb)$$,
  '42501', null, 'avatar uploads reject disallowed MIME types'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('avatars', '00000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000097.webp', '{"mimetype":"image/webp","size":2097153}'::jsonb)$$,
  '42501', null, 'avatar uploads reject files over 2 MB'
);
insert into storage.objects (bucket_id, name, metadata)
values ('portfolio-media', '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000099.webp', '{"mimetype":"image/webp","size":10}'::jsonb);
select is((select count(*)::integer from storage.objects where bucket_id = 'portfolio-media' and name like '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/%'), 2, 'a user can upload into their own portfolio project');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('portfolio-media', '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000004/40000000-0000-4000-8000-000000000099.webp', '{"mimetype":"image/webp","size":10}'::jsonb)$$,
  '42501', null, 'a user cannot upload into another user project'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('portfolio-media', '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000096.webp', '{"mimetype":"image/webp","size":5242881}'::jsonb)$$,
  '42501', null, 'portfolio uploads reject files over 5 MB'
);
update storage.objects
set metadata = '{"mimetype":"image/webp","size":123,"marker":"owner-change"}'::jsonb
where bucket_id = 'portfolio-media'
  and name = '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000002.webp';
select is(
  (select metadata ->> 'marker' from storage.objects where name = '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000002.webp'),
  'owner-change',
  'owner can manage a portfolio object in a draft project'
);
update storage.objects set metadata = '{"marker":"cross-owner"}'::jsonb
where bucket_id = 'portfolio-media'
  and name = '00000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000004/40000000-0000-4000-8000-000000000004.webp';
select is(
  (select metadata ->> 'marker' from storage.objects where name = '00000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000004/40000000-0000-4000-8000-000000000004.webp'),
  null::text,
  'a user cannot modify another user portfolio object'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select public.save_my_profile('{"is_public":true}'::jsonb)$$,
  '22023', null, 'company profiles cannot be published by the freelancer profile operation'
);
select throws_ok(
  $$insert into public.portfolio_projects (freelancer_user_id, title) values (auth.uid(), 'No es freelancer')$$,
  '42501', null, 'company accounts cannot create freelancer portfolio projects'
);
select throws_ok(
  $$insert into public.freelancer_skills (freelancer_user_id, custom_name) values (auth.uid(), 'No es freelancer')$$,
  '42501', null, 'company accounts cannot add freelancer skills'
);
select is(
  public.save_company_profile('{"company_name":"Empresa","industry":"Servicios"}'::jsonb) ->> 'company_name',
  'Empresa',
  'the existing company-profile RPC contract remains compatible'
);
select is(
  public.save_company_profile('{"company_name":"Empresa","industry":"Servicios","description":"Descripción opcional","website_url":"https://example.com"}'::jsonb) ->> 'website_url',
  'https://example.com',
  'company profiles can use the added optional fields through the existing RPC'
);

reset role;
select * from finish();
rollback;
