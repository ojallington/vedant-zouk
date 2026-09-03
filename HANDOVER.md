# Handover — read this when you're back at the laptop

## 1. Publish it (one command)

```bash
~/Projects/vedant-zouk/publish.sh
```

Creates the repo, pushes, enables Pages, waits for the build, then checks all six URLs
return 200 and prints the link to send. Safe to re-run. If GitHub is slow on the first
deploy, `./publish.sh --verify` re-checks without redoing anything.

If it's still blocked in-session, run it from a normal terminal — it needs no Claude at all.

## 2. Send it

The message is drafted in `docs/whatsapp-draft.local.md`. Link to send:
`https://ojallington.github.io/vedant-zouk/`

The landing page carries the whole briefing — what the five are, what I guessed, eight
numbered questions, and how to give feedback. You shouldn't need to explain much in chat.

## 3. What's actually done

- Five complete, working sites. All import the same `shared/site-config.js` and
  `shared/booking-core.js`, so picking one is a design decision, not a rebuild.
- Booking works end to end in every one: choose level and option, fill details, pay by
  card or cash, get a confirmation with a reference. Bookings are remembered per-device.
- Stripe is wired in and switched **off** (`stripe.mode: 'off'`). Nothing can take money.
- Verified: static audit clean on all five; zero console errors and no horizontal overflow
  at 320 / 390 / 768 / 1440 on all five plus the landing page.
- Every page is `noindex` while prices are invented and it lives on your github.io.

## 4. The two answers that unblock the next round

1. **Which design.**
2. **Real prices** — and whether it's a fixed four-week course or drop-in. That one changes
   what the whole page leads with, so it's worth pushing him on.

Everything else (his bio, email, language, domain) can follow without blocking.

## 5. Next round, once he's replied

In rough order, maybe half a day:

1. Real numbers into `shared/site-config.js` — prices, times, email, Instagram.
2. His bio into the teachers section.
3. Delete the four unchosen folders and the landing page; promote the winner to the root.
4. Remove the `noindex` from the chosen design.
5. Add real Impressum and Datenschutz pages — legally required for a commercial site in
   Germany, currently `href="#"`.
6. Point `bookingEndpoint` at a Formspree endpoint so cash bookings arrive by email
   instead of opening the student's mail app.
7. Stripe: create five Payment Links, paste them into `stripe.paymentLinks`, set
   `stripe.mode = 'payment-link'`. No backend needed. Full Checkout later if he wants
   metadata on payments — the function is written in `api-stub/`.
8. If he wants real cross-device accounts: Supabase magic-link auth plus a `bookings`
   table, and a Stripe webhook writing payment status. Only `shared/booking-core.js`
   changes; the design is untouched.

## 6. Tools in here

```bash
python3 -m http.server 8899          # serve locally (ES modules need http, not file://)
python3 tools/audit.py               # static audit of all five
node tools/shot.js <url> out.png 390 844   # headless screenshot + console errors
python3 tools/inline.py 04-swiss out.html  # flatten one site into a single file
```
