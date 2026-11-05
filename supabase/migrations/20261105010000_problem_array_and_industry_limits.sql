-- Revisión final de seguridad: los arreglos de impactos y objetivos y el sector del problema no tenían tope en la base
-- (la RPC aceptaba 50 000 elementos o 100 000 caracteres). Se limitan a las opciones que ofrece la interfaz.

alter table public.business_problems
  add constraint business_problems_impacts_check
    check (pg_catalog.cardinality(impacts) <= 10 and impacts <@ array['time', 'errors', 'financial', 'customers', 'repetitive', 'other']::text[]),
  add constraint business_problems_objectives_check
    check (pg_catalog.cardinality(objectives) <= 10 and objectives <@ array['save_time', 'reduce_errors', 'increase_sales', 'automate', 'organize', 'customer_service', 'other']::text[]),
  add constraint business_problems_industry_snapshot_check
    check (pg_catalog.char_length(industry_snapshot) <= 100);
