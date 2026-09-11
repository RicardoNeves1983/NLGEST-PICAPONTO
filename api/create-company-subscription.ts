// api/create-company-subscription.ts
//
// Gera um link de subscrição mensal recorrente no Stripe para uma
// empresa cliente criada no Painel de Plataforma. O valor cobrado é o
// monthly_fee definido para essa empresa (por isso o preço é montado
// dinamicamente em vez de vir de um "Price" fixo criado à mão no
// Stripe).
//
// Chamar com POST { companyId, companyName, monthlyFee, adminEmail }
// Devolve { url } — o link a enviar ao cliente para ativar a avença.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { companyId, companyName, monthlyFee, adminEmail } = req.body ?? {};

  if (!companyId || !monthlyFee) {
    res
      .status(400)
      .json({ error: "companyId e monthlyFee são obrigatórios." });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: adminEmail || undefined,
      locale: "pt",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Avença NLGest Ponto — ${companyName || "Empresa cliente"}`,
            },
            unit_amount: Math.round(Number(monthlyFee) * 100),
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      // metadata em ambos os sítios: a sessão de checkout E a
      // subscrição criada a partir dela transportam o company_id, para
      // o webhook conseguir sempre saber a que empresa pertence.
      metadata: { company_id: companyId },
      subscription_data: {
        metadata: { company_id: companyId },
      },
      success_url: `${process.env.PUBLIC_APP_URL}/subscricao-confirmada?empresa=${companyId}`,
      cancel_url: `${process.env.PUBLIC_APP_URL}/subscricao-cancelada?empresa=${companyId}`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Erro ao criar sessão Stripe:", err);
    res.status(500).json({ error: "Não foi possível criar a subscrição." });
  }
}
