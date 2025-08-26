// api/stripe-webhook.js
const Stripe = require("stripe");

// IMPORTANTE: para validar a assinatura precisamos do body bruto
module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // capturar o raw body (Buffer)
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const rawBody = Buffer.concat(chunks);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET // você vai colocar no painel da Vercel
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Ajuste essa função para o seu endpoint interno do Base44 (vamos criar depois)
  const updateUser = async (payload) => {
    if (!process.env.INTERNAL_UPDATE_URL) return;
    await fetch(process.env.INTERNAL_UPDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`
      },
      body: JSON.stringify(payload)
    });
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        await updateUser({
          match: { email: s.customer_details?.email, userId: s.client_reference_id },
          set: {
            plan: "pro",
            stripe_customer_id: s.customer,
            stripe_subscription_id: s.subscription
          }
        });
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        if (sub.status === "active" || sub.status === "trialing") {
          await updateUser({ match: { stripe_subscription_id: sub.id }, set: { plan: "pro" } });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await updateUser({ match: { stripe_subscription_id: sub.id }, set: { plan: "free" } });
        break;
      }
      case "invoice.payment_failed": {
        // opcional: notificar / aplicar período de graça
        break;
      }
      case "invoice.payment_succeeded": {
        // opcional: log/recibo
        break;
      }
    }
    return res.json({ received: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
