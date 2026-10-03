-- NLGest Ponto v0.28: logótipo e cor de marca por empresa cliente.
-- Executar uma única vez no SQL Editor do Supabase.
--
-- As colunas logo_url e primary_color já existem na tabela companies desde
-- o início do projeto, mas nunca tinham sido usadas pela aplicação. Esta
-- versão liga-as ao ecrã de entrada e à área interna, para que cada empresa
-- cliente possa mostrar o seu próprio logótipo e cor em vez da marca NLGest
-- Ponto por omissão.

-- Função pública (chamável sem sessão iniciada) que devolve apenas o nome,
-- o logótipo e a cor de uma empresa a partir do seu "slug", para mostrar a
-- marca certa no ecrã de entrada antes do colaborador iniciar sessão.
-- Não expõe mais nenhum dado da empresa (nem avença, nem contactos, etc.).
create or replace function public.company_branding(p_slug text)
returns table(name text, logo_url text, primary_color text)
language sql stable security definer set search_path=public
as $$
  select name, logo_url, primary_color
  from public.companies
  where slug = p_slug and active = true and billing_status not in ('suspended','cancelled')
  limit 1
$$;

grant execute on function public.company_branding(text) to anon, authenticated;

-- Aplica o logótipo e a cor da Companhia das Obras (primeiro cliente a
-- pedir identidade visual própria). O ficheiro do logótipo é entregue com
-- esta atualização em public/brands/companhia-das-obras.png.
update public.companies
set logo_url = '/brands/companhia-das-obras.png',
    primary_color = '#477d37'
where name ilike '%companhia das obras%';
