-- NLGest Ponto v0.16: perfis e permissões.
-- Executar uma única vez no SQL Editor do Supabase.

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and active=true $$;

grant execute on function public.current_user_role() to authenticated;

create or replace function public.current_employee_id()
returns uuid language sql stable security definer set search_path=public
as $$ select id from public.employees where profile_id=auth.uid() and active=true limit 1 $$;

grant execute on function public.current_employee_id() to authenticated;

-- Apenas administradores podem alterar funções e associações de acesso.
drop policy if exists profile_isolation on public.profiles;
drop policy if exists profile_select_company on public.profiles;
drop policy if exists profile_update_admin on public.profiles;

create policy profile_select_company on public.profiles for select to authenticated
using(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or id=auth.uid()));

create policy profile_update_admin on public.profiles for update to authenticated
using(company_id=public.current_company_id() and public.current_user_role() in ('super_admin','company_admin'))
with check(company_id=public.current_company_id() and public.current_user_role() in ('super_admin','company_admin'));

-- Colaboradores consultam apenas a própria ficha e os próprios registos.
drop policy if exists employee_isolation on public.employees;
drop policy if exists employee_select_access on public.employees;
drop policy if exists employee_manage_access on public.employees;
create policy employee_select_access on public.employees for select to authenticated
using(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or id=public.current_employee_id()));
create policy employee_manage_access on public.employees for all to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');

drop policy if exists punch_isolation on public.punches;
drop policy if exists punch_access on public.punches;
create policy punch_access on public.punches for all to authenticated
using(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()))
with check(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()));

drop policy if exists schedule_isolation on public.work_schedules;
drop policy if exists schedule_access on public.work_schedules;
create policy schedule_access on public.work_schedules for all to authenticated
using(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()))
with check(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()));

drop policy if exists absence_isolation on public.absence_requests;
drop policy if exists absence_access on public.absence_requests;
create policy absence_access on public.absence_requests for all to authenticated
using(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()))
with check(company_id=public.current_company_id() and (public.current_user_role()<>'employee' or employee_id=public.current_employee_id()));
