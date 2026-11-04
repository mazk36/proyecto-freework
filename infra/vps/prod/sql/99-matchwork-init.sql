-- Se ejecuta una sola vez, al crear el volumen de Postgres (imagen supabase/postgres).
-- Equivale a lo que hace la CLI de Supabase en local: contraseñas de los roles de servicio,
-- esquema de Realtime y parámetros JWT de la base.
\set pgpass `echo "$POSTGRES_PASSWORD"`
\set jwt_secret `echo "$JWT_SECRET"`
\set jwt_exp `echo "$JWT_EXP"`

alter database postgres set "app.settings.jwt_secret" to :'jwt_secret';
alter database postgres set "app.settings.jwt_exp" to :'jwt_exp';

alter user authenticator with password :'pgpass';
alter user pgbouncer with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user supabase_storage_admin with password :'pgpass';
alter user supabase_replication_admin with password :'pgpass';
alter user supabase_read_only_user with password :'pgpass';

create schema if not exists _realtime;
alter schema _realtime owner to postgres;
