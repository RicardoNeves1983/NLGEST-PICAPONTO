-- NLGest Ponto v0.23: eliminação de empresas clientes pela plataforma.
-- Executar uma única vez no SQL Editor do Supabase.

-- Elimina definitivamente uma empresa cliente e todos os seus dados
-- (colaboradores, picagens, ausências, documentos, convites, etc.),
-- que estão todos ligados a companies(id) com "on delete cascade" desde o schema base.
-- As contas de acesso (auth.users) dos utilizadores dessa empresa não são apagadas —
-- ficam apenas sem perfil/empresa associada, o que impede qualquer acesso a dados.
create or replace function public.platform_delete_company(target_company_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.is_platform_admin() then raise exception 'Sem permissão para eliminar empresas'; end if;
 if not exists(select 1 from public.companies where id=target_company_id) then
  raise exception 'Empresa não encontrada';
 end if;
 delete from public.companies where id=target_company_id;
end $$;

grant execute on function public.platform_delete_company(uuid) to authenticated;
