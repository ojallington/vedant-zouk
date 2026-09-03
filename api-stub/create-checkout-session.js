/**
 * Stripe Checkout Session endpoint — deploy target for `stripe.mode: 'checkout'`.
 *
 * This file is NOT used by the GitHub Pages site. It is the one piece of server code needed to
 * upgrade from Stripe Payment Links to full Checkout. Drop it into a Vercel project as
 * `api/create-checkout-session.js`, set STRIPE_SECRET_KEY, deploy, then set in shared/site-config.js:
 *
 *   stripe.mode             = 'checkout'
 *   stripe.checkoutEndpoint = 'https://<your-project>.vercel.app/api/create-checkout-session'
 *   stripe.priceIds         = { 'trial': 'price_...', ... }
 *
 * Netlify / Cloudflare Workers equivalents are a near-copy — only the handler signature differs.
 *
 * Deps:  npm i stripe
 */

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Only allow the site itself to call this.
const ALLOWED_ORIGINS = [
  'https://ojallington.github.io',
  'http://127.0.0.1:8899',
  // TODO: add the real custom domain once there is one
];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALLOWED_ORIGINS.includes(origin)) return res.status(403).json({ error: 'Forbidden origin' });

  try {
    const { priceId, reference, email, metadata = {}, successUrl, cancelUrl } = req.body || {};

    if (!priceId) return res.status(400).json({ error: 'Missing priceId' });
    if (!successUrl || !cancelUrl) return res.status(400).json({ error: 'Missing return URLs' });
    // Never trust a client-supplied redirect target.
    if (!ALLOWED_ORIGINS.some((o) => successUrl.startsWith(o) && cancelUrl.startsWith(o))) {
      return res.status(400).json({ error: 'Invalid return URLs' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      client_reference_id: reference || undefined,
      // Stripe metadata values must be strings and are capped at 500 chars each.
      metadata: Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [k, String(v ?? '').slice(0, 500)])
      ),
      success_url: successUrl,
      cancel_url: cancelUrl,
      // German consumer rules: show prices inclusive of tax and collect an address for the invoice.
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('create-checkout-session failed:', err);
    return res.status(500).json({ error: 'Could not create a checkout session.' });
  }
};
