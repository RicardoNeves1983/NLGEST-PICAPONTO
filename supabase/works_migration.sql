-- NLGest Ponto v0.29: Obras — fiscalização e qualidade (ObraCheck).
-- Executar uma única vez no SQL Editor do Supabase.
--
-- Cada obra passa a ter:
--  * Resumo da obra       → public.works
--  * Especialidades       → public.work_specialties      (criadas automaticamente em cada obra nova)
--  * Checklist de inspeção→ public.work_inspection_points (pontos OK / NOK / Pendente / N/A, correções e reinspeção)
--  * Documentos e validades→ public.work_documents
--  * Fotografias          → public.work_photos            (podem ficar ligadas a uma especialidade e/ou a um ponto)
--  * Ficheiros (fotos e documentos) num bucket privado do Storage chamado "obras".
--
-- Acesso: todos os perfis exceto "Colaborador" consultam e gerem as obras.
-- Eliminar uma obra inteira fica reservado a Administrador e Administração.
-- Uma empresa suspensa perde também o acesso às obras (via current_company_id()).

-- ───────────────────────────── Obras ─────────────────────────────
create table if not exists public.works (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,
 work_type text,
 address text,
 client_id uuid references public.clients(id) on delete set null,
 cost_center_id uuid references public.cost_centers(id) on delete set null,
 owner_name text,              -- Dono de obra
 general_contractor text,      -- Empreiteiro geral
 inspector_name text,          -- Fiscal responsável
 site_director text,           -- Diretor de obra
 start_date date,
 expected_end_date date,
 actual_end_date date,
 status text not null default 'Por iniciar' check(status in ('Por iniciar','Em curso','Suspensa','Concluída','Entregue')),
 notes text,
 created_by uuid references auth.users(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_works_company on public.works(company_id,status);

-- ───────────────────────── Especialidades ─────────────────────────
create table if not exists public.work_specialties (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 work_id uuid not null references public.works(id) on delete cascade,
 name text not null,
 code_prefix text not null default 'GER',
 position integer not null default 0,
 scope text,                   -- Tipo de trabalho / zona
 status text not null default 'Por iniciar' check(status in ('Por iniciar','Em execução','Suspenso','Concluído pelo empreiteiro','A aguardar inspeção','Com anomalias / NOK','A aguardar correção','Correção em curso','Aprovado na reinspeção','Fechado')),
 progress integer not null default 0 check(progress between 0 and 100),
 responsible text,             -- Responsável / subempreiteiro
 planned_start date,
 planned_end date,
 actual_start date,
 actual_end date,
 notes text,
 updated_at timestamptz not null default now()
);
create index if not exists idx_specialties_work on public.work_specialties(work_id,position);

-- ─────────────────────── Checklist de inspeção ───────────────────────
create table if not exists public.work_inspection_points (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 work_id uuid not null references public.works(id) on delete cascade,
 specialty_id uuid references public.work_specialties(id) on delete set null,
 code text,
 zone text,                    -- Piso / zona
 element text not null,        -- Elemento / ponto a verificar
 criterion text,               -- Critério de aceitação / referência
 criterion_source text,        -- Origem do critério
 inspection_date date,
 inspector text,
 result text not null default 'Pendente' check(result in ('OK','NOK','Pendente','N/A')),
 anomaly text,                 -- Descrição da anomalia / observações
 priority text not null default 'Média' check(priority in ('Crítica','Alta','Média','Baixa')),
 correction_owner text,
 correction_status text not null default 'Por tratar' check(correction_status in ('Por tratar','A aguardar correção','Correção em curso','A aguardar reinspeção','Fechado')),
 correction_deadline date,
 reinspection_date date,
 reinspection_result text check(reinspection_result in ('Aprovado','Reprovado','Pendente','N/A')),
 notes text,                   -- Observações adicionais
 created_by uuid references auth.users(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(work_id,code)
);
create index if not exists idx_points_work on public.work_inspection_points(work_id,specialty_id);

-- ───────────────────────── Documentos e validades ─────────────────────────
create table if not exists public.work_documents (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 work_id uuid not null references public.works(id) on delete cascade,
 doc_type text not null default 'Outro' check(doc_type in ('Seguro','Licença / autorização','Certificado / formação','Equipamento / inspeção','Ficha técnica','Declaração de desempenho','Ensaio / relatório','Garantia','Projeto / desenho','Outro')),
 title text not null,          -- Documento / referência
 holder text,                  -- Entidade / titular
 number_version text,          -- N.º / versão
 issue_date date,
 expiry_date date,             -- Validade / próxima verificação (opcional)
 responsible text,
 link text,                    -- Localização / link externo
 file_path text,               -- Ficheiro anexado no Storage
 file_name text,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_documents_work on public.work_documents(work_id,expiry_date);

-- ───────────────────────────── Fotografias ─────────────────────────────
create table if not exists public.work_photos (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 work_id uuid not null references public.works(id) on delete cascade,
 specialty_id uuid references public.work_specialties(id) on delete set null,
 inspection_point_id uuid references public.work_inspection_points(id) on delete set null,
 storage_path text not null,
 thumb_path text,
 caption text,
 taken_at timestamptz not null default now(),
 uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now()
);
create index if not exists idx_photos_work on public.work_photos(work_id,taken_at desc);
create index if not exists idx_photos_point on public.work_photos(inspection_point_id);

-- ───────── Coerência: os registos têm de pertencer à mesma empresa e à mesma obra ─────────
create or replace function public.works_child_guard()
returns trigger language plpgsql as $$
declare j jsonb := to_jsonb(new);
begin
 if not exists(select 1 from public.works w where w.id=new.work_id and w.company_id=new.company_id) then
  raise exception 'A obra não pertence a esta empresa';
 end if;
 if j->>'specialty_id' is not null and not exists(select 1 from public.work_specialties s where s.id=(j->>'specialty_id')::uuid and s.work_id=new.work_id) then
  raise exception 'A especialidade não pertence a esta obra';
 end if;
 if j->>'inspection_point_id' is not null and not exists(select 1 from public.work_inspection_points p where p.id=(j->>'inspection_point_id')::uuid and p.work_id=new.work_id) then
  raise exception 'O ponto de inspeção não pertence a esta obra';
 end if;
 return new;
end $$;

drop trigger if exists trg_specialties_guard on public.work_specialties;
create trigger trg_specialties_guard before insert or update on public.work_specialties for each row execute function public.works_child_guard();
drop trigger if exists trg_points_guard on public.work_inspection_points;
create trigger trg_points_guard before insert or update on public.work_inspection_points for each row execute function public.works_child_guard();
drop trigger if exists trg_documents_guard on public.work_documents;
create trigger trg_documents_guard before insert or update on public.work_documents for each row execute function public.works_child_guard();
drop trigger if exists trg_photos_guard on public.work_photos;
create trigger trg_photos_guard before insert or update on public.work_photos for each row execute function public.works_child_guard();

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists trg_works_touch on public.works;
create trigger trg_works_touch before update on public.works for each row execute function public.touch_updated_at();
drop trigger if exists trg_specialties_touch on public.work_specialties;
create trigger trg_specialties_touch before update on public.work_specialties for each row execute function public.touch_updated_at();
drop trigger if exists trg_points_touch on public.work_inspection_points;
create trigger trg_points_touch before update on public.work_inspection_points for each row execute function public.touch_updated_at();
drop trigger if exists trg_documents_touch on public.work_documents;
create trigger trg_documents_touch before update on public.work_documents for each row execute function public.touch_updated_at();

-- Código automático dos pontos de inspeção: <prefixo da especialidade>-<n.º sequencial>, ex.: IMP-001
create or replace function public.inspection_point_code()
returns trigger language plpgsql as $$
declare prefix text; n integer;
begin
 if new.code is not null and trim(new.code)<>'' then return new; end if;
 select coalesce(s.code_prefix,'GER') into prefix from public.work_specialties s where s.id=new.specialty_id;
 prefix:=coalesce(prefix,'GER');
 perform pg_advisory_xact_lock(hashtext(new.work_id::text||prefix));
 select coalesce(max(substring(p.code from '-(\d+)$')::int),0)+1 into n
 from public.work_inspection_points p where p.work_id=new.work_id and p.code like prefix||'-%';
 new.code:=prefix||'-'||lpad(n::text,3,'0');
 return new;
end $$;
drop trigger if exists trg_points_code on public.work_inspection_points;
create trigger trg_points_code before insert on public.work_inspection_points for each row execute function public.inspection_point_code();

-- Especialidades criadas automaticamente em cada obra nova (as 26 da folha "Especialidades").
create or replace function public.seed_work_specialties()
returns trigger language plpgsql as $$
begin
 insert into public.work_specialties(company_id,work_id,name,code_prefix,position)
 select new.company_id,new.id,t.name,t.prefix,t.pos
 from (values
  ('Preparação e estaleiro','PRE',10),('Demolições','DEM',20),('Movimento de terras','MOV',30),
  ('Fundações','FUN',40),('Estrutura e betão','EST',50),('Pedreiro / alvenarias','PED',60),
  ('Rebocos / estuques','REB',70),('Impermeabilizações','IMP',80),('Coberturas','COB',90),
  ('Fachadas / ETICS','FAC',100),('Serralharia','SER',110),('Caixilharias / vidros','CXL',120),
  ('Pladur / gesso cartonado','PLD',130),('Carpintaria','CAR',140),('Eletricidade','ELE',150),
  ('Canalização','CAN',160),('AVAC / ventilação','AVC',170),('Gás','GAS',180),
  ('Telecomunicações','TEL',190),('Revestimentos cerâmicos','RVC',200),('Pavimentos / soalhos','PAV',210),
  ('Pintura','PIN',220),('Cozinhas / mobiliário','COZ',230),('Arranjos exteriores','EXT',240),
  ('Limpeza final','LIM',250),('Ensaios / vistorias','ENS',260)
 ) as t(name,prefix,pos);
 return new;
end $$;
drop trigger if exists trg_works_seed on public.works;
create trigger trg_works_seed after insert on public.works for each row execute function public.seed_work_specialties();

-- ───────────────────────────── Permissões (RLS) ─────────────────────────────
alter table public.works enable row level security;
alter table public.work_specialties enable row level security;
alter table public.work_inspection_points enable row level security;
alter table public.work_documents enable row level security;
alter table public.work_photos enable row level security;

drop policy if exists works_select on public.works;
drop policy if exists works_insert on public.works;
drop policy if exists works_update on public.works;
drop policy if exists works_delete on public.works;
create policy works_select on public.works for select to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee');
create policy works_insert on public.works for insert to authenticated
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');
create policy works_update on public.works for update to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');
create policy works_delete on public.works for delete to authenticated
using(company_id=public.current_company_id() and public.current_user_role() in ('super_admin','company_admin','management'));

drop policy if exists work_specialties_access on public.work_specialties;
create policy work_specialties_access on public.work_specialties for all to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');

drop policy if exists work_points_access on public.work_inspection_points;
create policy work_points_access on public.work_inspection_points for all to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');

drop policy if exists work_documents_access on public.work_documents;
create policy work_documents_access on public.work_documents for all to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');

drop policy if exists work_photos_access on public.work_photos;
create policy work_photos_access on public.work_photos for all to authenticated
using(company_id=public.current_company_id() and public.current_user_role()<>'employee')
with check(company_id=public.current_company_id() and public.current_user_role()<>'employee');

-- ───────────────────── Storage: bucket privado para fotos e documentos ─────────────────────
-- Estrutura: obras/<company_id>/<work_id>/fotos/... e obras/<company_id>/<work_id>/docs/...
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('obras','obras',false,20971520,array[
 'image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf',
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists obras_files_select on storage.objects;
drop policy if exists obras_files_insert on storage.objects;
drop policy if exists obras_files_update on storage.objects;
drop policy if exists obras_files_delete on storage.objects;
create policy obras_files_select on storage.objects for select to authenticated
using(bucket_id='obras' and (storage.foldername(name))[1]=public.current_company_id()::text and public.current_user_role()<>'employee');
create policy obras_files_insert on storage.objects for insert to authenticated
with check(bucket_id='obras' and (storage.foldername(name))[1]=public.current_company_id()::text and public.current_user_role()<>'employee');
create policy obras_files_update on storage.objects for update to authenticated
using(bucket_id='obras' and (storage.foldername(name))[1]=public.current_company_id()::text and public.current_user_role()<>'employee');
create policy obras_files_delete on storage.objects for delete to authenticated
using(bucket_id='obras' and (storage.foldername(name))[1]=public.current_company_id()::text and public.current_user_role()<>'employee');
