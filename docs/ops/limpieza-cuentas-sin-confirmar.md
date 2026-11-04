# Limpieza periódica de cuentas sin confirmar

Con la confirmación de correo activa, quien se registra y nunca abre el enlace deja una cuenta sin confirmar. Conviene borrarlas cada semana para no acumular filas ni bloquear que esa persona vuelva a registrarse.

## Revisar primero (no borra nada)

```sql
select id, email, created_at, confirmation_sent_at
from auth.users
where email_confirmed_at is null
  and created_at < now() - interval '7 days'
order by created_at;
```

## Borrar

```sql
delete from auth.users
where email_confirmed_at is null
  and created_at < now() - interval '7 days';
```

Las tablas de la app (`app_users`, perfiles) se borran en cascada. Hazlo con el usuario `postgres` desde una consola SQL, mejor fuera de las horas de más uso. Si una persona escribe diciendo que no le llegó el correo, no la borres: pídele que use «Reenviar correo» en la pantalla «Revisa tu correo».
