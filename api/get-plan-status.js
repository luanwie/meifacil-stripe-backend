// api/get-plan-status.js
const Stripe = require("stripe");

// CORS amplo
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
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "missing_email" });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { data: customers } = await stripe.customers.list({ email, limit: 1 });
    const customer = customers[0];
    if (!customer) {
      return res.status(200).json({
        plan: "free",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        status: "no_customer"
      });
    }

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 3
    });
    const sub = subs.data.find(s =>
      ["active", "trialing", "past_due"].includes(s.status)
    );

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
