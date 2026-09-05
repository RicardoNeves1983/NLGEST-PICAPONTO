-- NLGest Ponto: estrutura multiempresa segura.
create extension if not exists pgcrypto;

create table public.companies (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 slug text unique not null,
 logo_url text,
 primary_color text not null default '#a67a35',
 plan text not null default 'essential',
 active boolean not null default true,
 created_at timestamptz not null default now()
);

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 full_name text not null,
 email text not null,
 role text not null check(role in ('super_admin','company_admin','supervisor','employee')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);

create table public.clients (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,
 nif text,
 email text,
 active boolean not null default true,
 created_at timestamptz not null default now()
);

create table public.cost_centers (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 client_id uuid not null references public.clients(id) on delete cascade,
 code text not null,
 name text not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(company_id,code)
);

create table public.employees (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 profile_id uuid references public.profiles(id) on delete set null,
 employee_number text,
 full_name text not null,
 job_title text,
 cost_center_id uuid references public.cost_centers(id) on delete set null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(company_id,employee_number)
);

create table public.punches (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 kind text not null check(kind in ('in','out','break_start','break_end')),
 occurred_at timestamptz not null default now(),
 latitude double precision,
 longitude double precision,
 accuracy_m integer,
 cost_center_id uuid references public.cost_centers(id) on delete set null,
 status text not null default 'valid',
 source text not null default 'web'
);

create index idx_profiles_company on public.profiles(company_id);
create index idx_clients_company on public.clients(company_id);
create index idx_centers_company_client on public.cost_centers(company_id,client_id);
create index idx_employees_company_center on public.employees(company_id,cost_center_id);
create index idx_punches_company_employee_date on public.punches(company_id,employee_id,occurred_at);

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path=public
as $$ select company_id from public.profiles where id=auth.uid() and active=true $$;

create or replace function public.bootstrap_company(company_name text, full_name text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare new_company_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if exists(select 1 from public.profiles where id=auth.uid()) then
  return (select company_id from public.profiles where id=auth.uid());
 end if;
 insert into public.companies(name,slug) values(company_name,lower(regexp_replace(company_name,'[^a-zA-Z0-9]+','-','g'))||'-'||left(auth.uid()::text,8)) returning id into new_company_id;
 insert into public.profiles(id,company_id,full_name,email,role) values(auth.uid(),new_company_id,full_name,coalesce(auth.jwt()->>'email',''),'company_admin');
 return new_company_id;
end $$;
grant execute on function public.bootstrap_company(text,text) to authenticated;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.cost_centers enable row level security;
alter table public.employees enable row level security;
alter table public.punches enable row level security;

create policy company_isolation on public.companies for all to authenticated using(id=public.current_company_id()) with check(id=public.current_company_id());
create policy profile_isolation on public.profiles for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy client_isolation on public.clients for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy center_isolation on public.cost_centers for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy employee_isolation on public.employees for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy punch_isolation on public.punches for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
