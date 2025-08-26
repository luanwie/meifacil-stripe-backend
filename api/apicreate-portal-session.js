// api/create-portal-session.js
const Stripe = require("stripe");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { customerId } = req.body || {};
    if (!customerId) return res.status(400).json({ error: "missing_customerId" });

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.SUCCESS_URL // ex.: https://seu-app.base44.app/conta
    });

    return res.status(200).json({ url: portal.url });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
