/**
 * Single source of truth for every design variation.
 *
 * ⚠️  ALL PRICES AND IDS BELOW ARE PLACEHOLDERS PENDING VEDANT'S CONFIRMATION.
 *     Change them here once and all five variations update.
 *
 * To go live with card payments you only need to fill in `stripe` below —
 * see README.md § "Turning on Stripe".
 */

export const CONFIG = {
  brand: {
    name: 'Miriam & Pavan',
    tagline: 'Brazilian Zouk in Munich',
    city: 'München',
    instagram: 'https://www.instagram.com/pavan_zouk',
    email: 'hello@example.com',           // TODO: real address
    sceneLink: 'https://zoukmunich.com/de/',
  },

  venue: {
    name: 'Tanzstudio Rebecca',
    room: 'White Room',
    city: 'Munich',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Tanzstudio+Rebecca+M%C3%BCnchen',
  },

  /** The two levels Miriam & Pavan actually teach, on Thursdays. */
  levels: [
    {
      id: 'l1',
      number: 1,
      name: 'Beginner',
      time: '20:00 – 21:00',
      start: '20:00',
      end: '21:00',
      description: 'Build strong foundations and confidence in your basic steps.',
      forWho: 'No experience needed. No partner needed. Start here.',
      bookable: true,
    },
    {
      id: 'l3',
      number: 3,
      name: 'Intermediate',
      time: '21:00 – 22:00',
      start: '21:00',
      end: '22:00',
      description: 'Dive deep into principles of head movement and feel the flow.',
      forWho: 'For dancers comfortable with the basic step and basic turns.',
      bookable: true,
    },
  ],

  /** Level 2 exists in the Munich scene but is taught by others — shown for orientation only. */
  otherLevel: {
    number: 2,
    name: 'Improver',
    description: 'Expand your vocabulary by exploring variations.',
    note: 'Taught by other coaches on other nights across Munich.',
  },

  day: 'Thursday',

  /**
   * Bookable options. `stripe.priceId` / `stripe.paymentLink` are filled in later —
   * the booking flow degrades gracefully to cash-only while they are empty.
   */
  options: [
    {
      id: 'trial',
      label: 'Trial class',
      price: 1200,
      blurb: 'Your first class, either level. No commitment.',
      levels: 'one',
      badge: 'Start here',
    },
    {
      id: 'dropin-1',
      label: 'Single class',
      price: 1800,
      blurb: 'One class, one level. Pay as you go.',
      levels: 'one',
    },
    {
      id: 'dropin-2',
      label: 'Both levels, one night',
      price: 3000,
      blurb: 'Level 1 and Level 3 back to back. Two hours.',
      levels: 'both',
      badge: 'Save €6',
    },
    {
      id: 'block-1',
      label: '4-week course — one level',
      price: 6500,
      blurb: 'Four consecutive Thursdays. The best way to actually progress.',
      levels: 'one',
      badge: 'Most popular',
    },
    {
      id: 'block-2',
      label: '4-week course — both levels',
      price: 9500,
      blurb: 'Four Thursdays, both levels. Two hours a week.',
      levels: 'both',
      badge: 'Best value',
    },
  ],

  discounts: [
    { label: 'Partner deal', amount: '−15%', note: 'when two of you book the same option together' },
    { label: 'Student', amount: '−20%', note: 'with a valid student card' },
  ],
  discountNote: "Discounts are applied when we confirm your place — book normally and we'll adjust.",

  currency: 'EUR',
  locale: 'de-DE',

  stripe: {
    /**
     * MODE 'payment-link'  — zero backend. Create a Stripe Payment Link per option in the
     *                        Stripe dashboard and paste the URLs into `paymentLinks` below.
     *                        Works on GitHub Pages as-is. This is the recommended first step.
     *
     * MODE 'checkout'      — needs a tiny serverless endpoint (see /api-stub/).
     *                        Set `checkoutEndpoint` and `publishableKey`.
     *
     * MODE 'off'           — card payment hidden, cash-only. Current default.
     */
    mode: 'off',

    publishableKey: '',                // pk_live_… or pk_test_…
    checkoutEndpoint: '',              // e.g. https://vedant-zouk.vercel.app/api/create-checkout-session

    /** option.id -> Stripe Payment Link URL. Used when mode === 'payment-link'. */
    paymentLinks: {
      'trial': '',
      'dropin-1': '',
      'dropin-2': '',
      'block-1': '',
      'block-2': '',
    },

    /** option.id -> Stripe Price ID. Used when mode === 'checkout'. */
    priceIds: {
      'trial': '',
      'dropin-1': '',
      'dropin-2': '',
      'block-1': '',
      'block-2': '',
    },
  },

  /**
   * Where a cash / request booking is sent when there is no payment.
   * Set to a Formspree (or similar) endpoint. While empty, the flow falls back to
   * opening the user's mail client — which still works, just less smoothly.
   */
  bookingEndpoint: '',                 // e.g. https://formspree.io/f/xxxxxxxx
};

/** 1800 -> "€18" ; 1250 -> "€12,50" */
export function formatPrice(cents, cfg = CONFIG) {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency,
    minimumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

export function getOption(id, cfg = CONFIG) {
  return cfg.options.find((o) => o.id === id) || null;
}

export function getLevel(id, cfg = CONFIG) {
  return cfg.levels.find((l) => l.id === id) || null;
}
