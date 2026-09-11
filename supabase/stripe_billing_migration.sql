-- NLGest Ponto v0.27: colunas de integração com o Stripe para cobrança
-- automática da avença mensal.
-- Executar uma única vez no SQL Editor do Supabase.

alter table public.companies add column if not exists stripe_customer_id text;
alter table public.companies add column if not exists stripe_subscription_id text;

create index if not exists idx_companies_stripe_customer
  on public.companies(stripe_customer_id);
