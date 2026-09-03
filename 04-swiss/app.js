import { CONFIG, formatPrice, getOption, getLevel } from '../shared/site-config.js';
import {
  startCheckout, submitCashBooking, validateBooking, describeBooking,
  bookingTotalFormatted, cardPaymentAvailable, getBookings, clearBookings,
  saveDraft, loadDraft, clearDraft, checkReturnFromPayment,
} from '../shared/booking-core.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* How many classes each option buys — UI-only, for the "per class" column. */
const CLASS_COUNT = { 'trial': 1, 'dropin-1': 1, 'dropin-2': 2, 'block-1': 4, 'block-2': 8 };
const classCount = (o) => CLASS_COUNT[o.id] || (o.levels === 'both' ? 2 : 1);
const weeksOf = (o) => (o.id.startsWith('block') ? 4 : 1);

/* ────────────────────────────── render: timetable ────────────────────────────── */
function renderTimetable() {
  const rows = CONFIG.levels.map((l) => `
    <li class="tt__row">
      <div class="tt__time"><time datetime="${esc(l.start)}">${esc(l.start)}</time></div>
      <div class="tt__main">
        <span class="tt__lvl" aria-hidden="true">${l.number}</span>
        <h3 class="tt__name"><small>Level ${l.number}</small>${esc(l.name)}</h3>
      </div>
      <p class="tt__desc">${esc(l.description)}<em>${esc(l.forWho)}</em></p>
      <div class="tt__cta">
        <button class="tt__book" type="button" data-book data-level="${l.id}">Book Level ${l.number} <span aria-hidden="true">→</span></button>
      </div>
    </li>`).join('');
  const last = CONFIG.levels[CONFIG.levels.length - 1];
  $('#tt-rows').innerHTML = rows + `
    <li class="tt__row tt__row--end">
      <div class="tt__time"><time datetime="${esc(last.end)}">${esc(last.end)}</time></div>
      <p class="tt__end">End of class</p>
    </li>`;
}

/* ────────────────────────────── render: classes ────────────────────────────── */
function renderLevels() {
  const o = CONFIG.otherLevel;
  const cards = CONFIG.levels.map((l) => `
    <li class="level">
      <span class="level__n" aria-hidden="true">${l.number}</span>
      <p class="level__time">Level ${l.number} · Thu ${esc(l.time)}</p>
      <h3 class="level__name">${esc(l.name)}</h3>
      <p class="level__desc">${esc(l.description)}</p>
      <p class="level__who">${esc(l.forWho)}</p>
      <p class="level__cta"><button class="btn" type="button" data-book data-level="${l.id}">Book Level ${l.number}</button></p>
    </li>`);
  cards.splice(1, 0, `
    <li class="level level--other" aria-label="Level 2, taught elsewhere">
      <span class="level__n" aria-hidden="true">${o.number}</span>
      <p class="level__time">Level ${o.number} · Elsewhere in Munich</p>
      <h3 class="level__name">${esc(o.name)}</h3>
      <p class="level__desc">${esc(o.description)}</p>
      <p class="level__who">${esc(o.note)}</p>
    </li>`);
  $('#levels').innerHTML = cards.join('');
}

/* ────────────────────────────── render: next Thursdays ────────────────────────────── */
function renderNextDates() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const THU = 4;
  let delta = (THU - d.getDay() + 7) % 7;
  // if it is Thursday and class is already over, show next week
  if (delta === 0 && now.getHours() >= 22) delta = 7;
  d.setDate(d.getDate() + delta);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = { format: (x) => `${x.getDate()} ${MONTHS[x.getMonth()]}` };
  const items = [];
  for (let i = 0; i < 4; i++) {
    const dt = new Date(d); dt.setDate(d.getDate() + i * 7);
    const iso = dt.toISOString().slice(0, 10);
    items.push(`<li><time datetime="${iso}">${esc(fmt.format(dt))}</time><span>${i === 0 ? 'Next Thursday' : `Week ${i + 1}`}</span></li>`);
  }
  $('#next-dates').innerHTML = items.join('');
}

/* ────────────────────────────── render: prices ────────────────────────────── */
function renderPrices() {
  const head = `
    <div class="price__head" role="row">
      <span role="columnheader">Option</span><span role="columnheader">What you get</span>
      <span role="columnheader">Classes</span><span role="columnheader">Per class</span>
      <span role="columnheader">Price</span><span aria-hidden="true"></span>
    </div>`;
  const rows = CONFIG.options.map((o) => {
    const n = classCount(o);
    const per = formatPrice(Math.round(o.price / n));
    const lv = o.levels === 'both' ? 'both levels' : 'one level';
    const wk = weeksOf(o) === 1 ? '1 night' : `${weeksOf(o)} Thursdays`;
    return `
    <button class="price__row${o.badge ? ' has-badge' : ''}" type="button" role="row" data-book data-option="${esc(o.id)}" aria-label="${esc(o.label)}, ${formatPrice(o.price)}. Book this">
      <span class="price__badge" role="cell">${esc(o.badge || '')}</span>
      <span class="price__label" role="cell">${esc(o.label)}</span>
      <span class="price__blurb" role="cell">${esc(o.blurb)}</span>
      <span class="price__meta" role="cell"><span>${n} ${n === 1 ? 'class' : 'classes'}</span><i>·</i><span>${wk}</span><i>·</i><span>${lv}</span></span>
      <span class="price__per" role="cell">${per} / class</span>
      <span class="price__amt" role="cell">${formatPrice(o.price)}<small>${per} per class</small></span>
      <span class="price__go" role="cell">Book →</span>
    </button>`;
  }).join('');
  $('#price-table').innerHTML = head + rows;

  $('#discounts').innerHTML = CONFIG.discounts.map((d) => `
    <li><b>${esc(d.amount)}</b><span><strong>${esc(d.label)}</strong>${esc(d.note)}</span></li>`).join('');
  $('#discount-note').textContent = CONFIG.discountNote;
}

/* ────────────────────────────── render: your bookings ────────────────────────────── */
function renderMine() {
  const all = getBookings();
  const sec = $('#mine');
  if (!all.length) { sec.hidden = true; return; }
  sec.hidden = false;
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  $('#mine-list').innerHTML = all.map((b) => `
    <li>
      <b>${esc(b.summary || describeBooking(b))}</b>
      <span class="ref">${esc(b.reference || '')} · ${esc(b.method === 'card' ? 'card' : 'cash at the door')} · ${esc(fmt.format(new Date(b.createdAt || Date.now())))}</span>
      <span class="st">${esc(b.status || '')}</span>
    </li>`).join('');
}

/* ────────────────────────────── booking dialog ────────────────────────────── */
const dlg = $('#book');
const form = $('#book-form');
const state = {
  step: 1,
  booking: {
    optionId: '', levelId: '', firstName: '', lastName: '', email: '', phone: '',
    withPartner: false, partnerName: '', role: 'Either', notes: '',
  },
};

function renderBookingOptions() {
  $('#opt-list').innerHTML = CONFIG.options.map((o) => `
    <div class="opt">
      <input type="radio" name="optionId" id="o-${esc(o.id)}" value="${esc(o.id)}">
      <label for="o-${esc(o.id)}">
        <span class="opt__label">${esc(o.label)}</span>
        <span class="opt__blurb">${esc(o.blurb)}</span>
        <span class="opt__price">${formatPrice(o.price)}</span>
      </label>
    </div>`).join('');

  $('#lvl-list').innerHTML = CONFIG.levels.map((l) => `
    <input type="radio" name="levelId" id="lv-${esc(l.id)}" value="${esc(l.id)}">
    <label for="lv-${esc(l.id)}"><b><i>${l.number}</i> ${esc(l.name)}</b><small>Thu ${esc(l.time)}</small></label>`).join('');
  $('#lvl-note').textContent = `This option includes both levels — ${CONFIG.levels[0].start} to ${CONFIG.levels[CONFIG.levels.length - 1].end}.`;
}

function readForm() {
  const b = state.booking;
  const fd = new FormData(form);
  b.optionId = fd.get('optionId') || '';
  const opt = getOption(b.optionId);
  b.levelId = opt && opt.levels === 'both' ? 'both' : (fd.get('levelId') || '');
  b.firstName = fd.get('firstName') || '';
  b.lastName = fd.get('lastName') || '';
  b.email = fd.get('email') || '';
  b.phone = fd.get('phone') || '';
  b.withPartner = fd.get('withPartner') === 'on';
  b.partnerName = fd.get('partnerName') || '';
  b.role = fd.get('role') || 'Either';
  b.notes = fd.get('notes') || '';
  saveDraft({ ...b, step: state.step });
}

function writeForm() {
  const b = state.booking;
  const set = (name, v) => { const el = form.elements[name]; if (el && !(el instanceof RadioNodeList)) el.value = v || ''; };
  const radio = (name, v) => { const el = form.querySelector(`input[name="${name}"][value="${CSS.escape(v || '')}"]`); if (el) el.checked = true; };
  radio('optionId', b.optionId);
  if (b.levelId && b.levelId !== 'both') radio('levelId', b.levelId);
  set('firstName', b.firstName); set('lastName', b.lastName); set('email', b.email); set('phone', b.phone);
  form.elements.withPartner.checked = !!b.withPartner;
  set('partnerName', b.partnerName); radio('role', b.role || 'Either'); set('notes', b.notes);
  $('#partner-wrap').hidden = !b.withPartner;
}

function syncLevelControl() {
  const opt = getOption(state.booking.optionId);
  const both = !!(opt && opt.levels === 'both');
  const list = $('#lvl-list');
  list.classList.toggle('is-locked', both);
  $$('input[name="levelId"]', list).forEach((r) => { r.disabled = both; });
  $('#lvl-note').hidden = !both;
  $('#level-fs').querySelector('legend').textContent = both ? 'Levels (included)' : 'Level';
}

function updateTotal() {
  const b = state.booking;
  $('#total').textContent = b.optionId ? bookingTotalFormatted(b) : '€0';
  $('#total-desc').textContent = b.optionId ? describeBooking(b).split(' · ').slice(0, 2).join(' · ') : 'Choose an option';
}

function showErrors(errors, only) {
  $$('[data-err]', form).forEach((p) => {
    const key = p.dataset.err;
    const msg = errors[key] && (!only || only.includes(key)) ? errors[key] : '';
    p.textContent = msg;
    const field = p.closest('.field'); if (field) field.classList.toggle('is-bad', !!msg);
  });
}

const STEP1 = ['optionId', 'levelId'];
const STEP2 = ['firstName', 'lastName', 'email', 'partnerName'];

function goto(step) {
  state.step = step;
  $$('.step', form).forEach((s) => { s.hidden = s.dataset.step !== String(step); });
  $$('[data-step-ind]').forEach((li) => {
    const n = +li.dataset.stepInd;
    const cur = step === 'done' ? 4 : step;
    li.classList.toggle('is-current', n === cur);
    if (n === cur) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    li.classList.toggle('is-done', n < cur);
  });
  const done = step === 'done';
  dlg.classList.toggle('is-done', done);
  $('#btn-back').hidden = step === 1 || done;
  $('#btn-next').hidden = step === 3 || done;
  $('#btn-done').hidden = !done;
  if (step === 3) renderSummary();
  $('.book__body').scrollTop = 0;
  const h = form.querySelector(`.step[data-step="${step}"] .step__title`);
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  saveDraft({ ...state.booking, step });
}

function renderSummary() {
  const b = state.booking;
  const opt = getOption(b.optionId);
  const who = `${b.firstName} ${b.lastName}`.trim() + (b.withPartner && b.partnerName ? ` + ${b.partnerName}` : '');
  $('#summary').innerHTML = `
    <b>${esc(opt ? opt.label : '')} — ${bookingTotalFormatted(b)}</b>
    <span>${esc(describeBooking(b))}</span>
    <span>${esc(who)} · ${esc(b.email)} · ${esc(b.role)}</span>`;
  const card = $('#pay-card');
  const ok = cardPaymentAvailable(b.optionId);
  card.disabled = !ok;
  $('#pay-card-desc').textContent = ok
    ? 'Secure checkout with Stripe. Your place is confirmed immediately.'
    : 'Card payment is not switched on yet. Choose cash for now — same price.';
  $('#pay-note').textContent = CONFIG.discountNote;
  $('#pay-err').textContent = '';
}

function next() {
  readForm();
  const { errors } = validateBooking(state.booking);
  if (state.step === 1) {
    const mine = STEP1.filter((k) => errors[k]);
    showErrors(errors, STEP1);
    if (mine.length) { form.querySelector(`[data-err="${mine[0]}"]`).scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    goto(2);
  } else if (state.step === 2) {
    const mine = STEP2.filter((k) => errors[k]);
    showErrors(errors, STEP2);
    if (mine.length) { const el = form.elements[mine[0]]; if (el && el.focus) el.focus(); return; }
    goto(3);
  }
}

async function pay(method) {
  readForm();
  const btn = method === 'card' ? $('#pay-card') : $('#pay-cash');
  btn.classList.add('is-busy');
  $('#pay-err').textContent = '';
  const b = { ...state.booking };
  let res;
  try {
    // Show the confirmation *before* any mailto: hand-off so the UI never looks stuck.
    if (method === 'cash') {
      const check = validateBooking(b);
      if (!check.valid) { res = { ok: false, error: Object.values(check.errors)[0] }; }
      else {
        const opt = getOption(b.optionId);
        $('#done-text').textContent = `Thanks, ${b.firstName.trim()}. We have your request for ${opt.label} (${bookingTotalFormatted(b)}) — pay cash at the door. We'll email ${b.email.trim()} to confirm your place.`;
        res = await submitCashBooking(b);
        if (res.ok) {
          $('#done-ref').textContent = res.reference || '';
          $('#done-fallback').hidden = !res.fallback;
          clearDraft();
          renderMine();
          goto('done');
        }
      }
    } else {
      res = await startCheckout(b);
    }
  } catch (err) {
    res = { ok: false, error: err.message || 'Something went wrong.' };
  }
  btn.classList.remove('is-busy');
  if (res && !res.ok) $('#pay-err').textContent = res.error || 'Something went wrong. Please try again.';
}

function openBooking({ option, level } = {}) {
  const draft = loadDraft();
  if (draft) { Object.assign(state.booking, draft); }
  if (option) state.booking.optionId = option;
  if (level) {
    state.booking.levelId = level;
    // choosing a level from the timetable: default to a single-level option if none picked
    const cur = getOption(state.booking.optionId);
    if (!cur || cur.levels === 'both') state.booking.optionId = cur ? cur.id : 'trial';
  }
  writeForm();
  readForm();
  syncLevelControl();
  updateTotal();
  showErrors({});
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  document.body.style.overflow = 'hidden';
  goto(1);
}

function closeBooking() {
  if (dlg.open) dlg.close();
  document.body.style.overflow = '';
  if (state.step === 'done') {
    // fresh start next time
    Object.assign(state.booking, { optionId: '', levelId: '', notes: '', withPartner: false, partnerName: '' });
    form.reset();
    clearDraft();
  }
}

function wireBooking() {
  renderBookingOptions();

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-book]');
    if (t) { e.preventDefault(); openBooking({ option: t.dataset.option, level: t.dataset.level }); }
    if (e.target.closest('[data-close]')) closeBooking();
  });
  dlg.addEventListener('close', () => { document.body.style.overflow = ''; });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeBooking(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeBooking(); });

  form.addEventListener('input', () => {
    readForm();
    syncLevelControl();
    updateTotal();
    $('#partner-wrap').hidden = !state.booking.withPartner;
    if (state.booking.withPartner) { const el = form.elements.partnerName; if (document.activeElement === form.elements.withPartner) el.focus(); }
    // clear an error as soon as it is fixed
    const { errors } = validateBooking(state.booking);
    $$('[data-err]', form).forEach((p) => { if (p.textContent && !errors[p.dataset.err]) { p.textContent = ''; const f = p.closest('.field'); if (f) f.classList.remove('is-bad'); } });
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); if (state.step !== 3 && state.step !== 'done') next(); });
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); if (state.step !== 3) next(); } });
  $('#btn-next').addEventListener('click', next);
  $('#btn-back').addEventListener('click', () => goto(state.step === 3 ? 2 : 1));
  $('#pay-card').addEventListener('click', () => pay('card'));
  $('#pay-cash').addEventListener('click', () => pay('cash'));
  $('#mine-clear').addEventListener('click', () => { clearBookings(); renderMine(); });

  // draft restore (phone rotation / accidental close)
  const draft = loadDraft();
  if (draft) Object.assign(state.booking, draft);
}

/* ────────────────────────────── return from Stripe ────────────────────────────── */
function handleReturn() {
  const r = checkReturnFromPayment();
  const n = $('#notice');
  if (r.booked) {
    n.innerHTML = `<div><span class="num">Paid</span><span>Thank you — your place is booked${r.reference ? ` (ref ${esc(r.reference)})` : ''}. See you Thursday.</span></div>`;
    n.hidden = false;
  } else if (r.cancelled) {
    n.innerHTML = `<div><span class="num">Not paid</span><span>Payment was cancelled. Nothing was charged — you can book again, or choose cash at the door.</span></div>`;
    n.hidden = false;
  }
}

/* ────────────────────────────── init ────────────────────────────── */
$('#foot-email').href = `mailto:${CONFIG.brand.email}`;
$('#foot-email').textContent = CONFIG.brand.email;
// Keep any inline price mentions in the copy in sync with shared/site-config.js.
document.querySelectorAll('[data-price]').forEach((el) => {
  const opt = CONFIG.options.find((o) => o.id === el.dataset.price);
  if (opt) el.textContent = formatPrice(opt.price);
});
renderTimetable();
renderLevels();
renderNextDates();
renderPrices();
renderMine();
wireBooking();
handleReturn();
