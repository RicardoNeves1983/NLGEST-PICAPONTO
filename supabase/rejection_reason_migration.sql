-- NLGest Ponto v0.15: justificação das rejeições.
-- Executar uma única vez no SQL Editor do Supabase.

alter table public.absence_requests
add column if not exists decision_reason text;

alter table public.absence_requests
add column if not exists decided_at timestamptz;

