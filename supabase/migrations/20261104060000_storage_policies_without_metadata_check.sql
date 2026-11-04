-- Las políticas de Storage exigían is_allowed_profile_image(metadata, tamaño), pero storage-api (1.88) evalúa las
-- políticas de INSERT antes de tener mimetype y size en metadata, así que rechazaba TODAS las subidas legítimas
-- (avatar y portafolio). El tipo y el tamaño ya los imponen los buckets (allowed_mime_types y file_size_limit),
-- así que se retira esa comprobación de las políticas y la función.
do $$
declare
  r record;
  v_using text;
  v_check text;
begin
  for r in
    select policyname, qual, with_check from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual ilike '%is_allowed_profile_image%' or with_check ilike '%is_allowed_profile_image%')
  loop
    v_using := case when r.qual is null then null
      else pg_catalog.regexp_replace(r.qual, 'is_allowed_profile_image\(metadata, \([0-9]+\)::bigint\)', 'true', 'g') end;
    v_check := case when r.with_check is null then null
      else pg_catalog.regexp_replace(r.with_check, 'is_allowed_profile_image\(metadata, \([0-9]+\)::bigint\)', 'true', 'g') end;
    execute pg_catalog.format('alter policy %I on storage.objects%s%s', r.policyname,
      case when v_using is null then '' else ' using (' || v_using || ')' end,
      case when v_check is null then '' else ' with check (' || v_check || ')' end);
  end loop;
end $$;

drop function if exists public.is_allowed_profile_image(jsonb, bigint);
