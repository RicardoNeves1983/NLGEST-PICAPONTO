-- NLGest Ponto v0.21: ficha completa do colaborador.
-- Executar uma única vez no SQL Editor do Supabase.

alter table public.employees add column if not exists email text;
alter table public.employees add column if not exists phone text;
alter table public.employees add column if not exists weekly_hours numeric(5,2) not null default 40;
