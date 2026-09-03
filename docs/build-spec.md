# Build spec — shared across all 5 design variations

Every variation ships the SAME content, the SAME booking flow, and the SAME config contract.
Only the visual design differs. Vedant picks a look, not a rebuild.

## Hard constraints
- Static site. No build step, no framework, no npm. Plain HTML + CSS + vanilla JS (ES modules ok).
- Must work when served from a subpath: `https://ojallington.github.io/vedant-zouk/<variant>/`.
  ALL asset/link paths must be relative (`../assets/poster.jpg`, `./booking.js`). Never start a path with `/`.
- Self-contained folder except for `../assets/` (shared images) and `../shared/` (shared JS).
- No external scripts except Google Fonts (fonts.googleapis.com) and js.stripe.com. Nothing else.
- Mobile-first. It will be opened from a WhatsApp link on a phone. Test at 390px wide first.
- Dark-mode-proof: set explicit colors on body. Do not rely on the browser default.
- Lighthouse-grade basics: semantic HTML, alt text, focus states, prefers-reduced-motion respected,
  <title> + <meta name="description"> + Open Graph tags (og:title, og:description, og:image) so the
  WhatsApp link preview looks good. og:image must be an ABSOLUTE https URL:
  https://ojallington.github.io/vedant-zouk/assets/poster.jpg

## The business (facts — do not invent alternatives)
- Teachers: **Miriam & Pavan**. Instagram: https://www.instagram.com/pavan_zouk
- Dance: **Brazilian Zouk**. Partner dance, flowing, connection-led.
- City: **Munich (München)**.
- Venue: **Tanzstudio Rebecca — White Room**, Munich.
- Day: **Thursday, weekly.**
  - **Level 1 — Beginner**, 20:00–21:00
  - **Level 3 — Intermediate**, 21:00–22:00
- Scene context: they are part of Munich's weekly Zouk circuit (other teachers run Mon/Tue/Wed/Fri).
  Link out to https://zoukmunich.com/de/ once, in the footer, as "the full Munich Zouk week".

## Level descriptions (scene-standard; used verbatim)
| Level | Name | Description |
|---|---|---|
| 1 | Beginner | Build strong foundations and confidence in your basic steps. |
| 2 | Improver | Expand your vocabulary by exploring variations. |
| 3 | Intermediate | Dive deep into principles of head movement and feel the flow. |

Only Levels 1 and 3 are bookable (that is what Miriam & Pavan teach). Level 2 may be shown greyed
out / "elsewhere in the city" for orientation, linking to zoukmunich.com.

## Required sections (all 5 variations, same order is fine but styling is yours)
1. **Hero** — brand, "Brazilian Zouk in Munich", Thursdays, primary CTA "Book your class".
   Use `../assets/poster-couple.jpg` or `../assets/poster.jpg`.
2. **What is Brazilian Zouk** — 2–3 short paragraphs. Warm, non-jargon, aimed at a total beginner.
   Cover: Brazilian partner dance evolved from Lambada; led through connection not choreography;
   flowing, wave-like movement; you do NOT need a partner or any dance experience to start.
3. **The classes** — the two bookable levels as cards, each with time, level name, description,
   and its own "Book this" CTA.
4. **Schedule** — a clean Thursday timetable. Make it feel like a real weekly rhythm, not a table dump.
5. **Pricing** — see the pricing model below. Must be scannable in under 10 seconds on a phone.
   This is the section that has to beat the competitor (see below).
6. **Your teachers** — Miriam & Pavan. Use `../assets/miriam-pavan.jpg`. Short warm bio placeholder
   clearly marked as placeholder copy in an HTML comment.
7. **Booking flow** — see below.
8. **FAQ** — beginner-reassurance. Include at minimum: Do I need a partner? (No.) Do I need
   experience? (No, Level 1 assumes none.) What should I wear/bring? (Comfortable clothes, clean
   indoor shoes with smooth soles.) Can I try one class first? (Yes — trial price.) What if I miss a
   week? Can I pay cash? (Yes, at the door.)
9. **Location** — Tanzstudio Rebecca, White Room, Munich. Include a Google Maps link
   (https://www.google.com/maps/search/?api=1&query=Tanzstudio+Rebecca+M%C3%BCnchen).
10. **Footer** — Instagram link, email placeholder, Impressum/Datenschutz placeholder links
    (German law requires them — leave as `#` with a TODO comment), zoukmunich.com link.

## Pricing model — ALL PRICES ARE PLACEHOLDERS, PENDING VEDANT'S CONFIRMATION
Mark this clearly with an HTML comment in the config, not on the page.
Benchmarked against the competitor (Zoukseed, Wednesdays, Ursula & Stamatis) which charges
€20 drop-in / €69 for a 4-class month / €99 for 8 classes / €145 unlimited month, with a 15% partner
deal and 20% student discount. Their weakness: a confusing accordion with five overlapping tiers.

Our angle: **fewer, clearer choices.** Four options, one screen, no accordion:
| id | Label | Price | What it is |
|---|---|---|---|
| `trial` | Trial class | €12 | First class, either level, no commitment |
| `dropin-1` | Single class | €18 | One class, one level |
| `dropin-2` | Both levels, one night | €30 | Level 1 + Level 3 back to back |
| `block-1` | 4-week course — one level | €65 | 4 consecutive Thursdays, one level |
| `block-2` | 4-week course — both levels | €95 | 4 consecutive Thursdays, both levels |

Discounts (shown as a small line under the cards, not as extra tiers):
- **Partner deal −15%** when two people book the same option together.
- **Student −20%** with a valid student card.
These are applied by the teachers at confirmation, NOT computed in Stripe. Say so plainly:
"Discounts are applied when we confirm your place — book normally and we'll adjust."

## Booking flow (identical in all 5; only the styling differs)
A modal or dedicated section, 3 steps, with a visible step indicator:
1. **Choose** — level (1 / 3 / both) and option (from the pricing table). Show running total.
2. **Details** — first name, last name, email (required, validated), phone (optional),
   "I'm booking with a partner" checkbox + partner name field (revealed when checked),
   role preference (Lead / Follow / Either) as radio buttons, notes textarea (optional).
3. **Pay** — two choices, side by side, equally weighted:
   - **Pay by card** → Stripe (see contract below).
   - **Pay cash at the door** → no payment now; submits the booking request and shows a
     confirmation screen ("We'll email you to confirm your place").
Include client-side validation with inline error messages. Never let a submit fail silently.
Persist in-progress form state to `sessionStorage` so a phone rotation doesn't wipe it.

## Stripe contract — THIS MUST BE IDENTICAL IN ALL 5 VARIATIONS
Do not invent your own. Import the shared module:

```js
import { CONFIG } from '../shared/site-config.js';
import { startCheckout, submitCashBooking } from '../shared/booking-core.js';
```

`../shared/site-config.js` and `../shared/booking-core.js` ALREADY EXIST — read them before you
start and use them exactly as written. Do not modify them. Do not duplicate their logic.
Your job is the UI; they own the data and the payment handoff.

## Accounts / "my bookings"
Vedant asked for student logins with a booking history. A static site cannot do real auth.
Ship the honest version: after a successful booking, store a record in `localStorage` and show a
"Your bookings" panel that reads it back on return visits. Add a short HTML comment explaining that
real cross-device accounts need a backend (documented in the repo README). Do not fake a login form.

## Tone of voice
Warm, confident, adult. Not corporate, not clubby, not "unleash your inner dancer". Short sentences.
German-city-English: clear and correct, no idioms that won't translate. It is fine to use a few
German words where a Munich reader expects them (Tanzstudio, Anmeldung) but the site is in English.

## Quality bar
This is going to a real person to show a real client. It should look like a paid design job, not a
template. Specifically:
- Real typographic hierarchy, considered spacing scale, no default browser look anywhere.
- At least one memorable, well-executed motion or layout idea per variation — but never at the cost
  of the booking flow's clarity, and always disabled under prefers-reduced-motion.
- No lorem ipsum. No emoji as icons. No stock-looking gradients-for-the-sake-of-it.
- It must be genuinely better than https://www.zoukseed.de/prices.html — clearer pricing, faster to
  book, better looking.
