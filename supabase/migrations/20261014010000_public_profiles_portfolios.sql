alter table public.app_users
  add constraint app_users_id_role_key unique (id, role);

create or replace function public.profile_slug_candidate(p_name text, p_user_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.left(
    coalesce(
      nullif(
        pg_catalog.btrim(pg_catalog.regexp_replace(
          pg_catalog.lower(coalesce(p_name, '')),
          '[^a-z0-9]+', '-', 'g'
        ), '-'),
        ''
      ),
      'perfil'
    ),
    40
  ) || '-' || pg_catalog.replace(p_user_id::text, '-', '')
$$;

revoke all on function public.profile_slug_candidate(text, uuid) from public, anon, authenticated;

create or replace function public.is_allowed_profile_image(p_metadata jsonb, p_max_bytes bigint)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_metadata ->> 'mimetype' = any (array['image/jpeg', 'image/png', 'image/webp']::text[])
    and case
      when coalesce(p_metadata ->> 'size', '') ~ '^[0-9]{1,20}$'
        then (p_metadata ->> 'size')::numeric <= p_max_bytes
      else false
    end,
    false
  )
$$;

revoke all on function public.is_allowed_profile_image(jsonb, bigint) from public, anon, authenticated;
grant execute on function public.is_allowed_profile_image(jsonb, bigint) to anon, authenticated;

create table public.profiles (
  id uuid primary key,
  account_type public.user_role not null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  slug text not null unique check (
    char_length(slug) between 3 and 80
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  avatar_path text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_app_user_role_fkey
    foreign key (id, account_type)
    references public.app_users (id, role)
    on delete cascade,
  constraint profiles_avatar_path_check check (
    avatar_path is null or (
      pg_catalog.split_part(avatar_path, '/', 1) = id::text
      and avatar_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
    )
  )
);

create table public.freelancer_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text check (headline is null or char_length(headline) <= 160),
  bio text check (bio is null or char_length(bio) <= 3000),
  location_text text check (location_text is null or char_length(location_text) <= 120),
  years_experience integer check (years_experience is null or years_experience between 0 and 80),
  website_url text check (
    website_url is null or (
      char_length(website_url) <= 2048
      and website_url ~* '^https?://[^[:space:]]+$'
    )
  ),
  availability_status text check (
    availability_status is null or char_length(availability_status) between 1 and 40
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  slug text not null unique check (
    char_length(slug) between 1 and 80
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  name text not null check (char_length(name) between 1 and 100),
  category text check (category is null or char_length(category) <= 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_active_catalog_skill(p_skill_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.skills s
    where s.id = p_skill_id and s.is_active
  )
$$;

revoke all on function public.is_active_catalog_skill(uuid) from public, anon, authenticated;
grant execute on function public.is_active_catalog_skill(uuid) to authenticated;

create table public.freelancer_skills (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  freelancer_user_id uuid not null references public.freelancer_profiles (user_id) on delete cascade,
  skill_id uuid references public.skills (id) on delete restrict,
  custom_name text,
  created_at timestamptz not null default now(),
  constraint freelancer_skills_one_source_check check (
    (skill_id is not null and custom_name is null)
    or (skill_id is null and custom_name is not null)
  ),
  constraint freelancer_skills_custom_name_check check (
    custom_name is null or (
      char_length(custom_name) between 1 and 100
      and custom_name = pg_catalog.btrim(custom_name)
    )
  )
);

create unique index freelancer_skills_catalog_unique
  on public.freelancer_skills (freelancer_user_id, skill_id)
  where skill_id is not null;
create unique index freelancer_skills_custom_unique
  on public.freelancer_skills (freelancer_user_id, pg_catalog.lower(custom_name))
  where custom_name is not null;
create index freelancer_skills_skill_idx
  on public.freelancer_skills (skill_id)
  where skill_id is not null;
create index freelancer_skills_owner_idx
  on public.freelancer_skills (freelancer_user_id);

create table public.portfolio_projects (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  freelancer_user_id uuid not null references public.freelancer_profiles (user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  description text check (description is null or char_length(description) <= 3000),
  category text check (category is null or char_length(category) <= 100),
  project_period text check (project_period is null or char_length(project_period) <= 80),
  external_url text check (
    external_url is null or (
      char_length(external_url) <= 2048
      and external_url ~* '^https?://[^[:space:]]+$'
    )
  ),
  cover_image_path text,
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_projects_cover_path_check check (
    cover_image_path is null or cover_image_path ~ (
      '^' || freelancer_user_id::text || '/' || id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
    )
  )
);

create index portfolio_projects_owner_order_idx
  on public.portfolio_projects (freelancer_user_id, sort_order, created_at desc);
create index portfolio_projects_public_idx
  on public.portfolio_projects (freelancer_user_id, sort_order)
  where is_published;

create table public.portfolio_media (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  project_id uuid not null references public.portfolio_projects (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '' check (char_length(alt_text) <= 250),
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  created_at timestamptz not null default now(),
  constraint portfolio_media_storage_path_check check (
    storage_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
  )
);

create index portfolio_media_project_order_idx
  on public.portfolio_media (project_id, sort_order, created_at);

create or replace function public.validate_portfolio_media_owner_path()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  select pp.freelancer_user_id into v_owner_id
  from public.portfolio_projects pp
  where pp.id = new.project_id;

  if not found then
    raise exception 'portfolio project not found' using errcode = '23503';
  end if;
  if new.storage_path !~ (
    '^' || v_owner_id::text || '/' || new.project_id::text ||
    '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
  ) then
    raise exception 'portfolio media path does not match its project' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_portfolio_media_owner_path() from public, anon, authenticated;

alter table public.company_profiles
  add column description text check (description is null or char_length(description) <= 3000),
  add column website_url text check (
    website_url is null or (
      char_length(website_url) <= 2048
      and website_url ~* '^https?://[^[:space:]]+$'
    )
  );

-- Existing roles and names come only from the database-controlled app_users table.
-- Every backfilled profile remains a private draft.
insert into public.profiles (id, account_type, display_name, slug)
select u.id, u.role, u.full_name, public.profile_slug_candidate(u.full_name, u.id)
from public.app_users u
on conflict (id) do nothing;

insert into public.freelancer_profiles (user_id)
select p.id
from public.profiles p
where p.account_type = 'freelancer'::public.user_role
on conflict (user_id) do nothing;

create or replace function public.create_profile_for_app_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.app_users%rowtype;
begin
  select u.* into v_account
  from public.app_users u
  where u.id = p_user_id;

  if not found then
    raise exception 'account profile required' using errcode = '42501';
  end if;

  insert into public.profiles (id, account_type, display_name, slug)
  values (
    v_account.id,
    v_account.role,
    v_account.full_name,
    public.profile_slug_candidate(v_account.full_name, v_account.id)
  )
  on conflict (id) do nothing;

  if v_account.role = 'freelancer'::public.user_role then
    insert into public.freelancer_profiles (user_id)
    values (v_account.id)
    on conflict (user_id) do nothing;
  end if;
end;
$$;

revoke all on function public.create_profile_for_app_user(uuid) from public, anon, authenticated;

create or replace function public.create_app_user_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_name text;
begin
  v_name := nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), '');
  if v_name is null then
    v_name := coalesce(nullif(pg_catalog.split_part(new.email, '@', 1), ''), 'Usuario MatchWork');
  end if;
  if char_length(v_name) > 100 then
    v_name := pg_catalog.left(v_name, 100);
  end if;

  if new.raw_user_meta_data ->> 'role' in ('company', 'freelancer') then
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  else
    v_role := 'freelancer'::public.user_role;
  end if;

  insert into public.app_users (id, full_name, role)
  values (new.id, v_name, v_role)
  on conflict (id) do nothing;

  perform public.create_profile_for_app_user(new.id);
  return new;
end;
$$;

create or replace function public.ensure_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  perform public.create_profile_for_app_user(v_user_id);
  select p.* into v_profile from public.profiles p where p.id = v_user_id;
  return pg_catalog.to_jsonb(v_profile);
end;
$$;

create or replace function public.save_my_profile(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_display_name text;
  v_slug text;
  v_avatar_path text;
  v_is_public boolean;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if pg_catalog.jsonb_typeof(p_profile) is distinct from 'object'
     or (p_profile - array['display_name', 'slug', 'avatar_path', 'is_public']::text[]) <> '{}'::jsonb then
    raise exception 'invalid profile fields' using errcode = '22023';
  end if;

  select p.* into v_profile from public.profiles p where p.id = v_user_id for update;
  if not found then
    raise exception 'profile not found; call ensure_my_profile first' using errcode = 'P0002';
  end if;

  v_display_name := v_profile.display_name;
  if p_profile ? 'display_name' then
    v_display_name := nullif(pg_catalog.btrim(p_profile ->> 'display_name'), '');
  end if;
  v_slug := v_profile.slug;
  if p_profile ? 'slug' then
    v_slug := nullif(pg_catalog.btrim(p_profile ->> 'slug'), '');
  end if;
  v_avatar_path := v_profile.avatar_path;
  if p_profile ? 'avatar_path' then
    v_avatar_path := p_profile ->> 'avatar_path';
  end if;
  v_is_public := v_profile.is_public;
  if p_profile ? 'is_public' then
    if pg_catalog.jsonb_typeof(p_profile -> 'is_public') is distinct from 'boolean' then
      raise exception 'is_public must be a boolean' using errcode = '22023';
    end if;
    v_is_public := (p_profile ->> 'is_public')::boolean;
  end if;

  if v_profile.account_type = 'company'::public.user_role and v_is_public then
    raise exception 'company profiles are not public in this phase' using errcode = '22023';
  end if;

  if v_display_name is null or char_length(v_display_name) > 120
     or v_slug is null or char_length(v_slug) not between 3 and 80
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid public profile fields' using errcode = '22023';
  end if;

  update public.profiles p
  set display_name = v_display_name,
      slug = v_slug,
      avatar_path = v_avatar_path,
      is_public = v_is_public
  where p.id = v_user_id
  returning p.* into v_profile;

  return pg_catalog.to_jsonb(v_profile);
end;
$$;

create or replace function public.save_company_profile(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_company_name text := pg_catalog.btrim(coalesce(p_profile ->> 'company_name', ''));
  v_industry text := pg_catalog.btrim(coalesce(p_profile ->> 'industry', ''));
  v_country_code text := upper(coalesce(p_profile ->> 'country_code', 'PE'));
  v_description text;
  v_website_url text;
  v_profile public.company_profiles%rowtype;
begin
  if pg_catalog.jsonb_typeof(p_profile) is distinct from 'object'
     or (p_profile - array['company_name', 'industry', 'country_code', 'description', 'website_url']::text[]) <> '{}'::jsonb
     or char_length(v_company_name) not between 2 and 160
     or char_length(v_industry) not between 2 and 100
     or v_country_code !~ '^[A-Z]{2}$' then
    raise exception 'invalid company profile' using errcode = '22023';
  end if;

  if p_profile ? 'description' then
    v_description := nullif(pg_catalog.btrim(p_profile ->> 'description'), '');
    if v_description is not null and char_length(v_description) > 3000 then
      raise exception 'invalid company profile' using errcode = '22023';
    end if;
  end if;
  if p_profile ? 'website_url' then
    v_website_url := nullif(pg_catalog.btrim(p_profile ->> 'website_url'), '');
    if v_website_url is not null and (
      char_length(v_website_url) > 2048 or v_website_url !~* '^https?://[^[:space:]]+$'
    ) then
      raise exception 'invalid company profile' using errcode = '22023';
    end if;
  end if;

  insert into public.company_profiles (user_id, company_name, industry, country_code, description, website_url)
  values (v_user_id, v_company_name, v_industry, v_country_code, v_description, v_website_url)
  on conflict (user_id) do update set
    company_name = excluded.company_name,
    industry = excluded.industry,
    country_code = excluded.country_code,
    description = case when p_profile ? 'description' then excluded.description else company_profiles.description end,
    website_url = case when p_profile ? 'website_url' then excluded.website_url else company_profiles.website_url end
  returning * into v_profile;

  return pg_catalog.to_jsonb(v_profile);
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger freelancer_profiles_updated_at
  before update on public.freelancer_profiles
  for each row execute function public.set_updated_at();
create trigger portfolio_projects_updated_at
  before update on public.portfolio_projects
  for each row execute function public.set_updated_at();
create trigger portfolio_media_owner_path_check
  before insert on public.portfolio_media
  for each row execute function public.validate_portfolio_media_owner_path();

alter table public.profiles enable row level security;
alter table public.freelancer_profiles enable row level security;
alter table public.skills enable row level security;
alter table public.freelancer_skills enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.portfolio_media enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.freelancer_profiles from anon, authenticated;
revoke all on table public.skills from anon, authenticated;
revoke all on table public.freelancer_skills from anon, authenticated;
revoke all on table public.portfolio_projects from anon, authenticated;
revoke all on table public.portfolio_media from anon, authenticated;

grant select (id, account_type, display_name, slug, avatar_path, is_public, created_at, updated_at)
  on table public.profiles to anon, authenticated;
grant select (user_id, headline, bio, location_text, years_experience, website_url, availability_status, created_at, updated_at)
  on table public.freelancer_profiles to anon, authenticated;
grant select (id, slug, name, category, is_active, created_at)
  on table public.skills to anon, authenticated;
grant select (id, freelancer_user_id, skill_id, custom_name, created_at)
  on table public.freelancer_skills to anon, authenticated;
grant select (id, freelancer_user_id, title, description, category, project_period, external_url, cover_image_path, sort_order, is_published, created_at, updated_at)
  on table public.portfolio_projects to anon, authenticated;
grant select (id, project_id, storage_path, alt_text, sort_order, created_at)
  on table public.portfolio_media to anon, authenticated;

grant insert (user_id, headline, bio, location_text, years_experience, website_url, availability_status)
  on table public.freelancer_profiles to authenticated;
grant update (headline, bio, location_text, years_experience, website_url, availability_status)
  on table public.freelancer_profiles to authenticated;

grant insert (freelancer_user_id, skill_id, custom_name)
  on table public.freelancer_skills to authenticated;
grant update (skill_id, custom_name)
  on table public.freelancer_skills to authenticated;
grant delete on table public.freelancer_skills to authenticated;

grant insert (freelancer_user_id, title, description, category, project_period, external_url, cover_image_path, sort_order, is_published)
  on table public.portfolio_projects to authenticated;
grant update (title, description, category, project_period, external_url, cover_image_path, sort_order, is_published)
  on table public.portfolio_projects to authenticated;
grant delete on table public.portfolio_projects to authenticated;

grant insert (project_id, storage_path, alt_text, sort_order)
  on table public.portfolio_media to authenticated;
grant update (alt_text, sort_order)
  on table public.portfolio_media to authenticated;
grant delete on table public.portfolio_media to authenticated;

create policy profiles_read_public_or_self on public.profiles
  for select to anon, authenticated
  using (is_public or id = (select auth.uid()));

create policy freelancer_profiles_read_public_or_self on public.freelancer_profiles
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = freelancer_profiles.user_id
        and p.account_type = 'freelancer'::public.user_role
        and p.is_public
    )
  );
create policy freelancer_profiles_insert_self on public.freelancer_profiles
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = freelancer_profiles.user_id
        and p.account_type = 'freelancer'::public.user_role
    )
  );
create policy freelancer_profiles_update_self on public.freelancer_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = freelancer_profiles.user_id
        and p.account_type = 'freelancer'::public.user_role
    )
  );
create policy skills_read_active on public.skills
  for select to anon, authenticated
  using (
    is_active
    and (
      (select auth.uid()) is not null
      or exists (
        select 1
        from public.freelancer_skills fs
        join public.profiles p on p.id = fs.freelancer_user_id
        where fs.skill_id = skills.id
          and p.account_type = 'freelancer'::public.user_role
          and p.is_public
      )
    )
  );

create policy freelancer_skills_read_public_or_self on public.freelancer_skills
  for select to anon, authenticated
  using (
    freelancer_user_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = freelancer_skills.freelancer_user_id
        and p.account_type = 'freelancer'::public.user_role
        and p.is_public
    )
  );
create policy freelancer_skills_insert_self on public.freelancer_skills
  for insert to authenticated
  with check (
    freelancer_user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = freelancer_skills.freelancer_user_id
        and p.account_type = 'freelancer'::public.user_role
    )
    and (
      skill_id is null
      or public.is_active_catalog_skill(freelancer_skills.skill_id)
    )
  );
create policy freelancer_skills_update_self on public.freelancer_skills
  for update to authenticated
  using (freelancer_user_id = (select auth.uid()))
  with check (
    freelancer_user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = freelancer_skills.freelancer_user_id
        and p.account_type = 'freelancer'::public.user_role
    )
    and (
      skill_id is null
      or public.is_active_catalog_skill(freelancer_skills.skill_id)
    )
  );
create policy freelancer_skills_delete_self on public.freelancer_skills
  for delete to authenticated
  using (freelancer_user_id = (select auth.uid()));

create policy portfolio_projects_read_public_or_self on public.portfolio_projects
  for select to anon, authenticated
  using (
    freelancer_user_id = (select auth.uid())
    or (
      is_published
      and exists (
        select 1 from public.profiles p
        where p.id = portfolio_projects.freelancer_user_id
          and p.account_type = 'freelancer'::public.user_role
          and p.is_public
      )
    )
  );
create policy portfolio_projects_insert_self on public.portfolio_projects
  for insert to authenticated
  with check (
    freelancer_user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = portfolio_projects.freelancer_user_id
        and p.account_type = 'freelancer'::public.user_role
    )
  );
create policy portfolio_projects_update_self on public.portfolio_projects
  for update to authenticated
  using (freelancer_user_id = (select auth.uid()))
  with check (
    freelancer_user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = portfolio_projects.freelancer_user_id
        and p.account_type = 'freelancer'::public.user_role
    )
  );
create policy portfolio_projects_delete_self on public.portfolio_projects
  for delete to authenticated
  using (freelancer_user_id = (select auth.uid()));

create policy portfolio_media_read_public_or_self on public.portfolio_media
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.portfolio_projects pp
      where pp.id = portfolio_media.project_id
        and (
          pp.freelancer_user_id = (select auth.uid())
          or (
            pp.is_published
            and exists (
              select 1 from public.profiles p
              where p.id = pp.freelancer_user_id
                and p.account_type = 'freelancer'::public.user_role
                and p.is_public
            )
          )
        )
    )
  );
create policy portfolio_media_insert_self on public.portfolio_media
  for insert to authenticated
  with check (
    exists (
      select 1 from public.portfolio_projects pp
      where pp.id = portfolio_media.project_id
        and pp.freelancer_user_id = (select auth.uid())
    )
  );
create policy portfolio_media_update_self on public.portfolio_media
  for update to authenticated
  using (
    exists (
      select 1 from public.portfolio_projects pp
      where pp.id = portfolio_media.project_id
        and pp.freelancer_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.portfolio_projects pp
      where pp.id = portfolio_media.project_id
        and pp.freelancer_user_id = (select auth.uid())
    )
  );
create policy portfolio_media_delete_self on public.portfolio_media
  for delete to authenticated
  using (
    exists (
      select 1 from public.portfolio_projects pp
      where pp.id = portfolio_media.project_id
        and pp.freelancer_user_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('portfolio-media', 'portfolio-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from storage.buckets b
    where b.id = 'avatars'
      and b.name = 'avatars'
      and b.public
      and b.file_size_limit = 2097152
      and b.allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]
      and pg_catalog.cardinality(b.allowed_mime_types) = 3
  ) then
    raise exception 'avatars bucket exists with settings that differ from the required public image-only 2 MB configuration';
  end if;
  if not exists (
    select 1 from storage.buckets b
    where b.id = 'portfolio-media'
      and b.name = 'portfolio-media'
      and not b.public
      and b.file_size_limit = 5242880
      and b.allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]
      and pg_catalog.cardinality(b.allowed_mime_types) = 3
  ) then
    raise exception 'portfolio-media bucket exists with settings that differ from the required private image-only 5 MB configuration';
  end if;
end;
$$;

create policy avatars_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
    and public.is_allowed_profile_image(metadata, 2097152)
  );
create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
    and public.is_allowed_profile_image(metadata, 2097152)
  );
create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
  );

create policy portfolio_media_storage_read_public on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'portfolio-media'
    and exists (
      select 1
      from public.portfolio_projects pp
      join public.profiles p on p.id = pp.freelancer_user_id
      where pp.id::text = (storage.foldername(name))[2]
        and pp.freelancer_user_id::text = (storage.foldername(name))[1]
        and p.account_type = 'freelancer'::public.user_role
        and p.is_public
        and pp.is_published
        and (
          pp.cover_image_path = name
          or exists (
            select 1 from public.portfolio_media pm
            where pm.project_id = pp.id and pm.storage_path = name
          )
        )
    )
  );
create policy portfolio_media_storage_read_owner on storage.objects
  for select to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy portfolio_media_storage_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
    and public.is_allowed_profile_image(metadata, 5242880)
    and exists (
      select 1 from public.portfolio_projects pp
      where pp.id::text = (storage.foldername(name))[2]
        and pp.freelancer_user_id = (select auth.uid())
    )
  );
create policy portfolio_media_storage_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.portfolio_projects pp
      where pp.id::text = (storage.foldername(name))[2]
        and pp.freelancer_user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
    and public.is_allowed_profile_image(metadata, 5242880)
    and exists (
      select 1 from public.portfolio_projects pp
      where pp.id::text = (storage.foldername(name))[2]
        and pp.freelancer_user_id = (select auth.uid())
    )
  );
create policy portfolio_media_storage_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g)$'
  );

revoke all on function public.ensure_my_profile() from public, anon, authenticated;
revoke all on function public.save_my_profile(jsonb) from public, anon, authenticated;
grant execute on function public.ensure_my_profile() to authenticated;
grant execute on function public.save_my_profile(jsonb) to authenticated;

comment on table public.profiles is
  'Public-safe account profile fields. A profile is private until is_public is explicitly enabled by its owner.';
comment on table public.freelancer_profiles is
  'Professional details for freelancers; reads are limited to the owner or viewers of a published profile.';
comment on table public.skills is
  'Controlled skill catalogue. Client roles can read active entries but cannot modify the shared catalogue.';
comment on table public.freelancer_skills is
  'Freelancer-owned links to catalogue skills or custom skill labels stored on the owner relationship.';
comment on table public.portfolio_projects is
  'Freelancer projects. Drafts are visible only to the owner and published projects require a public owner profile.';
comment on table public.portfolio_media is
  'Portfolio image metadata only. Binary files are stored in the private portfolio-media bucket.';
comment on column public.profiles.avatar_path is
  'Relative path in the public avatars bucket. Use only an image the owner accepts as publicly retrievable even while the profile is a draft.';
comment on function public.ensure_my_profile() is
  'Idempotently creates the caller profile from the trusted app_users row; it never trusts user metadata or a client-supplied owner id.';
comment on function public.save_my_profile(jsonb) is
  'Updates only allow-listed public profile fields for auth.uid(); account type and owner id are not writable.';
