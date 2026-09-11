# Cobrança automática da avença — passos a fazer

O código já está pronto no projeto (ficheiros novos/corrigidos abaixo).
Faltam apenas passos que só podem ser feitos por si, fora do código:
contas, chaves e configuração de painéis.

## Ficheiros que foram criados/corrigidos

- `supabase/company_suspension_migration.sql` — **corrigido**. Estava
  corrompido (continha só o texto `npm run dev`), pelo que o bloqueio
  de acesso a empresas suspensas/em atraso nunca tinha sido realmente
  aplicado. Agora tem o SQL correto.
- `supabase/stripe_billing_migration.sql` — **novo**. Acrescenta
  `stripe_customer_id` e `stripe_subscription_id` à tabela `companies`.
- `api/create-company-subscription.ts` — **novo**. Gera o link de
  pagamento Stripe para uma empresa cliente, com o valor exato do
  `monthly_fee` dela.
- `api/stripe-webhook.ts` — **novo**. Recebe os avisos do Stripe e
  atualiza sozinho o `billing_status` e o `next_due_date` da empresa.
- `package.json` — adicionadas as dependências `stripe` e
  `@vercel/node`.
- `.env.example` — acrescentadas as variáveis novas (ver abaixo).

## O que falta fazer do seu lado

1. **Executar as duas migrações no Supabase.** SQL Editor do projeto →
   correr `supabase/company_suspension_migration.sql` e depois
   `supabase/stripe_billing_migration.sql`.

2. **Instalar as dependências novas.** No projeto: `npm install`
   (vai buscar o `stripe` e o `@vercel/node` que foram acrescentados ao
   `package.json`).

3. **Criar conta Stripe** (stripe.com), se ainda não tiver — é grátis
   até começar a cobrar. Ativar a conta para pagamentos reais implica
   verificação de identidade/empresa.

4. **Obter as chaves Stripe** (dashboard → Developers → API keys):
   - `STRIPE_SECRET_KEY` — chave secreta (começa por `sk_`).

5. **Configurar o webhook no Stripe** (dashboard → Developers →
   Webhooks → Add endpoint):
   - URL: `https://<o-seu-domínio-final>/api/stripe-webhook`
   - Eventos a selecionar: `checkout.session.completed`,
     `invoice.paid`, `invoice.payment_failed`,
     `customer.subscription.deleted`
   - Depois de criado, o Stripe mostra a `STRIPE_WEBHOOK_SECRET`
     (começa por `whsec_`) — copiar.

6. **Obter a Service Role Key do Supabase** (dashboard do projeto →
   Project Settings → API → `service_role` — é secreta, nunca a
   publique nem a use no frontend).

7. **Adicionar as variáveis de ambiente no Vercel** (Project Settings
   → Environment Variables), para produção:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `PUBLIC_APP_URL` (o domínio final da app)

8. **Confirmar o domínio de produção definitivo no Vercel** antes de
   configurar o webhook e o `PUBLIC_APP_URL` — se mudar o domínio
   depois, tem de atualizar os dois.

## O que ainda não está feito (próximo passo natural)

O botão de "criar empresa" no Painel de Plataforma ainda não chama o
`api/create-company-subscription`. Por agora, para ativar uma empresa
nova:

1. Cria a empresa no painel como já fazia (`monthly_fee` preenchido).
2. Chama o endpoint `/api/create-company-subscription` com
   `{ companyId, companyName, monthlyFee, adminEmail }` (posso ligar
   isto diretamente ao botão do painel, se quiser, numa próxima
   iteração).
3. Envia o link (`url` devolvido) ao administrador da empresa cliente
   para ativar o pagamento.

Depois do primeiro pagamento, o resto passa a ser automático: o
webhook mantém o `billing_status` sempre atualizado sozinho.
