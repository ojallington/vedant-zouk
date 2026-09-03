/**
 * KINETIC — page behaviour.
 *   1. Render config-driven content (classes, schedule, prices).
 *   2. Motion: the flowing line, section reveals, dock, top bar.
 *   3. The booking sheet (3 steps + confirmation), on top of ../shared/booking-core.js.
 *   4. "Your bookings" — per-device history from localStorage.
 */

import { CONFIG, formatPrice, getOption, getLevel } from '../shared/site-config.js';
import {
  validateBooking, describeBooking, bookingTotalFormatted,
  cardPaymentAvailable, startCheckout, submitCashBooking,
  getBookings, clearBookings, saveDraft, loadDraft, clearDraft, checkReturnFromPayment,
} from '../shared/booking-core.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const html = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ==================================================================== 1. content */

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderClasses() {
  const host = $('[data-classes]');
  if (!host) return;
  const cards = CONFIG.levels.map((l) => `
    <article class="klass reveal" data-level-card="${l.id}">
      <div class="klass__top">
        <span class="klass__num" aria-hidden="true">0${l.number}</span>
        <span class="klass__time">${esc(l.time)}</span>
      </div>
      <h3 class="klass__name"><small>Level ${l.number}</small>${esc(l.name)}</h3>
      <p class="klass__desc">${esc(l.description)}</p>
      <p class="klass__for">${esc(l.forWho)}</p>
      <button type="button" class="btn klass__cta" data-book data-level="${l.id}">
        Book Level ${l.number}
        <svg class="btn__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </article>`);
  const o = CONFIG.otherLevel;
  cards.splice(1, 0, `
    <article class="klass klass--ghost reveal" aria-label="Level ${o.number} — taught elsewhere">
      <span class="klass__num" aria-hidden="true">0${o.number}</span>
      <h3 class="klass__name"><small>Level ${o.number} · elsewhere in the city</small>${esc(o.name)}</h3>
      <p class="klass__desc">${esc(o.description)}</p>
      <p class="klass__note">${esc(o.note)} We don't teach it on Thursdays — see the full Munich Zouk week in the footer.</p>
    </article>`);
  host.innerHTML = cards.join('');
}

function renderTimeline() {
  const host = $('[data-timeline]');
  if (!host) return;
  const lv = CONFIG.levels;
  const ticks = [lv[0].start, ...lv.map((l) => l.end)];
  host.innerHTML = `
    <div class="timeline__ticks" aria-hidden="true">${ticks.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    <div class="timeline__bar" aria-hidden="true"></div>
    <div class="timeline__track">
      ${lv.map((l) => `
        <div class="timeline__slot">
          <i>Level ${l.number}</i>
          <b>${esc(l.name)}</b>
          <span>${esc(l.time)}</span>
        </div>`).join('')}
    </div>`;
  const venue = $('[data-venue-line]');
  if (venue) venue.textContent = `${CONFIG.venue.name} — ${CONFIG.venue.room}, ${CONFIG.venue.city}`;
}

function planCard(o, hot) {
  return `
    <button type="button" class="plan${hot ? ' plan--hot' : ''} reveal" data-book data-option="${o.id}" aria-label="${esc(o.label)}, ${esc(formatPrice(o.price))}. Book">
      <span class="plan__label">${esc(o.label)}${o.badge ? ` <span class="badge">${esc(o.badge)}</span>` : ''}</span>
      <span class="plan__blurb">${esc(o.blurb)}</span>
      <span class="plan__price">${esc(formatPrice(o.price))}</span>
    </button>`;
}

function renderPlans() {
  const host = $('[data-plans]');
  if (!host) return;
  const once = CONFIG.options.filter((o) => !o.id.startsWith('block'));
  const course = CONFIG.options.filter((o) => o.id.startsWith('block'));
  host.innerHTML = `
    <div class="plans__group">
      <h3 class="plans__title">Come once</h3>
      ${once.map((o) => planCard(o, o.id === 'trial')).join('')}
    </div>
    <div class="plans__group">
      <h3 class="plans__title">Four Thursdays in a row</h3>
      ${course.map((o) => planCard(o, o.id === 'block-1')).join('')}
    </div>`;

  const d = $('[data-discounts]');
  if (d) {
    d.innerHTML = `
      <div class="discounts__row">
        ${CONFIG.discounts.map((x) => `<span><b>${esc(x.amount)}</b> ${esc(x.label)} — ${esc(x.note)}</span>`).join('')}
      </div>
      <p class="discounts__note">${esc(CONFIG.discountNote)}</p>`;
  }
  $$('[data-price]').forEach((el) => {
    const o = getOption(el.dataset.price);
    if (o) el.textContent = formatPrice(o.price);
  });
}

function renderConfigText() {
  const b = CONFIG.brand, v = CONFIG.venue;
  $$('[data-instagram]').forEach((a) => (a.href = b.instagram));
  $$('[data-scene]').forEach((a) => (a.href = b.sceneLink));
  $$('[data-email]').forEach((a) => { a.href = `mailto:${b.email}`; a.textContent = b.email; });
  $$('[data-maps]').forEach((a) => (a.href = v.mapsUrl));
  const n = $('[data-venue-name]'); if (n) n.textContent = v.name;
  const r = $('[data-venue-room]'); if (r) r.textContent = v.room;
  const c = $('[data-venue-city]'); if (c) c.textContent = v.city;
}

/* ==================================================================== 2. motion */

/** Wrap each word of a heading so it can settle in line by line. */
function splitWords(el) {
  const text = el.textContent.trim();
  const words = text.split(/\s+/);
  el.setAttribute('aria-label', text);
  el.innerHTML = words
    .map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`)
    .join(' ');
}

function setupReveals() {
  const targets = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach((t) => io.observe(t));
  // Safety net: nothing may stay hidden if IO never fires (e.g. print, odd embed).
  setTimeout(() => targets.forEach((t) => {
    const r = t.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) t.classList.add('is-in');
  }), 2500);
}

function setupDockAndTop() {
  const hero = $('[data-hero]');
  const dock = $('[data-dock]');
  const top = $('[data-top]');
  if (!hero || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(([e]) => {
    const past = !e.isIntersecting;
    dock?.classList.toggle('is-on', past);
    top?.classList.toggle('is-stuck', past || e.intersectionRatio < 0.95);
  }, { threshold: [0, 0.95] });
  io.observe(hero);
}

/* ---- The flowing line ------------------------------------------------------
 * One path through every [data-node] (a section heading marker). Between nodes it
 * swings out across the page, so it reads as a slow wave threading the content.
 * Rebuilt on resize, never on scroll. Drawn by scroll position (CSS scroll timeline
 * where supported, otherwise a passive scroll listener writing one style property).
 */
const flow = {
  svg: $('.flow'),
  base: $('.flow__base'),
  glow: $('.flow__glow'),
  ink: $('.flow__ink'),
};

function catmullRomPath(pts, tension = 0.5) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) * tension / 3;
    const c1y = p1.y + (p2.y - p0.y) * tension / 3;
    const c2x = p2.x - (p3.x - p1.x) * tension / 3;
    const c2y = p2.y - (p3.y - p1.y) * tension / 3;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function buildFlow() {
  if (!flow.svg) return;
  const W = document.documentElement.clientWidth;
  const H = document.documentElement.scrollHeight;
  const scrollY = window.scrollY;
  const nodes = $$('[data-node]').filter((n) => !n.closest('[hidden]'));
  const pts = [];

  const hero = $('[data-hero]');
  if (hero) {
    const r = hero.getBoundingClientRect();
    const top = r.top + scrollY;
    // Enter from the right, sweep behind the hero image, past the title.
    pts.push({ x: W * 1.02, y: top + r.height * 0.28 });
    pts.push({ x: W * 0.72, y: top + r.height * 0.62 });
    pts.push({ x: W * 0.3, y: top + r.height * 0.9 });
  }

  // The swing's apex sits just outside the content column, so the line only ever crosses
  // text on a diagonal — never meandering through a block of copy.
  const wrap = $('.sec .wrap');
  const wr = wrap ? wrap.getBoundingClientRect() : { right: W, width: W };
  const gutter = parseFloat(getComputedStyle(wrap || document.body).paddingLeft) || 20;
  const apexOut = Math.min(W + 30, wr.right + gutter * 1.2);
  const apexIn = wr.right - gutter * 0.5;

  nodes.forEach((n, i) => {
    const dot = $('.node', n) || n;
    const r = dot.getBoundingClientRect();
    const p = { x: r.left + r.width / 2, y: r.top + scrollY + r.height / 2 };
    if (pts.length) {
      const prev = pts[pts.length - 1];
      const odd = i % 2 === 1;
      const t = i === 0 ? 0.5 : odd ? 0.58 : 0.42;         // vary where the swing peaks, like breath
      pts.push({ x: odd ? apexIn : apexOut, y: prev.y + (p.y - prev.y) * t });
    }
    pts.push(p);
  });

  // Exit through the bottom edge.
  const last = pts[pts.length - 1];
  if (last) {
    pts.push({ x: W * 0.5, y: (last.y + H) / 2 + 20 });
    pts.push({ x: W * 0.85, y: H + 40 });
  }

  const d = catmullRomPath(pts, 0.62);
  flow.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  flow.svg.setAttribute('width', W);
  flow.svg.setAttribute('height', H);
  flow.base.setAttribute('d', d);
  flow.glow.setAttribute('d', d);
  flow.ink.setAttribute('d', d);
}

function setupFlow() {
  if (!flow.svg) return;
  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(buildFlow); };
  buildFlow();
  if (document.fonts?.ready) document.fonts.ready.then(schedule);
  window.addEventListener('load', schedule);
  if ('ResizeObserver' in window) {
    let t = 0;
    new ResizeObserver(() => { clearTimeout(t); t = setTimeout(schedule, 120); }).observe(document.body);
  } else {
    window.addEventListener('resize', schedule);
  }

  // Fallback draw for browsers without CSS scroll-driven animations.
  const cssDraw = CSS.supports?.('animation-timeline: scroll()');
  if (!reduceMotion && !cssDraw) {
    let ticking = false;
    const paint = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      flow.ink.style.strokeDashoffset = String(1 - p);
      flow.glow.style.strokeDashoffset = String(1 - p);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }
}

function setupMotion() {
  if (reduceMotion) {                       // nothing hides, nothing moves — just mark everything as arrived
    $$('.reveal').forEach((t) => t.classList.add('is-in'));
    return;
  }
  $$('[data-split]').forEach(splitWords);
  html.classList.add('motion');             // only now may the hidden states apply
  setupReveals();
}

/* ==================================================================== 3. booking */

const dialog = $('#booking');
const form = $('[data-booking-form]');

const state = {
  step: 1,
  booking: {
    optionId: '', levelId: '',
    firstName: '', lastName: '', email: '', phone: '',
    withPartner: false, partnerName: '', role: 'Either', notes: '',
  },
  busy: false,
  returnFocus: null,
};

function renderLevelChoices() {
  const host = $('[data-levels]');
  if (!host) return;
  const items = CONFIG.levels.map((l) => `
    <label class="seg__item">
      <input type="radio" name="levelId" value="${l.id}">
      <span>Level ${l.number}<small>${esc(l.name)}</small></span>
    </label>`);
  items.push(`
    <label class="seg__item">
      <input type="radio" name="levelId" value="both">
      <span>Both<small>Two hours</small></span>
    </label>`);
  host.innerHTML = items.join('');
}

function renderOptionChoices() {
  const host = $('[data-options]');
  if (!host) return;
  host.innerHTML = CONFIG.options.map((o) => `
    <label class="opt">
      <input type="radio" name="optionId" value="${o.id}" data-levels="${o.levels}">
      <span class="opt__card">
        <span class="opt__label">${esc(o.label)}${o.badge ? ` <span class="badge">${esc(o.badge)}</span>` : ''}</span>
        <span class="opt__blurb">${esc(o.blurb)}</span>
        <span class="opt__price">${esc(formatPrice(o.price))}</span>
      </span>
    </label>`).join('');
  const note = $('[data-discount-note]');
  if (note) note.textContent = CONFIG.discountNote;
}

/** Keep level and option compatible: "both" options need level "both", and vice versa. */
function syncChoices() {
  const b = state.booking;
  const opt = getOption(b.optionId);
  if (opt?.levels === 'both') b.levelId = 'both';
  if (opt?.levels === 'one' && b.levelId === 'both') b.levelId = '';

  $$('input[name="levelId"]', form).forEach((i) => {
    i.checked = i.value === b.levelId;
    i.disabled = opt ? (opt.levels === 'both' ? i.value !== 'both' : i.value === 'both') : false;
  });
  $$('input[name="optionId"]', form).forEach((i) => {
    i.checked = i.value === b.optionId;
    const wants = i.dataset.levels;
    i.disabled = b.levelId ? (b.levelId === 'both' ? wants !== 'both' : wants !== 'one') : false;
  });
  renderTotal();
}

function renderTotal() {
  const b = state.booking;
  const opt = getOption(b.optionId);
  $('[data-total]').textContent = opt ? bookingTotalFormatted(b) : '—';
  $('[data-total-desc]').textContent = opt
    ? describeBooking(b).split(' · ').slice(0, 2).join(' · ')
    : 'Choose an option';
}

function setErrors(errors = {}) {
  $$('[data-err]', form).forEach((p) => {
    const key = p.dataset.err;
    p.textContent = errors[key] || '';
  });
  $$('input, textarea', form).forEach((i) => {
    if (i.name in errors) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
  });
}

function showStep(step) {
  state.step = step;
  $$('.step', form).forEach((s) => { s.hidden = s.dataset.step !== String(step); });
  $$('[data-step-dot]', form).forEach((li) => {
    const n = Number(li.dataset.stepDot);
    const cur = step === 'done' ? 4 : step;
    li.classList.toggle('is-current', n === cur);
    li.classList.toggle('is-done', n < cur);
    if (n === cur) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  const back = $('[data-back]', form), next = $('[data-next]', form), foot = $('[data-foot]', form);
  back.hidden = step === 1 || step === 'done';
  next.hidden = step === 3 || step === 'done';
  foot.hidden = step === 'done';
  if (step === 3) fillReview();
  $('[data-body]', form).scrollTop = 0;
  setErrors();
  persistDraft();
}

function fillReview() {
  const b = state.booking;
  $('[data-review-what]').textContent = `${describeBooking(b)} · ${bookingTotalFormatted(b)}`;
  const who = [`${b.firstName} ${b.lastName}`.trim(), b.email, b.withPartner && b.partnerName ? `with ${b.partnerName}` : '', b.role ? `dancing as ${b.role}` : '']
    .filter(Boolean).join(' · ');
  $('[data-review-who]').textContent = who;
  const cardBtn = $('[data-pay-card]');
  const note = $('[data-card-note]');
  const ok = cardPaymentAvailable(b.optionId);
  note.hidden = ok;
  if (!ok) note.textContent = 'Card payments are being set up — choose cash for now.';
}

function readForm() {
  const b = state.booking;
  const fd = new FormData(form);
  b.firstName = (fd.get('firstName') || '').toString();
  b.lastName = (fd.get('lastName') || '').toString();
  b.email = (fd.get('email') || '').toString();
  b.phone = (fd.get('phone') || '').toString();
  b.withPartner = fd.get('withPartner') === 'on';
  b.partnerName = (fd.get('partnerName') || '').toString();
  b.role = (fd.get('role') || 'Either').toString();
  b.notes = (fd.get('notes') || '').toString();
  $('[data-partner-field]').hidden = !b.withPartner;
}

function writeForm() {
  const b = state.booking;
  for (const k of ['firstName', 'lastName', 'email', 'phone', 'partnerName', 'notes']) {
    const el = form.elements[k]; if (el) el.value = b[k] || '';
  }
  form.elements.withPartner.checked = Boolean(b.withPartner);
  $('[data-partner-field]').hidden = !b.withPartner;
  $$('input[name="role"]', form).forEach((r) => { r.checked = r.value === (b.role || 'Either'); });
}

let draftTimer = 0;
function persistDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => saveDraft({ ...state.booking, step: state.step === 'done' ? 1 : state.step }), 150);
}

function stepErrors(step) {
  const { errors } = validateBooking(state.booking);
  const keys = step === 1 ? ['optionId', 'levelId'] : ['firstName', 'lastName', 'email', 'partnerName'];
  const out = {};
  keys.forEach((k) => { if (errors[k]) out[k] = errors[k]; });
  return out;
}

function openBooking({ level, option } = {}, trigger) {
  if (!dialog) return;
  state.returnFocus = trigger || document.activeElement;
  const draft = state.step === 'done' ? null : loadDraft();
  if (draft) {
    const { step, ...rest } = draft;
    Object.assign(state.booking, rest);
  }
  const preset = Boolean(level || option);
  if (option) state.booking.optionId = option;
  if (level) state.booking.levelId = level;
  writeForm();
  syncChoices();
  let startStep = (!preset && draft?.step && draft.step !== 'done') ? draft.step : 1;
  if (startStep === 3) startStep = 2;   // always re-confirm details before paying
  showStep(startStep);
  document.body.classList.add('modal-open');
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  // Put focus somewhere calm, not on the first radio.
  $('.booking__title')?.setAttribute('tabindex', '-1');
  $('.booking__title')?.focus({ preventScroll: true });
}

function closeBooking() {
  if (!dialog) return;
  document.body.classList.remove('modal-open');   // unlock scroll now; 'close' fires async
  if (dialog.open) dialog.close();          // the rest of the cleanup happens in the 'close' handler
  else { dialog.removeAttribute('open'); onClosed(); }
}

function onClosed() {
  document.body.classList.remove('modal-open');
  if (state.step === 'done') resetBooking();
  state.returnFocus?.focus?.();
}

function resetBooking() {
  state.booking = {
    optionId: '', levelId: '', firstName: '', lastName: '', email: '', phone: '',
    withPartner: false, partnerName: '', role: 'Either', notes: '',
  };
  state.step = 1;
  clearDraft();
  writeForm();
  syncChoices();
}

function showDone({ title, text, what, ref, hint }) {
  $('[data-done-title]').textContent = title;
  $('[data-done-text]').textContent = text;
  $('[data-done-what]').textContent = what;
  $('[data-done-ref]').textContent = ref || '…';
  const h = $('[data-done-hint]');
  h.hidden = !hint; h.textContent = hint || '';
  showStep('done');
  const nav = $('[data-next]', form);
  nav.hidden = true;
}

async function payCash() {
  if (state.busy) return;
  readForm();
  const { valid, errors } = validateBooking(state.booking);
  if (!valid) { setErrors({ pay: Object.values(errors)[0] }); return; }
  state.busy = true;
  const b = { ...state.booking };
  $$('.pay__btn').forEach((x) => (x.disabled = true));

  // Show the confirmation first — it must not depend on the mail / endpoint handoff.
  showDone({
    title: 'Booking requested.',
    text: `We'll email ${b.email.trim()} to confirm your place. Pay ${bookingTotalFormatted(b)} in cash at the door.`,
    what: describeBooking(b),
    ref: '',
  });

  const res = await submitCashBooking(b);
  state.busy = false;
  $$('.pay__btn').forEach((x) => (x.disabled = false));
  if (!res.ok) {
    showStep(3);
    setErrors({ pay: res.error || 'Something went wrong — please try again or message us on Instagram.' });
    return;
  }
  $('[data-done-ref]').textContent = res.reference;
  if (res.fallback) {
    const h = $('[data-done-hint]');
    h.hidden = false;
    h.textContent = 'Your mail app should have opened with the request — please send it so it reaches us. If it did not, email us and quote the reference.';
  }
  clearDraft();
  renderHistory();
}

async function payCard() {
  if (state.busy) return;
  readForm();
  const { valid, errors } = validateBooking(state.booking);
  if (!valid) { setErrors({ pay: Object.values(errors)[0] }); return; }
  state.busy = true;
  setErrors();
  const btn = $('[data-pay-card]');
  const label = $('strong', btn).textContent;
  $$('.pay__btn').forEach((x) => (x.disabled = true));
  $('strong', btn).textContent = 'Opening Stripe…';
  const res = await startCheckout({ ...state.booking });
  // On success the browser has navigated away; we only get here on failure.
  state.busy = false;
  $$('.pay__btn').forEach((x) => (x.disabled = false));
  $('strong', btn).textContent = label;
  if (!res?.ok) setErrors({ pay: res?.error || 'Card payment failed to start. Please try cash for now.' });
}

function setupBooking() {
  if (!dialog || !form) return;
  renderLevelChoices();
  renderOptionChoices();
  writeForm();
  syncChoices();
  showStep(1);

  // Any [data-book] anywhere on the page opens the sheet (also for buttons rendered later).
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-book]');
    if (!t) return;
    e.preventDefault();
    openBooking({ level: t.dataset.level, option: t.dataset.option }, t);
  });

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'levelId') { state.booking.levelId = t.value; syncChoices(); }
    if (t.name === 'optionId') { state.booking.optionId = t.value; syncChoices(); }
    readForm();
    if (state.step === 1) setErrors(); // clear as they fix it
    persistDraft();
  });
  form.addEventListener('input', (e) => {
    readForm();
    persistDraft();
    // Clear an inline error the moment that field becomes valid.
    const name = e.target?.name;
    const p = name && $(`[data-err="${name}"]`, form);
    if (p && p.textContent) {
      const { errors } = validateBooking(state.booking);
      if (!errors[name]) { p.textContent = ''; e.target.removeAttribute('aria-invalid'); }
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.step === 'done' || state.step === 3) return;
    readForm();
    const errs = stepErrors(state.step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      const first = $('[aria-invalid="true"]', form) || $(`[data-err="${Object.keys(errs)[0]}"]`, form);
      first?.focus?.();
      return;
    }
    showStep(state.step + 1);
  });

  $('[data-back]', form).addEventListener('click', () => {
    if (state.step === 2) showStep(1);
    else if (state.step === 3) showStep(2);
  });
  $$('[data-close]', dialog).forEach((b) => b.addEventListener('click', closeBooking));
  $('[data-pay-cash]').addEventListener('click', payCash);
  $('[data-pay-card]').addEventListener('click', payCard);

  dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeBooking(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeBooking(); });
  dialog.addEventListener('close', onClosed);

  // Enter on the "done" view closes.
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && state.step === 'done') closeBooking(); });
}

/* ==================================================================== 4. history */

function renderHistory() {
  const sec = $('[data-bookings]');
  const list = $('[data-history]');
  const link = $('[data-bookings-link]');
  if (!sec || !list) return;
  const all = getBookings();
  const had = !sec.hidden;
  sec.hidden = all.length === 0;
  if (link) link.hidden = all.length === 0;
  list.innerHTML = all.map((b) => {
    const when = new Date(b.createdAt);
    const date = isNaN(when) ? '' : when.toLocaleDateString(CONFIG.locale, { day: 'numeric', month: 'short', year: 'numeric' });
    const status = b.status === 'paid' ? 'Paid' : b.method === 'cash' ? 'Requested · cash at the door' : 'Pending payment';
    return `<li>
      <b>${esc(b.summary || describeBooking(b))}</b>
      <span>${esc(date)} · Ref ${esc(b.reference || '')} · <span class="status">${esc(status)}</span></span>
    </li>`;
  }).join('');
  if (had !== !sec.hidden) requestAnimationFrame(buildFlow);
}

function setupHistory() {
  renderHistory();
  $('[data-clear-history]')?.addEventListener('click', () => { clearBookings(); renderHistory(); });
}

/* ==================================================================== 5. toast + return */

let toastTimer = 0;
function toast(msg) {
  const t = $('[data-toast]');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 4500);
}

function handleReturn() {
  const r = checkReturnFromPayment();
  if (r.booked) {
    const hit = getBookings().find((b) => b.reference === r.reference);
    openBooking({}, null);
    showDone({
      title: 'Paid. See you Thursday.',
      text: hit ? `Your card payment went through. We've emailed ${hit.email} with the details.` : 'Your card payment went through.',
      what: hit ? describeBooking(hit) : '',
      ref: r.reference,
    });
    renderHistory();
    history.replaceState(null, '', location.pathname);
  } else if (r.cancelled) {
    toast('Payment cancelled — nothing was charged.');
    history.replaceState(null, '', location.pathname);
  }
}

/* ==================================================================== boot */

renderClasses();
renderTimeline();
renderPlans();
renderConfigText();
setupBooking();
setupHistory();
setupMotion();
setupDockAndTop();
setupFlow();
handleReturn();
