-- NLGest Ponto v0.30: corrige a eliminação de colaboradores.
-- Executar uma única vez no SQL Editor do Supabase (pode repetir sem problema).
--
-- Cria/atualiza apenas a função archive_employee. NÃO altera
-- current_company_id(), para manter o bloqueio por avença (v0.24).
-- Nota: NÃO voltar a executar employee_deletion_migration.sql (v0.18),
-- porque essa versão antiga reescrevia current_company_id() e anulava o bloqueio.

create or replace function public.archive_employee(target_employee_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare
 target_company uuid;
 linked_profile uuid;
 my_company uuid := public.current_company_id();
 my_role text := public.current_user_role();
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 if my_company is null then raise exception 'Conta sem empresa ativa'; end if;
 if coalesce(my_role,'') not in ('super_admin','company_admin','management','hr_manager','hr_admin') then
  raise exception 'Sem permissão para eliminar colaboradores (perfil: %)', coalesce(my_role,'nenhum');
 end if;

 select company_id,profile_id into target_company,linked_profile
 from public.employees where id=target_employee_id;

 if target_company is null or target_company<>my_company then
  raise exception 'Colaborador não encontrado';
 end if;

 update public.employees set active=false where id=target_employee_id;
 if linked_profile is not null then
  update public.profiles set active=false
  where id=linked_profile and company_id=target_company and role='employee';
 end if;
end $$;

grant execute on function public.archive_employee(uuid) to authenticated;
notify pgrst, 'reload schema';
