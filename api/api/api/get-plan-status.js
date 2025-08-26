// api/get-plan-status.js
const Stripe = require("stripe");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "missing_email" });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Localiza o cliente pelo e-mail
    const { data: customers } = await stripe.customers.list({ email, limit: 1 });
    const customer = customers[0];
    if (!customer) {
      return res.status(200).json({ plan: "free", stripe_customer_id: null, stripe_subscription_id: null, status: "no_customer" });
    }

    // Busca a assinatura mais recente
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 3 });

    // Consideramos PRO se estiver active ou trialing (past_due também pode ser tratado como pro, ajuste se quiser)
    const sub = subs.data.find(s => ["active", "trialing", "past_due"].includes(s.status));

    const plan = sub ? "pro" : "free";
    return res.status(200).json({
      plan,
      stripe_customer_id: customer.id,
      stripe_subscription_id: sub ? sub.id : null,
      status: sub ? sub.status : "no_subscription"
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
