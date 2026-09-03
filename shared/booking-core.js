/**
 * Shared booking + payment core. Identical across all five design variations.
 *
 * The design layer owns the UI and calls into here. This module owns:
 *   - validating a booking
 *   - handing off to Stripe (payment link OR checkout session)
 *   - submitting a cash / request booking
 *   - the local "your bookings" history
 *
 * Do not fork this file per variation.
 */

import { CONFIG, getOption, getLevel, formatPrice } from './site-config.js';

const HISTORY_KEY = 'mp-zouk-bookings';
const DRAFT_KEY = 'mp-zouk-draft';

/* ------------------------------------------------------------------ validation */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * @param {object} booking
 * @returns {{valid: boolean, errors: Record<string,string>}}
 */
export function validateBooking(booking) {
  const errors = {};

  if (!booking.optionId || !getOption(booking.optionId)) {
    errors.optionId = 'Choose an option.';
  }
  if (!booking.levelId) {
    errors.levelId = 'Choose a level.';
  }
  if (!booking.firstName || !booking.firstName.trim()) {
    errors.firstName = 'We need your first name.';
  }
  if (!booking.lastName || !booking.lastName.trim()) {
    errors.lastName = 'We need your last name.';
  }
  if (!booking.email || !booking.email.trim()) {
    errors.email = 'We need an email to confirm your place.';
  } else if (!EMAIL_RE.test(booking.email.trim())) {
    errors.email = "That email doesn't look right.";
  }
  if (booking.withPartner && !(booking.partnerName || '').trim()) {
    errors.partnerName = "Tell us your partner's name.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Human-readable summary of what is being booked. */
export function describeBooking(booking) {
  const opt = getOption(booking.optionId);
  if (!opt) return '';
  const parts = [opt.label];
  if (opt.levels === 'both') {
    parts.push('Level 1 + Level 3');
  } else {
    const lvl = getLevel(booking.levelId);
    if (lvl) parts.push(`Level ${lvl.number} — ${lvl.name}`);
  }
  parts.push(`${CONFIG.day}s, ${CONFIG.venue.name}`);
  return parts.join(' · ');
}

export function bookingTotal(booking) {
  const opt = getOption(booking.optionId);
  return opt ? opt.price : 0;
}

export function bookingTotalFormatted(booking) {
  return formatPrice(bookingTotal(booking));
}

/* ------------------------------------------------------------------ stripe */

/** Is card payment actually available right now? */
export function cardPaymentAvailable(optionId) {
  const s = CONFIG.stripe;
  if (s.mode === 'payment-link') return Boolean(s.paymentLinks[optionId]);
  if (s.mode === 'checkout') return Boolean(s.checkoutEndpoint && s.priceIds[optionId]);
  return false;
}

/**
 * Hand off to Stripe. Resolves only if it fails — on success the browser navigates away.
 * @returns {Promise<{ok: false, error: string}>}
 */
export async function startCheckout(booking) {
  const { valid, errors } = validateBooking(booking);
  if (!valid) return { ok: false, error: Object.values(errors)[0], errors };

  const s = CONFIG.stripe;
  const ref = makeReference();
  const record = { ...booking, reference: ref, method: 'card', status: 'pending' };

  if (s.mode === 'payment-link') {
    const base = s.paymentLinks[booking.optionId];
    if (!base) return { ok: false, error: 'Card payment is not set up for this option yet.' };
    saveBooking(record);
    const url = new URL(base);
    url.searchParams.set('prefilled_email', booking.email.trim());
    url.searchParams.set('client_reference_id', ref);
    window.location.assign(url.toString());
    return { ok: true };
  }

  if (s.mode === 'checkout') {
    if (!s.checkoutEndpoint) return { ok: false, error: 'Card payment is not configured.' };
    try {
      const res = await fetch(s.checkoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: s.priceIds[booking.optionId],
          optionId: booking.optionId,
          levelId: booking.levelId,
          reference: ref,
          email: booking.email.trim(),
          metadata: publicMetadata(booking),
          successUrl: `${location.origin}${location.pathname}?booked=1&ref=${ref}`,
          cancelUrl: `${location.origin}${location.pathname}?cancelled=1`,
        }),
      });
      if (!res.ok) throw new Error(`Checkout failed (${res.status})`);
      const data = await res.json();
      if (!data.url) throw new Error('Checkout returned no redirect URL.');
      saveBooking(record);
      window.location.assign(data.url);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'Could not reach the payment service.' };
    }
  }

  return { ok: false, error: 'Card payment is not switched on yet — please choose cash for now.' };
}

/* ------------------------------------------------------------------ cash / request */

/**
 * Submit a booking with no online payment (cash at the door).
 * @returns {Promise<{ok: boolean, reference?: string, error?: string, fallback?: boolean}>}
 */
export async function submitCashBooking(booking) {
  const { valid, errors } = validateBooking(booking);
  if (!valid) return { ok: false, error: Object.values(errors)[0], errors };

  const ref = makeReference();
  const record = { ...booking, reference: ref, method: 'cash', status: 'requested' };
  const payload = { ...publicMetadata(booking), reference: ref, payment: 'cash at the door' };

  if (CONFIG.bookingEndpoint) {
    try {
      const res = await fetch(CONFIG.bookingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Submission failed (${res.status})`);
      saveBooking(record);
      return { ok: true, reference: ref };
    } catch (err) {
      // fall through to mail fallback rather than losing the booking
      saveBooking(record);
      openMailFallback(payload);
      return { ok: true, reference: ref, fallback: true };
    }
  }

  saveBooking(record);
  openMailFallback(payload);
  return { ok: true, reference: ref, fallback: true };
}

function openMailFallback(payload) {
  const lines = Object.entries(payload)
    .filter(([, v]) => v !== '' && v != null && v !== false)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  const url =
    `mailto:${encodeURIComponent(CONFIG.brand.email)}` +
    `?subject=${encodeURIComponent(`Zouk booking — ${payload.name}`)}` +
    `&body=${encodeURIComponent(lines)}`;
  window.location.href = url;
}

function publicMetadata(b) {
  const opt = getOption(b.optionId);
  const lvl = getLevel(b.levelId);
  return {
    name: `${(b.firstName || '').trim()} ${(b.lastName || '').trim()}`.trim(),
    email: (b.email || '').trim(),
    phone: (b.phone || '').trim(),
    option: opt ? opt.label : b.optionId,
    price: opt ? formatPrice(opt.price) : '',
    level: opt && opt.levels === 'both' ? 'Level 1 + Level 3' : lvl ? `Level ${lvl.number} — ${lvl.name}` : '',
    role: b.role || 'Either',
    partner: b.withPartner ? (b.partnerName || '').trim() : '',
    notes: (b.notes || '').trim(),
    day: CONFIG.day,
    venue: `${CONFIG.venue.name} — ${CONFIG.venue.room}`,
  };
}

/* ------------------------------------------------------------------ local history */
/*
 * Vedant asked for student accounts with a booking history. A static site cannot do real
 * cross-device auth, so this is the honest version: a per-device record, readable on return
 * visits. Swapping this for real accounts needs a backend — see README § "Real accounts".
 */

function makeReference() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MP-${stamp}-${rand}`;
}

function safeParse(raw, fallback) {
  try { return JSON.parse(raw) ?? fallback; } catch { return fallback; }
}

export function saveBooking(record) {
  try {
    const all = getBookings();
    all.unshift({ ...record, createdAt: new Date().toISOString(), summary: describeBooking(record) });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all.slice(0, 25)));
  } catch { /* private mode / storage blocked — the booking still went through */ }
}

export function getBookings() {
  try { return safeParse(localStorage.getItem(HISTORY_KEY), []) || []; } catch { return []; }
}

export function clearBookings() {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ draft persistence */

export function saveDraft(booking) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(booking)); } catch { /* ignore */ }
}

export function loadDraft() {
  try { return safeParse(sessionStorage.getItem(DRAFT_KEY), null); } catch { return null; }
}

export function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ return from stripe */

/** Call on load. Returns {booked:true, reference} if the user just came back from a successful pay. */
export function checkReturnFromPayment() {
  const params = new URLSearchParams(location.search);
  if (params.get('booked') === '1') {
    const ref = params.get('ref') || '';
    try {
      const all = getBookings();
      const hit = all.find((b) => b.reference === ref);
      if (hit) { hit.status = 'paid'; localStorage.setItem(HISTORY_KEY, JSON.stringify(all)); }
    } catch { /* ignore */ }
    clearDraft();
    return { booked: true, reference: ref };
  }
  if (params.get('cancelled') === '1') return { cancelled: true };
  return {};
}

export { CONFIG, getOption, getLevel, formatPrice };
