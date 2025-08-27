// api/get-prices.js
const Stripe = require("stripe");

// CORS aberto
const allowOrigin = "*";
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function centsToBRL(cents) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Busca os dois prices pelas ENVs já configuradas
    const [monthly, annual] = await Promise.all([
      stripe.prices.retrieve(process.env.PRICE_MONTHLY),
      stripe.prices.retrieve(process.env.PRICE_ANNUAL)
    ]);

    const out = {
      monthly: {
        id: monthly.id,
        unit_amount: monthly.unit_amount, // em centavos
        formatted: centsToBRL(monthly.unit_amount),
        currency: monthly.currency,
        interval: monthly.recurring?.interval || "month"
      },
      annual: {
        id: annual.id,
        unit_amount: annual.unit_amount,
        formatted: centsToBRL(annual.unit_amount),
        currency: annual.currency,
        interval: annual.recurring?.interval || "year",
        // equivalente mensal (apenas informativo)
        per_month_formatted: centsToBRL(Math.round((annual.unit_amount / 12)))
      }
    };

    res.status(200).json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
