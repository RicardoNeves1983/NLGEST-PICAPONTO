-- NLGest Ponto v0.20: leitura segura do perfil autenticado.
-- Executar uma única vez no SQL Editor do Supabase.

create or replace function public.get_my_access_profile()
returns table(
 id uuid,
 company_id uuid,
 full_name text,
 email text,
 role text,
 active boolean
)
language sql
stable
security definer
set search_path=public
as $$
 select p.id,p.company_id,p.full_name,p.email,p.role,p.active
 from public.profiles p
 where p.id=auth.uid()
 limit 1
$$;

revoke all on function public.get_my_access_profile() from public;
grant execute on function public.get_my_access_profile() to authenticated;

-- Garante novamente o perfil administrativo principal desta instalação.
do $$
declare admin_id uuid;
begin
 select id into admin_id
 from auth.users
 where lower(email)=lower('n.l.gestsolutions@gmail.com')
 limit 1;

 if admin_id is not null then
  update public.profiles
  set role='company_admin',active=true
  where id=admin_id;

  update public.employees
  set profile_id=null
  where profile_id=admin_id;
 end if;
end $$;
