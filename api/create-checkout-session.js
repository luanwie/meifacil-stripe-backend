// api/create-checkout-session.js
const Stripe = require("stripe");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { userId, email, plan } = req.body || {};

    if (!userId || !email || !plan) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const priceId =
      plan === "annual" ? process.env.PRICE_ANNUAL : process.env.PRICE_MONTHLY;

    if (!priceId) {
      return res.status(500).json({ error: "price_not_configured" });
    }

    // Reaproveita customer pelo e-mail
    const list = await stripe.customers.list({ email, limit: 1 });
    const customer =
      list.data[0] ||
      (await stripe.customers.create({ email, metadata: { userId } }));

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.SUCCESS_URL}?ok=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CANCEL_URL}?cancel=1`,
      client_reference_id: userId,
      subscription_data: { metadata: { userId } },
      allow_promotion_codes: true
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
