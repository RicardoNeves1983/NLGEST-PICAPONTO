-- NLGest Ponto v0.18: eliminação segura de colaboradores.
-- Executar uma única vez no SQL Editor do Supabase.

create or replace function public.archive_employee(target_employee_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare
 target_company uuid;
 linked_profile uuid;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 if public.current_user_role() not in ('super_admin','company_admin','management','hr_manager','hr_admin') then
  raise exception 'Sem permissão para eliminar colaboradores';
 end if;

 select company_id,profile_id into target_company,linked_profile
 from public.employees
 where id=target_employee_id and active=true;

 if target_company is null or target_company<>public.current_company_id() then
  raise exception 'Colaborador não encontrado';
 end if;

 update public.employees set active=false where id=target_employee_id;
 if linked_profile is not null then
  update public.profiles set active=false
  where id=linked_profile and company_id=target_company and role='employee';
 end if;
end $$;

grant execute on function public.archive_employee(uuid) to authenticated;

-- Perfis desativados deixam de conceder permissões ou acesso aos dados.
create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path=public
as $$ select company_id from public.profiles where id=auth.uid() and active=true limit 1 $$;

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and active=true limit 1 $$;

create or replace function public.current_employee_id()
returns uuid language sql stable security definer set search_path=public
as $$ select id from public.employees where profile_id=auth.uid() and active=true limit 1 $$;
