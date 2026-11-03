create table public.messages (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete restrict,
  sender_id uuid not null references public.app_users (id) on delete restrict,
  body text not null check (pg_catalog.char_length(pg_catalog.btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  client_id uuid
);

create index messages_match_created_id_idx on public.messages (match_id, created_at, id);
create unique index messages_match_sender_client_id_idx
  on public.messages (match_id, sender_id, client_id) where client_id is not null;

create table public.conversation_reads (
  match_id uuid not null references public.matches (id) on delete restrict,
  user_id uuid not null references public.app_users (id) on delete restrict,
  last_read_at timestamptz,
  last_read_message_id uuid references public.messages (id) on delete restrict,
  primary key (match_id, user_id),
  check ((last_read_at is null) = (last_read_message_id is null))
);

create index conversation_reads_user_match_idx on public.conversation_reads (user_id, match_id);

alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;
revoke all on table public.messages from public, anon, authenticated;
revoke all on table public.conversation_reads from public, anon, authenticated;
grant select on table public.messages to authenticated;
grant select on table public.conversation_reads to authenticated;

create policy messages_read_participants on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and ((select auth.uid()) = m.company_user_id or (select auth.uid()) = m.freelancer_id)
    )
  );

create policy conversation_reads_read_own on public.conversation_reads
  for select to authenticated using (user_id = (select auth.uid()));

-- Internal helpers have no client grants; all entry points check the persisted role.
create function public.require_chat_user()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.user_role;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select u.role into v_role from public.app_users u where u.id = v_user_id;
  if v_role = 'company'::public.user_role then
    return public.require_company_user();
  elsif v_role = 'freelancer'::public.user_role then
    return public.require_freelancer_user();
  end if;
  raise exception 'account required' using errcode = '42501';
end;
$$;

create function public.require_chat_match(p_match_id uuid, p_lock boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_chat_user();
begin
  if p_lock then
    perform 1 from public.matches m
    where m.id = p_match_id and (m.company_user_id = v_user_id or m.freelancer_id = v_user_id)
    for update;
  else
    perform 1 from public.matches m
    where m.id = p_match_id and (m.company_user_id = v_user_id or m.freelancer_id = v_user_id);
  end if;
  if not found then
    raise exception 'conversation not found' using errcode = '42501';
  end if;
  return v_user_id;
end;
$$;

create function public.send_message(p_match_id uuid, p_body text, p_client_id uuid default null)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_chat_match(p_match_id, true);
  v_message public.messages%rowtype;
  v_body text;
  v_created_at timestamptz;
begin
  -- Locking the match serializes retries, quota checks, message order and read markers.
  if p_client_id is not null then
    select msg.* into v_message from public.messages msg
    where msg.match_id = p_match_id and msg.sender_id = v_user_id and msg.client_id = p_client_id;
    if found then
      return v_message;
    end if;
  end if;

  v_body := pg_catalog.regexp_replace(p_body, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if v_body is null or pg_catalog.char_length(v_body) = 0 then
    raise exception 'message body empty' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_body) > 2000 then
    raise exception 'message body too long' using errcode = '22023';
  end if;
  if (
    select pg_catalog.count(*) from public.messages msg
    where msg.match_id = p_match_id and msg.sender_id = v_user_id
      and msg.created_at >= pg_catalog.clock_timestamp() - interval '1 minute'
  ) >= 30 then
    raise exception 'message rate limit: maximum 30 messages per minute' using errcode = 'P0001';
  end if;

  -- A strictly increasing timestamp makes the timestamp-only backwards cursor safe
  -- even when two application sends arrive within the same clock tick.
  select greatest(pg_catalog.clock_timestamp(), coalesce(max(msg.created_at) + interval '1 microsecond', pg_catalog.clock_timestamp()))
    into v_created_at from public.messages msg where msg.match_id = p_match_id;
  insert into public.messages (match_id, sender_id, body, client_id, created_at)
  values (p_match_id, v_user_id, v_body, p_client_id, v_created_at)
  returning * into v_message;
  return v_message;
end;
$$;

create function public.list_conversations()
returns table (
  match_id uuid,
  problem_title text,
  counterpart_name text,
  counterpart_role text,
  last_message_body text,
  last_message_at timestamptz,
  last_message_sender_is_me boolean,
  unread_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_chat_user();
begin
  return query
    select m.id, p.problem_title_snapshot,
      case when m.company_user_id = v_user_id then profile.display_name
        when b.show_company_name then company.company_name else null end,
      case when m.company_user_id = v_user_id then 'freelancer'::text else 'company'::text end,
      pg_catalog.left(last_message.body, 140), last_message.created_at,
      case when last_message.id is null then null else last_message.sender_id = v_user_id end,
      (select pg_catalog.count(*)::integer from public.messages unread
       where unread.match_id = m.id and unread.sender_id <> v_user_id
         and (reads.last_read_at is null
           or (unread.created_at, unread.id) > (reads.last_read_at, reads.last_read_message_id)))
    from public.matches m
    join public.proposals p on p.id = m.proposal_id
    join public.business_problems b on b.id = m.problem_id
    left join public.profiles profile on profile.id = m.freelancer_id
    left join public.company_profiles company on company.user_id = m.company_user_id
    left join public.conversation_reads reads on reads.match_id = m.id and reads.user_id = v_user_id
    left join lateral (
      select msg.id, msg.body, msg.created_at, msg.sender_id from public.messages msg
      where msg.match_id = m.id order by msg.created_at desc, msg.id desc limit 1
    ) last_message on true
    where m.company_user_id = v_user_id or m.freelancer_id = v_user_id
    order by coalesce(last_message.created_at, m.created_at) desc, m.id;
end;
$$;

create function public.list_messages(p_match_id uuid, p_before timestamptz default null, p_limit integer default 50)
returns setof public.messages
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_chat_match(p_match_id, false);
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid message page size' using errcode = '22023';
  end if;
  return query
    select page.* from (
      select msg.* from public.messages msg
      where msg.match_id = p_match_id and (p_before is null or msg.created_at < p_before)
      order by msg.created_at desc, msg.id desc limit p_limit
    ) page order by page.created_at, page.id;
end;
$$;

create function public.mark_conversation_read(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_chat_match(p_match_id, true);
  v_last_at timestamptz;
  v_last_id uuid;
begin
  select msg.created_at, msg.id into v_last_at, v_last_id from public.messages msg
  where msg.match_id = p_match_id order by msg.created_at desc, msg.id desc limit 1;
  insert into public.conversation_reads (match_id, user_id, last_read_at, last_read_message_id)
  values (p_match_id, v_user_id, v_last_at, v_last_id)
  on conflict (match_id, user_id) do update
  set last_read_at = excluded.last_read_at, last_read_message_id = excluded.last_read_message_id;
end;
$$;

create function public.unread_total()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_chat_user();
  v_total integer;
begin
  select pg_catalog.count(*)::integer into v_total
  from public.matches m
  join public.messages msg on msg.match_id = m.id and msg.sender_id <> v_user_id
  left join public.conversation_reads reads on reads.match_id = m.id and reads.user_id = v_user_id
  where (m.company_user_id = v_user_id or m.freelancer_id = v_user_id)
    and (reads.last_read_at is null
      or (msg.created_at, msg.id) > (reads.last_read_at, reads.last_read_message_id));
  return v_total;
end;
$$;

revoke all on function public.require_chat_user() from public, anon, authenticated;
revoke all on function public.require_chat_match(uuid, boolean) from public, anon, authenticated;
revoke all on function public.send_message(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.list_conversations() from public, anon, authenticated;
revoke all on function public.list_messages(uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.mark_conversation_read(uuid) from public, anon, authenticated;
revoke all on function public.unread_total() from public, anon, authenticated;
grant execute on function public.send_message(uuid, text, uuid) to authenticated;
grant execute on function public.list_conversations() to authenticated;
grant execute on function public.list_messages(uuid, timestamptz, integer) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.unread_total() to authenticated;

-- Some test installations do not configure Realtime; keep the migration usable there.
do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
