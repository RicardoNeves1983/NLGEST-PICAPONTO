-- NLGest Ponto v0.17: convites seguros de colaboradores.
-- Executar uma única vez no SQL Editor do Supabase.

create table if not exists public.employee_invites (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 code text unique not null,
 role text not null default 'employee' check(role in ('employee','site_manager','hr_admin','hr_manager','management')),
 expires_at timestamptz not null default (now() + interval '7 days'),
 used_at timestamptz,
 used_by uuid references auth.users(id) on delete set null,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

alter table public.employee_invites enable row level security;
drop policy if exists invite_admin_access on public.employee_invites;
create policy invite_admin_access on public.employee_invites for all to authenticated
using(company_id=public.current_company_id() and public.current_user_role() in ('super_admin','company_admin'))
with check(company_id=public.current_company_id() and public.current_user_role() in ('super_admin','company_admin'));

create or replace function public.accept_company_invite(invite_code text, full_name text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare invitation public.employee_invites%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if exists(select 1 from public.profiles where id=auth.uid()) then
  return (select company_id from public.profiles where id=auth.uid());
 end if;
 select * into invitation from public.employee_invites
  where upper(code)=upper(trim(invite_code)) and used_at is null and expires_at>now()
  for update;
 if invitation.id is null then raise exception 'Convite inválido ou expirado'; end if;
 insert into public.profiles(id,company_id,full_name,email,role)
 values(auth.uid(),invitation.company_id,coalesce(nullif(trim(full_name),''),'Colaborador'),coalesce(auth.jwt()->>'email',''),invitation.role);
 update public.employees set profile_id=auth.uid() where id=invitation.employee_id and company_id=invitation.company_id;
 update public.employee_invites set used_at=now(),used_by=auth.uid() where id=invitation.id;
 return invitation.company_id;
end $$;

grant execute on function public.accept_company_invite(text,text) to authenticated;

-- A empresa nunca pode ficar sem uma conta administrativa.
create or replace function public.protect_last_company_admin()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if old.role in ('super_admin','company_admin')
    and new.role not in ('super_admin','company_admin')
    and (select count(*) from public.profiles
         where company_id=old.company_id and active=true
           and role in ('super_admin','company_admin')) <= 1 then
  raise exception 'A empresa tem de manter pelo menos um administrador.';
 end if;
 return new;
end $$;

drop trigger if exists protect_last_company_admin_trigger on public.profiles;
create trigger protect_last_company_admin_trigger
before update of role on public.profiles
for each row execute function public.protect_last_company_admin();
