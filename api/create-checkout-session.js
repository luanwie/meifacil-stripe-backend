// api/create-checkout-session.js
const Stripe = require("stripe");

// CORS amplo para evitar "failed to fetch"
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

    // Tenta ler do body; se não vier, tenta querystring; se não vier, assume "monthly"
    const urlObj = new URL(req.url, "http://localhost");
    const qsPlan = urlObj.searchParams.get("plan");
    const body = req.body || {};
    const userId = body.userId || null;
    const email = body.email || null;
    const plan = (body.plan || qsPlan || "monthly").toLowerCase();

    const priceId =
      plan === "annual" ? process.env.PRICE_ANNUAL : process.env.PRICE_MONTHLY;
    if (!priceId) return res.status(500).json({ error: "price_not_configured" });

    // Se tiver e-mail, reaproveita customer; senão, Checkout cria
    let customerId;
    if (email) {
      const list = await stripe.customers.list({ email, limit: 1 });
      const customer =
        list.data[0] ||
        (await stripe.customers.create({
          email,
          metadata: userId ? { userId } : undefined
        }));
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(customerId ? { customer: customerId } : {}),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.SUCCESS_URL}?ok=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CANCEL_URL}?cancel=1`,
      ...(userId ? { client_reference_id: userId } : {}),
      allow_promotion_codes: true
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
