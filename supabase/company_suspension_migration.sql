-- NLGest Ponto v0.24: bloqueio de acesso por incumprimento de avença.
-- Executar uma única vez no SQL Editor do Supabase.
--
-- Nota: o ficheiro anterior estava corrompido (continha apenas o texto
-- "npm run dev" em vez de SQL), pelo que esta migração nunca tinha sido
-- aplicada. Esta versão corrige isso.
--
-- current_company_id() é usada por TODAS as políticas de RLS
-- (companies, profiles, clients, cost_centers, employees, punches).
-- Ao devolver null quando a empresa está suspensa/cancelada, o acesso
-- a todos os dados dessa empresa fica automaticamente bloqueado,
-- sem ser preciso tocar em cada política individualmente.

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path=public
as $$
  select p.company_id
  from public.profiles p
  join public.companies c on c.id = p.company_id
  where p.id = auth.uid()
    and p.active = true
    and c.billing_status not in ('suspended','cancelled')
$$;
