# Brazilian Zouk Munich — Miriam & Pavan

Five design variations of a class-booking website, built to be picked from.
All five share the **same content, same booking flow, and same payment plumbing** — only the
visual design differs. Choosing one is a design decision, not a rebuild.

**Live:** https://ojallington.github.io/vedant-zouk/

| | Variation | The idea |
|---|---|---|
| 1 | [Noir Gold](https://ojallington.github.io/vedant-zouk/01-noir-gold/) | The poster, extended into a website. Cinematic, dark, champagne gold. |
| 2 | [Editorial](https://ojallington.github.io/vedant-zouk/02-editorial/) | Warm printed programme. Cream paper, big serif, a real grid. |
| 3 | [Kinetic](https://ojallington.github.io/vedant-zouk/03-kinetic/) | The page moves like the dance. Dark, modern, flowing. |
| 4 | [Swiss](https://ojallington.github.io/vedant-zouk/04-swiss/) | Ruthless clarity. The timetable is the hero. Fastest to book. |
| 5 | [Immersive](https://ojallington.github.io/vedant-zouk/05-immersive/) | Phone-first story-scroll with an app-grade booking sheet. |

---

## ⚠️ Everything below needs Vedant's confirmation

The sites are real and working, but some content had to be filled in to have something to show.
All of it lives in **one file** — `shared/site-config.js` — and changing it there updates all five.

**Prices are placeholders.** They are benchmarked against the nearest competitor
([Zoukseed](https://www.zoukseed.de/prices.html), Wednesdays, Ursula & Stamatis: €20 drop-in,
€69 for a 4-class month, €145 unlimited), deliberately undercut slightly, and simplified from
their five-tier accordion down to five flat, comparable options:

| Option | Placeholder price |
|---|---|
| Trial class | €12 |
| Single class | €18 |
| Both levels, one night | €30 |
| 4-week course, one level | €65 |
| 4-week course, both levels | €95 |

Plus a 15% partner deal and 20% student discount, applied by hand at confirmation.

**Also placeholder:** the contact email, the teacher bio, and the Impressum / Datenschutz links.

**Open questions** are listed in [`docs/brief.md`](docs/brief.md).

---

## Facts the sites are built on

- **Miriam & Pavan**, Brazilian Zouk, Munich — [@pavan_zouk](https://www.instagram.com/pavan_zouk)
- **Thursdays**, Tanzstudio Rebecca — White Room
  - Level 1 · Beginner — 20:00–21:00
  - Level 3 · Intermediate — 21:00–22:00
- Level descriptions are the Munich scene-standard ones, so they match what students see elsewhere.

Source material — the two voice notes and the three images — is in [`docs/`](docs/) and
[`assets/reference/`](assets/reference/). Transcripts: [`docs/transcripts.md`](docs/transcripts.md).

---

## Turning on Stripe

The booking flow is written against Stripe already. It ships in `mode: 'off'` (cash bookings only)
so nothing can take real money by accident. Two ways to switch it on, in `shared/site-config.js`:

### Option A — Payment Links (recommended first step, no server)

1. In the Stripe dashboard, create one **Payment Link** per option (Trial, Single class, …) with the
   matching price.
2. Paste each URL into `CONFIG.stripe.paymentLinks`.
3. Set `CONFIG.stripe.mode = 'payment-link'`.

That's it — works on GitHub Pages with no backend. The customer's email and a booking reference are
passed through to Stripe automatically, so payments can be matched to bookings.

### Option B — Checkout Sessions (needs one small serverless function)

Better UX and full metadata on every payment (level, role, partner name, notes).

1. Deploy [`api-stub/create-checkout-session.js`](api-stub/create-checkout-session.js) to Vercel
   (or Netlify / Cloudflare Workers — near-identical), with `STRIPE_SECRET_KEY` set.
2. Create a **Price** per option in Stripe, paste the IDs into `CONFIG.stripe.priceIds`.
3. Set `CONFIG.stripe.checkoutEndpoint` and `CONFIG.stripe.mode = 'checkout'`.

Either way, **cash at the door keeps working** — it is a first-class option, not a fallback, because
that's how the class actually runs today.

### Where cash bookings go

Set `CONFIG.bookingEndpoint` to a [Formspree](https://formspree.io) endpoint (free tier is enough)
and booking requests are emailed automatically. While it is empty, the flow falls back to opening
the student's mail app with the booking pre-written — still works, just less smooth.

---

## Real accounts

Vedant asked for student logins with a booking history. A static site genuinely cannot do
cross-device accounts — there is no server to hold them.

What ships instead is the honest version: after booking, the record is kept in the browser and shown
back on return visits ("your bookings"). Same benefit for most students, no fake login form.

Real accounts need a backend. The cheapest credible path is **Supabase** (free tier): email
magic-link auth plus a `bookings` table, and a Stripe webhook writing payment status into it. That's
roughly a day of work and it does not change any of the design — `shared/booking-core.js` is the only
file that would need to be swapped.

---

## Working on it

```bash
cd vedant-zouk
python3 -m http.server 8899        # http, not file:// — the sites use ES modules
```
Then http://127.0.0.1:8899/

Screenshot / smoke-test any page in headless Chrome (no dependencies):
```bash
node tools/shot.js http://127.0.0.1:8899/01-noir-gold/ shot.png 390 844
```
It prints console errors and warns about horizontal overflow.

## Layout

```
shared/site-config.js     all content, prices, Stripe keys — the only file to edit for content
shared/booking-core.js    validation, Stripe handoff, cash bookings, local history
01-noir-gold/ … 05-immersive/   the five designs (UI only — they import the shared modules)
assets/                   images used by the sites
assets/reference/         original source images from Vedant
docs/                     brief, transcripts, build spec, original voice notes
api-stub/                 the serverless function needed for Stripe Checkout mode
tools/shot.js             headless screenshot + console-error checker
```

---

## Before this goes live for real

- **Remove the `noindex`.** Every page carries `<meta name="robots" content="noindex, nofollow">`
  while it is a draft with placeholder prices on a personal URL. Delete that line from the chosen
  design (and drop the other four) when it moves to a real domain.
- **Impressum and Datenschutz are required** for a commercial site in Germany. They are currently
  placeholder links.
- Replace the placeholder email and teacher bio in `shared/site-config.js`.
