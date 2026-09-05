-- Executar uma única vez no SQL Editor depois de schema.sql.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in ('super_admin','company_admin','site_manager','hr_manager','hr_admin','management','supervisor','employee'));

create table if not exists public.work_schedules (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade, work_date date not null,
 planned_start time, planned_end time, planned_minutes integer not null default 0, unique(employee_id,work_date)
);
create table if not exists public.time_balances (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade, year integer not null,
 month integer not null, planned_minutes integer not null default 0, worked_minutes integer not null default 0,
 overtime_minutes integer not null default 0, unique(employee_id,year,month)
);
create table if not exists public.absence_requests (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 request_type text not null, start_date date not null, end_date date not null, notes text,
 status text not null default 'pending_site_manager', current_step text not null default 'site_manager',
 created_at timestamptz not null default now()
);
create table if not exists public.request_approvals (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 request_id uuid not null references public.absence_requests(id) on delete cascade,
 approver_id uuid references public.profiles(id), approval_role text not null,
 decision text check(decision in ('approved','rejected')), comments text, decided_at timestamptz
);
create table if not exists public.employee_documents (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 document_type text not null, title text not null, storage_path text not null,
 reference_month date, uploaded_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.communications (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 title text not null, body text not null, published_at timestamptz, active boolean not null default true,
 created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.profile_change_requests (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 field_name text not null, old_value text, requested_value text not null,
 status text not null default 'pending', reviewed_by uuid references public.profiles(id), created_at timestamptz not null default now()
);

create index if not exists idx_schedules_employee_date on public.work_schedules(company_id,employee_id,work_date);
create index if not exists idx_absence_employee_status on public.absence_requests(company_id,employee_id,status);
create index if not exists idx_documents_employee on public.employee_documents(company_id,employee_id,created_at);
create index if not exists idx_communications_company on public.communications(company_id,published_at);

alter table public.work_schedules enable row level security; alter table public.time_balances enable row level security;
alter table public.absence_requests enable row level security; alter table public.request_approvals enable row level security;
alter table public.employee_documents enable row level security; alter table public.communications enable row level security;
alter table public.profile_change_requests enable row level security;

create policy schedule_isolation on public.work_schedules for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy balance_isolation on public.time_balances for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy absence_isolation on public.absence_requests for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy approval_isolation on public.request_approvals for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy document_isolation on public.employee_documents for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy communication_isolation on public.communications for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy profile_change_isolation on public.profile_change_requests for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
