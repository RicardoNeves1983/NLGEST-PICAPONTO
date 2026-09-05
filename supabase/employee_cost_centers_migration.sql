-- NLGest Ponto v0.25: colaboradores podem ficar sem centro de custo atribuído
-- ou ser alocados a vários centros de custo em simultâneo.
-- Executar uma única vez no SQL Editor do Supabase.

create table if not exists public.employee_cost_centers (
 company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 cost_center_id uuid not null references public.cost_centers(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(employee_id,cost_center_id)
);

alter table public.employee_cost_centers enable row level security;
drop policy if exists employee_center_isolation on public.employee_cost_centers;
create policy employee_center_isolation on public.employee_cost_centers for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());

-- migra as atribuições únicas já existentes (employees.cost_center_id) para a nova tabela,
-- sem apagar a coluna antiga (fica por usar, mas intacta, por segurança).
insert into public.employee_cost_centers(company_id,employee_id,cost_center_id)
select company_id,id,cost_center_id from public.employees where cost_center_id is not null
on conflict do nothing;
