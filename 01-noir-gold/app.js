/* NOIR GOLD — page + booking UI. Data and payment logic live in ../shared/. */
import { CONFIG, formatPrice, getOption, getLevel } from '../shared/site-config.js';
import {
  startCheckout, submitCashBooking, validateBooking, describeBooking, bookingTotalFormatted,
  cardPaymentAvailable, getBookings, clearBookings, saveDraft, loadDraft, clearDraft,
  checkReturnFromPayment,
} from '../shared/booking-core.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ================================================================ content from config */

function renderContent() {
  const { levels, options, discounts, venue, brand, day } = CONFIG;
  const trial = getOption('trial');

  // Hero facts
  $('#hero-facts').innerHTML = `
    <div><dt>When</dt><dd>${esc(day)}s</dd></div>
    <div><dt>Where</dt><dd>${esc(venue.name)}</dd></div>
    ${levels.map((l) => `<div><dt>Level ${l.number} · ${esc(l.name)}</dt><dd>${esc(l.time)}</dd></div>`).join('')}
  `;

  // Class cards
  $('#class-cards').innerHTML = levels.map((l, i) => `
    <article class="class reveal" style="transition-delay:${i * 120}ms" aria-labelledby="class-${l.id}">
      <div class="class__top">
        <p class="class__num"><small>Level</small>${l.number}</p>
        <p class="class__time">${esc(l.time)}</p>
      </div>
      <h3 class="class__name" id="class-${l.id}">${esc(l.name)}</h3>
      <p class="class__desc">${esc(l.description)}</p>
      <p class="class__who">${esc(l.forWho)}</p>
      <button class="btn btn--ghost" type="button" data-book data-level="${l.id}">Book Level ${l.number}</button>
    </article>
  `).join('');

  const o = CONFIG.otherLevel;
  $('#class-other').innerHTML =
    `<strong>Level ${o.number} — ${esc(o.name)}.</strong> ${esc(o.description)} ${esc(o.note)}`;

  // Timeline
  const last = levels[levels.length - 1];
  $('#timeline').innerHTML = levels.map((l, i) => `
    <li class="slot reveal" style="transition-delay:${i * 120}ms">
      <span class="slot__time">${esc(l.start)}</span>
      <span class="slot__dot" aria-hidden="true"></span>
      <span class="slot__body">
        <span class="slot__title">Level ${l.number} — ${esc(l.name)}</span>
        <span class="slot__meta">${esc(l.time)} · ${esc(l.forWho)}</span>
      </span>
    </li>
  `).join('') + `
    <li class="slot slot--end reveal" style="transition-delay:${levels.length * 120}ms">
      <span class="slot__time">${esc(last.end)}</span>
      <span class="slot__dot" aria-hidden="true"></span>
      <span class="slot__body"><span class="slot__title">End of the night</span></span>
    </li>
  `;
  $('#schedule-venue').innerHTML =
    `Every ${esc(day)}, same room, same time: <strong>${esc(venue.name)} — ${esc(venue.room)}</strong>, ${esc(venue.city)}.`;

  // Prices
  $('#price-cards').innerHTML = options.map((op, i) => `
    <li class="price reveal ${op.badge ? 'price--hot' : ''}" style="transition-delay:${i * 80}ms">
      <p class="price__label">${op.badge ? `<span class="price__badge">${esc(op.badge)}</span><br>` : ''}${esc(op.label)}</p>
      <p class="price__blurb">${esc(op.blurb)}</p>
      <p class="price__amt">${esc(formatPrice(op.price))}</p>
      <button class="btn btn--ghost price__cta" type="button" data-book data-option="${op.id}">Book</button>
    </li>
  `).join('');

  $('#discounts').innerHTML = `
    <div class="discounts__row">
      ${discounts.map((d) => `<span class="discounts__item"><strong>${esc(d.amount)}</strong><span>${esc(d.label)} — ${esc(d.note)}</span></span>`).join('')}
    </div>
    <p class="discounts__note">${esc(CONFIG.discountNote)}</p>
  `;

  // FAQ trial line
  if (trial) $('#faq-trial').textContent = `Yes. The trial class is ${formatPrice(trial.price)} — your first class at either level, with no commitment.`;

  // Location
  $('#location-lede').textContent = `${venue.name}, ${venue.room}, ${venue.city}. Every ${day} evening. Indoor shoes with smooth soles, please.`;
  $('#location-map').href = venue.mapsUrl;
  $('#location-slots').innerHTML = levels.map((l) =>
    `<li><span>Level ${l.number} — ${esc(l.name)}</span><span>${esc(l.time)}</span></li>`).join('');

  // Footer / links
  $('#foot-sub').textContent = `${brand.tagline} · ${venue.name}, ${venue.room}`;
  $('#foot-ig').href = brand.instagram;
  $('#teachers-ig').href = brand.instagram;
  $('#foot-mail').href = `mailto:${brand.email}`;
  $('#foot-scene').href = brand.sceneLink;

  // Booking form: level pills + option cards
  $('#level-pills').innerHTML = [
    ...levels.map((l) => ({ id: l.id, label: `Level ${l.number} · ${l.name}` })),
    { id: 'both', label: 'Both levels' },
  ].map((l) => `
    <label class="pill"><input type="radio" name="levelId" value="${l.id}"><span>${esc(l.label)}</span></label>
  `).join('');

  $('#option-cards').innerHTML = options.map((op) => `
    <label class="opt-card" data-levels="${op.levels}">
      <input type="radio" name="optionId" value="${op.id}">
      <span class="opt-card__box">
        <span class="opt-card__label">${esc(op.label)}</span>
        <span class="opt-card__amt">${esc(formatPrice(op.price))}</span>
        <span class="opt-card__blurb">${esc(op.blurb)}</span>
        <span class="opt-card__hint" hidden>${op.levels === 'both' ? 'Includes both levels' : 'One level only'}</span>
      </span>
    </label>
  `).join('');

  $('#discount-note').textContent = CONFIG.discountNote;
}

/* ================================================================ light */

function initLight() {
  const spot = $('.spot');
  const head = $('.site-head');

  // Reveal on enter.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-lit'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  // The hero lights itself on load, staggered; everything else waits for the viewport.
  $$('.hero .reveal, .hero .trail').forEach((el, i) => {
    el.style.transitionDelay = `${120 + i * 110}ms`;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-lit')));
  });
  $$('.reveal, .lit, .trail').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });

  // Header solidifies after the hero.
  const onScrollHead = () => head.classList.toggle('is-scrolled', window.scrollY > 24);
  onScrollHead();
  window.addEventListener('scroll', onScrollHead, { passive: true });

  if (reduceMotion.matches) return;

  // The travelling spot: scroll progress sets a slow S-path; on fine pointers it also leans toward the cursor.
  let tx = 0.3, ty = 0.2, px = null, py = null, cx = 0.3, cy = 0.2;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  const target = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = Math.min(1, window.scrollY / max);
    let x = 0.5 + 0.38 * Math.sin(p * Math.PI * 2.4 - 0.9);
    let y = 0.22 + 0.5 * p;
    if (finePointer && px != null) { x = x * 0.6 + px * 0.4; y = y * 0.6 + py * 0.4; }
    tx = x; ty = y;
  };

  let raf = 0;
  const tick = () => {
    cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
    spot.style.transform = `translate3d(${(cx * window.innerWidth).toFixed(1)}px, ${(cy * window.innerHeight).toFixed(1)}px, 0)`;
    if (Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005) raf = requestAnimationFrame(tick);
    else raf = 0;
  };
  const kick = () => { target(); if (!raf) raf = requestAnimationFrame(tick); };

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  if (finePointer) {
    window.addEventListener('pointermove', (e) => {
      px = e.clientX / window.innerWidth; py = e.clientY / window.innerHeight; kick();
    }, { passive: true });
  }
  kick();
}

/* ================================================================ toast */

let toastTimer = 0;
function toast(html, ms = 6000) {
  const t = $('#toast');
  t.innerHTML = html; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/* ================================================================ your bookings */

function renderMine() {
  const all = getBookings();
  const sec = $('#your-bookings');
  sec.hidden = all.length === 0;
  if (!all.length) return;
  const fmt = new Intl.DateTimeFormat(CONFIG.locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const statusLabel = { requested: 'Requested — cash at the door', pending: 'Card — awaiting payment', paid: 'Paid' };
  $('#mine-list').innerHTML = all.map((b) => `
    <li class="mine__item">
      <span class="mine__summary">${esc(b.summary || describeBooking(b))}</span>
      <span class="mine__meta">
        <span class="mine__status">${esc(statusLabel[b.status] || b.status || '')}</span>
        <span>${esc(b.reference || '')}</span>
        <span>${b.createdAt ? esc(fmt.format(new Date(b.createdAt))) : ''}</span>
        <span>${esc(bookingTotalFormatted(b))}</span>
      </span>
    </li>
  `).join('');
}

/* ================================================================ booking flow */

const EMPTY = {
  optionId: '', levelId: '', firstName: '', lastName: '', email: '', phone: '',
  withPartner: false, partnerName: '', role: 'Either', notes: '',
};

const booking = {
  dlg: null, form: null, step: 1, data: { ...EMPTY }, opener: null,

  init() {
    this.dlg = $('#booking');
    this.form = $('#booking-form');

    // Openers
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-book]');
      if (btn) { e.preventDefault(); this.open(btn); return; }
      if (e.target.closest('[data-close]')) { e.preventDefault(); this.close(); }
    });
    this.dlg.addEventListener('cancel', (e) => { e.preventDefault(); this.close(); });
    this.dlg.addEventListener('click', (e) => { if (e.target === this.dlg) this.close(); });

    // Inputs
    this.form.addEventListener('input', (e) => this.onInput(e));
    this.form.addEventListener('change', (e) => this.onInput(e));
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.next(); });
    $('#btn-next').addEventListener('click', () => this.next());
    $('#btn-back').addEventListener('click', () => this.go(this.step - 1));
    $('#pay-card').addEventListener('click', () => this.payCard());
    $('#pay-cash').addEventListener('click', () => this.payCash());

    // Draft
    const draft = loadDraft();
    if (draft && typeof draft === 'object') {
      this.data = { ...EMPTY, ...draft.data };
      this.step = Math.min(3, Math.max(1, draft.step || 1));
      if (draft.open) this.open(null, true);
    }
  },

  open(btn, restoring = false) {
    this.opener = btn || this.opener;
    if (btn) {
      const opt = btn.dataset.option, lvl = btn.dataset.level;
      if (opt) {
        this.data.optionId = opt;
        const o = getOption(opt);
        if (o && o.levels === 'both') this.data.levelId = 'both';
        else if (this.data.levelId === 'both') this.data.levelId = '';
      }
      if (lvl) {
        this.data.levelId = lvl;
        const o = getOption(this.data.optionId);
        if (o && o.levels === 'both') this.data.optionId = '';
      }
      if (this.step === 4) this.step = 1;
      if (!restoring && this.step !== 4 && (opt || lvl)) this.step = 1;
    }
    this.hydrate();
    this.go(this.step);
    if (!this.dlg.open) this.dlg.showModal();
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (this.step === 4) { this.reset(); }
    else this.persist(false);
    if (this.dlg.open) this.dlg.close();
    document.body.style.overflow = '';
    if (this.opener && document.contains(this.opener)) this.opener.focus();
  },

  reset() {
    this.data = { ...EMPTY }; this.step = 1; clearDraft();
    this.form.reset();
    $$('.err', this.form).forEach((el) => { el.textContent = ''; });
  },

  persist(open = true) { saveDraft({ data: this.data, step: this.step, open }); },

  hydrate() {
    const d = this.data, f = this.form;
    $$('input[name="levelId"]', f).forEach((i) => { i.checked = i.value === d.levelId; });
    $$('input[name="optionId"]', f).forEach((i) => { i.checked = i.value === d.optionId; });
    f.firstName.value = d.firstName; f.lastName.value = d.lastName; f.email.value = d.email;
    f.phone.value = d.phone; f.withPartner.checked = !!d.withPartner; f.partnerName.value = d.partnerName;
    f.notes.value = d.notes;
    $$('input[name="role"]', f).forEach((i) => { i.checked = i.value === (d.role || 'Either'); });
    this.syncOptions();
    $('#partner-wrap').hidden = !d.withPartner;
    this.updateTotal();
  },

  onInput(e) {
    const t = e.target; if (!t || !t.name) return;
    const d = this.data;
    if (t.name === 'levelId' && t.checked) {
      d.levelId = t.value;
      const o = getOption(d.optionId);
      const want = t.value === 'both' ? 'both' : 'one';
      if (o && o.levels !== want) { d.optionId = ''; $$('input[name="optionId"]', this.form).forEach((i) => { i.checked = false; }); }
      this.syncOptions();
      this.setErr('level', '');
    } else if (t.name === 'optionId' && t.checked) {
      d.optionId = t.value;
      const o = getOption(t.value);
      if (o && o.levels === 'both' && d.levelId !== 'both') {
        d.levelId = 'both';
        $$('input[name="levelId"]', this.form).forEach((i) => { i.checked = i.value === 'both'; });
      } else if (o && o.levels === 'one' && d.levelId === 'both') {
        d.levelId = '';
        $$('input[name="levelId"]', this.form).forEach((i) => { i.checked = false; });
      }
      this.syncOptions();
      this.setErr('option', '');
    } else if (t.name === 'withPartner') {
      d.withPartner = t.checked;
      $('#partner-wrap').hidden = !t.checked;
      if (t.checked) $('#f-partner-name').focus();
      else this.setErr('partnerName', '');
    } else if (t.name === 'role') {
      if (t.checked) d.role = t.value;
    } else if (t.name in d) {
      d[t.name] = t.value;
      if (e.type === 'input') this.setErr(t.name, '');
    }
    this.updateTotal();
    this.persist();
  },

  /** Dim the options that don't fit the chosen level (both vs. one). */
  syncOptions() {
    const lvl = this.data.levelId;
    $$('.opt-card', this.form).forEach((card) => {
      const input = card.querySelector('input');
      const hint = card.querySelector('.opt-card__hint');
      let off = false;
      if (lvl === 'both') off = card.dataset.levels !== 'both';
      else if (lvl) off = card.dataset.levels !== 'one';
      input.disabled = off;
      hint.hidden = !off;
    });
  },

  updateTotal() {
    $('#running-total').textContent = bookingTotalFormatted(this.data);
  },

  setErr(key, msg) {
    const el = $(`#err-${key}`);
    if (el) el.textContent = msg || '';
    const input = this.form.elements[key];
    const field = input && input.closest ? input.closest('.field') : null;
    if (field) field.classList.toggle('is-invalid', !!msg);
    if (input && input.setAttribute) {
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
  },

  validateStep(n) {
    const d = this.data;
    if (n === 1) {
      let ok = true;
      if (!d.levelId) { this.setErr('level', 'Choose a level to continue.'); ok = false; }
      if (!d.optionId || !getOption(d.optionId)) { this.setErr('option', 'Choose an option to continue.'); ok = false; }
      if (!ok) {
        const first = !d.levelId ? $('input[name="levelId"]', this.form) : $('input[name="optionId"]:not(:disabled)', this.form);
        if (first) first.focus();
      }
      return ok;
    }
    if (n === 2) {
      const { valid, errors } = validateBooking(d);
      ['firstName', 'lastName', 'email', 'partnerName'].forEach((k) => this.setErr(k, errors[k] || ''));
      const own = ['firstName', 'lastName', 'email', 'partnerName'].filter((k) => errors[k]);
      if (own.length) { const el = this.form.elements[own[0]]; if (el) el.focus(); return false; }
      return valid || !(errors.optionId || errors.levelId) ? true : (this.go(1), false);
    }
    return true;
  },

  next() {
    if (this.step >= 3) return;
    if (!this.validateStep(this.step)) return;
    this.go(this.step + 1);
  },

  go(n) {
    this.step = n;
    $$('.step', this.form).forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    $$('.steps__item').forEach((li) => {
      const k = Number(li.dataset.step);
      li.classList.toggle('is-current', k === n);
      li.classList.toggle('is-done', k < n);
      if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    const foot = $('#booking-foot');
    foot.hidden = n >= 3;
    $('#btn-back').hidden = n === 1;
    $('#btn-next').textContent = n === 1 ? 'Continue' : 'Review & pay';
    $('#booking-title').textContent = n === 4 ? 'You’re in' : n === 3 ? 'Review & pay' : n === 2 ? 'Your details' : 'Book your class';
    if (n === 3) this.renderSummary();
    this.form.scrollTop = 0;
    if (n !== 4) this.persist();
    // Focus the first useful control in the step.
    const sec = $(`.step[data-step="${n}"]`, this.form);
    const focusable = sec && sec.querySelector('input:not([type=radio]):not(:disabled), button, input:checked');
    if (focusable && this.dlg.open) focusable.focus({ preventScroll: true });
  },

  renderSummary() {
    const d = this.data;
    $('#summary-what').textContent = describeBooking(d);
    const who = [`${d.firstName} ${d.lastName}`.trim(), d.email, d.phone, d.withPartner ? `with ${d.partnerName}` : '', `dancing ${d.role || 'Either'}`]
      .filter(Boolean).join(' · ');
    $('#summary-who').textContent = who;
    $('#summary-total').textContent = bookingTotalFormatted(d);
    $('#summary-discount').textContent = d.withPartner
      ? `Partner deal −15% will be applied when we confirm. ${CONFIG.discountNote}`
      : CONFIG.discountNote;
    const card = $('#pay-card');
    const avail = cardPaymentAvailable(d.optionId);
    card.setAttribute('aria-disabled', avail ? 'false' : 'true');
    $('#pay-card-note').textContent = avail ? 'Secure checkout with Stripe' : 'Coming soon — choose cash for now';
    this.setErr('pay', '');
  },

  async payCard() {
    const btn = $('#pay-card');
    this.setErr('pay', '');
    btn.classList.add('is-busy');
    const res = await startCheckout(this.data);
    btn.classList.remove('is-busy');
    if (!res.ok) {
      this.setErr('pay', res.error || 'Card payment did not start. Please choose cash for now.');
      if (res.errors && (res.errors.firstName || res.errors.lastName || res.errors.email || res.errors.partnerName)) this.go(2);
    }
  },

  async payCash() {
    const { valid, errors } = validateBooking(this.data);
    if (!valid) {
      this.setErr('pay', Object.values(errors)[0]);
      if (errors.optionId || errors.levelId) this.go(1); else { this.go(2); this.validateStep(2); }
      return;
    }
    // Show the confirmation first, so it is on screen regardless of the mail handoff.
    const snapshot = { ...this.data };
    $('#done-what').textContent = `${describeBooking(snapshot)} · ${bookingTotalFormatted(snapshot)} · cash at the door`;
    $('#done-text').textContent = `Thanks ${snapshot.firstName.trim()} — we'll email ${snapshot.email.trim()} to confirm your place.`;
    $('#done-ref').textContent = '…';
    $('#done-fallback').hidden = true;
    this.go(4);

    const res = await submitCashBooking(snapshot);
    if (res.ok) {
      $('#done-ref').textContent = res.reference || '—';
      $('#done-fallback').hidden = !res.fallback;
      this.data = { ...EMPTY }; clearDraft(); this.form.reset();
      renderMine();
    } else {
      this.go(3);
      this.setErr('pay', res.error || 'Something went wrong. Please try again or write to us.');
    }
  },
};

/* ================================================================ boot */

renderContent();
initLight();
renderMine();
booking.init();

$('#mine-clear').addEventListener('click', () => { clearBookings(); renderMine(); });

const ret = checkReturnFromPayment();
if (ret.booked) {
  renderMine();
  toast(`<strong>Payment received.</strong> Your place is booked${ret.reference ? ` — reference ${esc(ret.reference)}` : ''}. See you Thursday.`, 9000);
  history.replaceState(null, '', location.pathname);
} else if (ret.cancelled) {
  toast('<strong>Payment cancelled.</strong> Your details are still here — open the booking to try again or choose cash.', 8000);
  history.replaceState(null, '', location.pathname);
}
