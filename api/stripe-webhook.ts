// api/stripe-webhook.ts
//
// Recebe os eventos do Stripe e mantém billing_status/next_due_date
// de public.companies sincronizados automaticamente — sem precisar de
// mexer no Painel de Plataforma manualmente.
//
// Configurar no dashboard do Stripe (Developers > Webhooks):
//   URL: https://<o-seu-dominio>/api/stripe-webhook
//   Eventos: checkout.session.completed, invoice.paid,
//            invoice.payment_failed, customer.subscription.deleted

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Precisamos do corpo em bruto (não interpretado) para validar a
// assinatura do Stripe — por isso desligamos o bodyParser da Vercel.
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

// Usa a service_role key do Supabase (nunca a anon key) porque este
// endpoint corre no servidor e tem de poder atualizar qualquer
// empresa, sem estar sujeito às políticas de RLS de um utilizador.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.status(405).send("Método não permitido.");
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).send("Falta a assinatura do Stripe.");
    return;
  }

  let event: Stripe.Event;

  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("Assinatura do webhook Stripe inválida:", err);
    res.status(400).send("Assinatura inválida.");
    return;
  }

  try {
    switch (event.type) {
      // Primeiro pagamento confirmado: ligamos o cliente Stripe à
      // empresa certa (via metadata.company_id) e ativamos a avença.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (companyId && customerId) {
          await supabaseAdmin
            .from("companies")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId ?? null,
              billing_status: "active",
            })
            .eq("id", companyId);
        }
        break;
      }

      // Cobrança mensal paga com sucesso: mantém/repõe "active" e
      // atualiza a data do próximo vencimento.
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        const periodEnd = invoice.lines.data[0]?.period?.end;

        if (customerId) {
          await supabaseAdmin
            .from("companies")
            .update({
              billing_status: "active",
              next_due_date: periodEnd
                ? new Date(periodEnd * 1000).toISOString().slice(0, 10)
                : null,
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      // Cobrança falhou (cartão recusado, etc.): passa a "overdue".
      // A partir daqui, current_company_id() já bloqueia o acesso
      // assim que o estado for "suspended" — este evento por si só
      // ainda não suspende, só assinala o atraso.
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          await supabaseAdmin
            .from("companies")
            .update({ billing_status: "overdue" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      // Subscrição cancelada (por si ou pelo cliente): bloqueia o
      // acesso de imediato.
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        if (customerId) {
          await supabaseAdmin
            .from("companies")
            .update({ billing_status: "cancelled" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        // Outros eventos do Stripe são ignorados de propósito.
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Erro ao processar evento Stripe:", err);
    res.status(500).send("Erro interno ao processar o evento.");
  }
}
