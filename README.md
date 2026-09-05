# NLGest Ponto

MVP multiempresa para registo de assiduidade com geolocalização, centros de custo e futura integração PHC.

## Executar

```bash
npm install
npm run dev
```

## Estado

## Ativar a base de dados

1. Abra o SQL Editor do projeto Supabase.
2. Execute integralmente `supabase/schema.sql`.
3. Reinicie a aplicação e crie a primeira conta.

A versão 0.3 inclui autenticação e persistência Supabase para clientes, centros de custo e colaboradores. O conector PHC será ligado numa fase posterior.

## Atualização 0.4 — Portal do Colaborador

Para uma base de dados já criada, execute apenas `supabase/portal_migration.sql` no SQL Editor. Esta atualização acrescenta horários, banco de horas, pedidos de férias e ausências, circuito de aprovação, documentos, alterações de dados pessoais e comunicações.

## Atualização 0.13 — Persistência integral

Numa base de dados existente, execute `supabase/persistence_migration.sql` no SQL Editor. Depois, as picagens, correções manuais, mapas mensais e férias/ausências passam a ser guardados no Supabase e ficam disponíveis nos vários dispositivos.

## Atualização 0.16 — Perfis e permissões

Execute `supabase/permissions_migration.sql` uma vez no SQL Editor. A área Configuração permite atribuir os perfis Administrador, Administração, RH, Responsável de Obra e Colaborador, associando as contas de colaborador à respetiva ficha.

## Atualização 0.17 — Convites seguros

Execute `supabase/invitations_migration.sql` uma vez no SQL Editor. Em **Configuração**, o administrador pode criar um código individual para cada colaborador. O código expira ao fim de sete dias e só pode ser usado uma vez. A conta administrativa atual fica protegida e a base de dados impede que a empresa fique sem administrador.

## Atualização 0.18 — Eliminação segura de colaboradores

Execute `supabase/employee_deletion_migration.sql` uma vez no SQL Editor. O administrador pode eliminar um colaborador após confirmação. A ficha e o acesso ficam desativados, deixando de aparecer na aplicação, enquanto o histórico laboral permanece preservado.

## Atualização 0.20 — Recuperação segura do acesso

Execute `supabase/access_recovery_migration.sql` uma vez no SQL Editor. O perfil da conta autenticada passa a ser obtido por uma função segura e independente das políticas gerais das tabelas, evitando que um administrador apareça incorretamente como colaborador.

## Atualização 0.21 — Edição de colaboradores

Execute `supabase/employee_details_migration.sql` uma vez no SQL Editor. A ficha administrativa do colaborador passa a incluir número interno, email, telefone, horário semanal, função, centro de custo e estado ativo/inativo.

## Atualização 0.22 — Painel de plataforma e avenças

Execute `supabase/platform_migration.sql` uma vez no SQL Editor. A conta `n.l.gestsolutions@gmail.com` passa a ser administradora da plataforma (super admin) e, ao entrar, vê um novo **Painel de plataforma** com a lista de todas as empresas clientes, o estado da avença de cada uma (em teste, ativa, em atraso, suspensa ou cancelada), o valor mensal e a próxima data de vencimento. É a partir daí que se cria cada empresa cliente nova e se gera o código de acesso para o primeiro administrador dela — deixa de haver registo livre sem código. Um botão "Ver a minha empresa" permite alternar entre o painel e a área normal da aplicação.

## Atualização 0.23 — Eliminação de empresas clientes

Execute `supabase/company_deletion_migration.sql` uma vez no SQL Editor. No Painel de plataforma, cada empresa passa a ter um botão para a eliminar definitivamente — a ação exige escrever o nome exato da empresa para confirmar, porque apaga sem possibilidade de recuperação todos os dados dessa empresa (colaboradores, picagens, ausências, documentos e códigos de acesso). As contas de acesso (login) dos utilizadores dessa empresa não são apagadas, apenas deixam de ter empresa associada.

## Atualização 0.24 — Suspensão de acesso por incumprimento de avença

Execute `supabase/company_suspension_migration.sql` uma vez no SQL Editor. No Painel de plataforma, cada empresa passa a ter um botão para suspender ou reativar o acesso: ao suspender, todos os utilizadores dessa empresa (incluindo o administrador) deixam imediatamente de conseguir carregar qualquer dado — perfis, colaboradores, clientes, centros de custo, picagens, ausências, etc. Ao reativar, o acesso volta ao normal de imediato. Útil para bloquear o acesso enquanto a avença estiver em atraso.

## Atualização 0.25 — Colaboradores sem centro de custo obrigatório

Execute `supabase/employee_cost_centers_migration.sql` uma vez no SQL Editor. Deixa de ser obrigatório atribuir um centro de custo ao criar um colaborador, e cada colaborador pode agora ficar alocado a vários centros de custo em simultâneo (ou a nenhum). A atribuição de centros faz-se ao criar o colaborador ou ao editar a sua ficha, com seleção múltipla (Ctrl/Cmd+clique para selecionar vários).
