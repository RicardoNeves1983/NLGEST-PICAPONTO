-- NLGest Ponto v0.13: persistência de horários, picagens e ausências.
-- Executar uma única vez no SQL Editor do Supabase, depois de schema.sql e portal_migration.sql.

alter table public.work_schedules add column if not exists actual_start time;
alter table public.work_schedules add column if not exists actual_end time;
alter table public.work_schedules add column if not exists break_minutes integer not null default 0;
alter table public.work_schedules add column if not exists day_status text not null default 'Trabalho';
alter table public.work_schedules add column if not exists notes text;
alter table public.work_schedules add column if not exists updated_at timestamptz not null default now();

alter table public.work_schedules drop constraint if exists work_schedules_day_status_check;
alter table public.work_schedules add constraint work_schedules_day_status_check
 check (day_status in ('Trabalho','Férias','Falta','Folga','Baixa'));

create index if not exists idx_punches_employee_occurred
 on public.punches(employee_id,occurred_at desc);

