-- NLGest Ponto v0.22: painel de plataforma (super admin) e avenças de clientes.
-- Executar uma única vez no SQL Editor do Supabase.

-- Contas com acesso à plataforma (não a uma empresa em particular).
create table if not exists public.platform_admins (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 email text,
 created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
drop policy if exists platform_admins_self on public.platform_admins;
create policy platform_admins_self on public.platform_admins for select to authenticated
using(id=auth.uid());

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.platform_admins where id=auth.uid()) $$;

grant execute on function public.is_platform_admin() to authenticated;

-- Dados de avença por empresa cliente.
alter table public.companies add column if not exists billing_status text not null default 'trial'
 check(billing_status in ('trial','active','overdue','suspended','cancelled'));
alter table public.companies add column if not exists monthly_fee numeric(10,2);
alter table public.companies add column if not exists next_due_date date;
alter table public.companies add column if not exists billing_notes text;
alter table public.companies add column if not exists admin_email text;

-- O super admin passa a ver todas as empresas; as restantes tabelas continuam isoladas por empresa.
drop policy if exists company_isolation on public.companies;
create policy company_isolation on public.companies for all to authenticated
using(id=public.current_company_id() or public.is_platform_admin())
with check(id=public.current_company_id() or public.is_platform_admin());

-- Convites para o primeiro administrador de uma empresa cliente nova (sem ficha de colaborador associada).
create table if not exists public.company_admin_invites (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 code text unique not null,
 expires_at timestamptz not null default (now() + interval '7 days'),
 used_at timestamptz,
 used_by uuid references auth.users(id) on delete set null,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

alter table public.company_admin_invites enable row level security;
drop policy if exists company_admin_invite_platform_access on public.company_admin_invites;
create policy company_admin_invite_platform_access on public.company_admin_invites for all to authenticated
using(public.is_platform_admin())
with check(public.is_platform_admin());

-- Cria uma empresa cliente nova (só o super admin).
create or replace function public.platform_create_company(company_name text, admin_email text, monthly_fee numeric default null)
returns uuid language plpgsql security definer set search_path=public
as $$
declare new_company_id uuid;
begin
 if not public.is_platform_admin() then raise exception 'Sem permissão para criar empresas'; end if;
 insert into public.companies(name,slug,plan,billing_status,monthly_fee,admin_email)
 values(
  company_name,
  lower(regexp_replace(company_name,'[^a-zA-Z0-9]+','-','g'))||'-'||substr(md5(random()::text),1,6),
  'essential','trial',monthly_fee,admin_email
 )
 returning id into new_company_id;
 return new_company_id;
end $$;

grant execute on function public.platform_create_company(text,text,numeric) to authenticated;

-- Gera (ou renova) o código de acesso do administrador de uma empresa cliente.
create or replace function public.platform_create_company_admin_invite(target_company_id uuid)
returns public.company_admin_invites language plpgsql security definer set search_path=public
as $$
declare created public.company_admin_invites%rowtype;
begin
 if not public.is_platform_admin() then raise exception 'Sem permissão para gerar convites'; end if;
 update public.company_admin_invites set expires_at=now() where company_id=target_company_id and used_at is null;
 insert into public.company_admin_invites(company_id,code,created_by)
 values(target_company_id,'NLG-ADM-'||upper(substr(md5(random()::text),1,8)),auth.uid())
 returning * into created;
 return created;
end $$;

grant execute on function public.platform_create_company_admin_invite(uuid) to authenticated;

-- Resgate de código de acesso: tenta primeiro convite de administrador, depois convite de colaborador.
create or replace function public.accept_access_code(access_code text, full_name text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare admin_invite public.company_admin_invites%rowtype;
declare emp_invite public.employee_invites%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if exists(select 1 from public.profiles where id=auth.uid()) then
  return (select company_id from public.profiles where id=auth.uid());
 end if;

 select * into admin_invite from public.company_admin_invites
  where upper(code)=upper(trim(access_code)) and used_at is null and expires_at>now()
  for update;
 if admin_invite.id is not null then
  insert into public.profiles(id,company_id,full_name,email,role)
  values(auth.uid(),admin_invite.company_id,coalesce(nullif(trim(full_name),''),'Administrador'),coalesce(auth.jwt()->>'email',''),'company_admin');
  update public.company_admin_invites set used_at=now(),used_by=auth.uid() where id=admin_invite.id;
  return admin_invite.company_id;
 end if;

 select * into emp_invite from public.employee_invites
  where upper(code)=upper(trim(access_code)) and used_at is null and expires_at>now()
  for update;
 if emp_invite.id is not null then
  insert into public.profiles(id,company_id,full_name,email,role)
  values(auth.uid(),emp_invite.company_id,coalesce(nullif(trim(full_name),''),'Colaborador'),coalesce(auth.jwt()->>'email',''),emp_invite.role);
  update public.employees set profile_id=auth.uid() where id=emp_invite.employee_id and company_id=emp_invite.company_id;
  update public.employee_invites set used_at=now(),used_by=auth.uid() where id=emp_invite.id;
  return emp_invite.company_id;
 end if;

 raise exception 'Código inválido ou expirado';
end $$;

grant execute on function public.accept_access_code(text,text) to authenticated;

-- Deixa de haver criação livre de empresas: só o super admin cria clientes novos a partir de agora.
revoke execute on function public.bootstrap_company(text,text) from authenticated;

-- Garante que a conta principal desta instalação é super admin da plataforma.
do $$
declare admin_id uuid;
begin
 select id into admin_id from auth.users where lower(email)=lower('n.l.gestsolutions@gmail.com') limit 1;
 if admin_id is not null then
  insert into public.platform_admins(id,full_name,email)
  values(admin_id,'Ricardo Neves','n.l.gestsolutions@gmail.com')
  on conflict (id) do nothing;
 end if;
end $$;
