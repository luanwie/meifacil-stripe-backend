// api/create-portal-by-email.js
const Stripe = require("stripe");

// CORS aberto para evitar "failed to fetch"
const allowOrigin = "*";
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "missing_email" });

    const { data: customers } = await stripe.customers.list({ email, limit: 1 });
    const customer = customers[0];
    if (!customer) {
      return res.status(404).json({ error: "customer_not_found_for_email" });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: process.env.SUCCESS_URL // volta para /conta
    });

    return res.status(200).json({ url: portal.url });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
