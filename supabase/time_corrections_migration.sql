-- NLGest Ponto v0.26: pedidos de correção de horário e de picagem, sujeitos a aprovação.
-- Executar uma única vez no SQL Editor do Supabase, depois de todas as migrações anteriores.

create table if not exists public.time_correction_requests (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade, work_date date not null,
 previous_existed boolean not null default false, previous_start time, previous_end time, previous_break_minutes integer, previous_status text, previous_notes text,
 requested_start time, requested_end time, requested_break_minutes integer not null default 0, requested_status text not null default 'Trabalho', requested_notes text,
 status text not null default 'pending', decision_reason text, decided_at timestamptz, created_at timestamptz not null default now()
);
alter table public.time_correction_requests drop constraint if exists time_correction_requests_status_check;
alter table public.time_correction_requests add constraint time_correction_requests_status_check check(status in ('pending','approved','rejected','reverted'));
alter table public.time_correction_requests drop constraint if exists time_correction_requests_requested_status_check;
alter table public.time_correction_requests add constraint time_correction_requests_requested_status_check check(requested_status in ('Trabalho','Férias','Falta','Folga','Baixa'));

create table if not exists public.punch_correction_requests (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade, punch_id uuid references public.punches(id) on delete set null,
 kind text not null, requested_occurred_at timestamptz not null, previous_occurred_at timestamptz,
 status text not null default 'pending', decision_reason text, decided_at timestamptz, created_at timestamptz not null default now()
);
alter table public.punch_correction_requests drop constraint if exists punch_correction_requests_kind_check;
alter table public.punch_correction_requests add constraint punch_correction_requests_kind_check check(kind in ('in','out','break_start','break_end'));
alter table public.punch_correction_requests drop constraint if exists punch_correction_requests_status_check;
alter table public.punch_correction_requests add constraint punch_correction_requests_status_check check(status in ('pending','approved','rejected','reverted'));

create index if not exists idx_corrections_employee_date on public.time_correction_requests(company_id,employee_id,work_date);
create index if not exists idx_corrections_status on public.time_correction_requests(company_id,status);
create index if not exists idx_punch_corrections_employee on public.punch_correction_requests(company_id,employee_id,created_at);
create index if not exists idx_punch_corrections_status on public.punch_correction_requests(company_id,status);

alter table public.time_correction_requests enable row level security;
alter table public.punch_correction_requests enable row level security;

drop policy if exists correction_isolation on public.time_correction_requests;
drop policy if exists correction_access on public.time_correction_requests;
drop policy if exists correction_select_access on public.time_correction_requests;
drop policy if exists correction_insert_access on public.time_correction_requests;
drop policy if exists correction_manage_access on public.time_correction_requests;

create policy correction_select_access on public.time_correction_requests for select to authenticated
using(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()));
create policy correction_insert_access on public.time_correction_requests for insert to authenticated
with check(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()));
create policy correction_manage_access on public.time_correction_requests for update to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');

drop policy if exists punch_correction_isolation on public.punch_correction_requests;
drop policy if exists punch_correction_access on public.punch_correction_requests;
drop policy if exists punch_correction_select_access on public.punch_correction_requests;
drop policy if exists punch_correction_insert_access on public.punch_correction_requests;
drop policy if exists punch_correction_manage_access on public.punch_correction_requests;

create policy punch_correction_select_access on public.punch_correction_requests for select to authenticated
using(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()));
create policy punch_correction_insert_access on public.punch_correction_requests for insert to authenticated
with check(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()));
create policy punch_correction_manage_access on public.punch_correction_requests for update to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');

-- Fecha a escrita direta de colaboradores em work_schedules: passam a poder ver os seus próprios
-- registos, mas só um papel diferente de 'employee' pode inserir/alterar/apagar.
drop policy if exists schedule_isolation on public.work_schedules;
drop policy if exists schedule_access on public.work_schedules;
drop policy if exists schedule_select_access on public.work_schedules;
drop policy if exists schedule_manage_access on public.work_schedules;

create policy schedule_select_access on public.work_schedules for select to authenticated
using(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()));
create policy schedule_manage_access on public.work_schedules for all to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');

-- Fecha a escrita manual de colaboradores em punches, mantendo a picagem por GPS (source='web',
-- valor por omissão) exatamente como está. Qualquer alteração a uma picagem já existente passa a
-- exigir um papel diferente de 'employee'; uma picagem nova só é aceite de um colaborador quando
-- não é marcada como 'manual'.
drop policy if exists punch_isolation on public.punches;
drop policy if exists punch_access on public.punches;
drop policy if exists punch_select_access on public.punches;
drop policy if exists punch_insert_access on public.punches;
drop policy if exists punch_manage_access on public.punches;
drop policy if exists punch_delete_access on public.punches;

create policy punch_select_access on public.punches for select to authenticated
using(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()));
create policy punch_insert_access on public.punches for insert to authenticated
with check(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or (employee_id=public.current_employee_id() and source is distinct from 'manual')));
create policy punch_manage_access on public.punches for update to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');
create policy punch_delete_access on public.punches for delete to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee');
