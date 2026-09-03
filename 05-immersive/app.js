/* Miriam & Pavan — variation 05 "Immersive". UI only; data + payment live in ../shared/. */
import { CONFIG, formatPrice, getOption, getLevel } from '../shared/site-config.js';
import {
  startCheckout, submitCashBooking, validateBooking, describeBooking, bookingTotalFormatted,
  cardPaymentAvailable, getBookings, clearBookings, saveDraft, loadDraft, clearDraft,
  checkReturnFromPayment,
} from '../shared/booking-core.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ page content from CONFIG */

function renderLevels() {
  const wrap = $('#levels');
  wrap.innerHTML = CONFIG.levels.map((l) => `
    <article class="level" data-reveal>
      <div class="level__top">
        <span class="level__num">Level ${l.number}</span>
        <span class="level__time">${esc(l.time)}</span>
      </div>
      <h3>${esc(l.name)}</h3>
      <p class="level__desc">${esc(l.description)}</p>
      <p class="level__who">${esc(l.forWho)}</p>
      <button class="btn btn--gold" type="button" data-book-level="${l.id}">Book Level ${l.number}</button>
    </article>`).join('');
  const o = CONFIG.otherLevel;
  $('#level-other').innerHTML =
    `<strong>Level ${o.number} — ${esc(o.name)}</strong> · ${esc(o.description)} ${esc(o.note)}`;
}

function renderRail() {
  const items = CONFIG.levels.map((l) => `
    <li class="rail__item" data-reveal>
      <span class="rail__time">${esc(l.start)}</span>
      <div class="rail__body">
        <p class="rail__title"><small>Level ${l.number}</small>${esc(l.name)}</p>
        <p class="rail__meta">${esc(l.start)} – ${esc(l.end)} · ${esc(CONFIG.venue.name)}, ${esc(CONFIG.venue.room)}</p>
      </div>
    </li>`);
  const last = CONFIG.levels[CONFIG.levels.length - 1];
  items.push(`
    <li class="rail__item rail__item--end" data-reveal>
      <span class="rail__time">${esc(last.end)}</span>
      <div class="rail__body">Both classes done. Same time next ${esc(CONFIG.day)}.</div>
    </li>`);
  $('#rail').innerHTML = items.join('');
}

function renderPrices() {
  $('#prices').innerHTML = CONFIG.options.map((o) => `
    <button class="price${o.id.startsWith('block') ? ' price--hot' : ''}" type="button" data-book-option="${o.id}" data-reveal aria-label="Book ${esc(o.label)}, ${formatPrice(o.price)}">
      ${o.badge ? `<span class="price__badge">${esc(o.badge)}</span>` : ''}
      <span class="price__label">${esc(o.label)}</span>
      <span class="price__blurb">${esc(o.blurb)}</span>
      <span class="price__amount">${formatPrice(o.price)}</span>
    </button>`).join('');
  $('#discounts').innerHTML =
    CONFIG.discounts.map((d) => `<div class="discounts__row"><strong>${esc(d.amount)}</strong><span><b>${esc(d.label)}</b> ${esc(d.note)}</span></div>`).join('') +
    `<p class="discounts__note">${esc(CONFIG.discountNote)}</p>`;
}

function renderStatic() {
  const trial = getOption('trial');
  if (trial) $('#faq-trial').textContent = `Yes. Book a trial class for ${formatPrice(trial.price)} — either level, no commitment. If you like it, move on to a single class or the 4-week course.`;
  $('#footer-ig').href = CONFIG.brand.instagram;
  $('#teachers-ig').href = CONFIG.brand.instagram;
  $('#footer-mail').href = `mailto:${CONFIG.brand.email}`;
  $('#footer-scene').href = CONFIG.brand.sceneLink;
  $('#maps-link').href = CONFIG.venue.mapsUrl;
}

/* ------------------------------------------------------------------ your bookings (this device) */

function renderHistory() {
  const list = getBookings();
  const sec = $('#bookings');
  sec.hidden = list.length === 0;
  if (!list.length) return;
  const status = { paid: 'Paid', pending: 'Card payment pending', requested: 'Requested — cash at the door' };
  $('#history').innerHTML = list.map((b) => `
    <li class="history__item">
      <p class="history__summary">${esc(b.summary || describeBooking(b))}</p>
      <p class="history__meta">
        <span><b>${esc(b.reference)}</b></span>
        <span>${esc(status[b.status] || b.status)}</span>
        <span>${esc(new Date(b.createdAt).toLocaleDateString(CONFIG.locale, { day: 'numeric', month: 'short', year: 'numeric' }))}</span>
      </p>
    </li>`).join('');
}

/* ------------------------------------------------------------------ story bar */

function initStoryBar() {
  const bar = $('#storybar');
  const sections = $$('[data-story]');
  bar.innerHTML = sections.map(() => '<span class="storybar__seg"><i></i></span>').join('');
  const segs = $$('.storybar__seg', bar);
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY + window.innerHeight * 0.4;
    sections.forEach((s, i) => {
      const top = s.offsetTop, h = s.offsetHeight;
      const p = Math.max(0, Math.min(1, (y - top) / h));
      segs[i].firstElementChild.style.width = `${(p * 100).toFixed(1)}%`;
      if (p > 0 && p < 1) segs[i].setAttribute('data-on', ''); else segs[i].removeAttribute('data-on');
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

/* ------------------------------------------------------------------ reveal on scroll */

function initReveal() {
  const els = $$('[data-reveal]');
  if (reduceMotion() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((e) => io.observe(e));
}

/* ------------------------------------------------------------------ toast */

let toastTimer;
function toast(msg, ms = 5000) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/* ==================================================================== BOOKING SHEET */

const EMPTY = { levelId: '', optionId: '', firstName: '', lastName: '', email: '', phone: '', withPartner: false, partnerName: '', role: 'Either', notes: '' };
const ORDER = ['level', 'option', 'details', 'pay', 'done'];
const STEP_OF = { level: [1, 0.5, 'Choose'], option: [1, 1, 'Choose'], details: [2, 1, 'Details'], pay: [3, 1, 'Pay'], done: [3, 1, 'Booked'] };

const sheet = {
  root: $('#sheet'),
  panel: $('#sheet .sheet'),
  body: $('#sheet-body'),
  foot: $('#sheet-foot'),
  next: $('#sheet-next'),
  back: $('#sheet [data-back]'),
  step: $('#sheet-step'),
  segs: $$('#steps .steps__seg i'),
  state: { ...EMPTY },
  screen: 'level',
  stack: [],
  opener: null,
  open: false,
};

const levelTiles = () => $$('#level-tiles .tile');
const optionBtns = () => $$('#option-list .opt');

function buildSheet() {
  const tiles = CONFIG.levels.map((l) => `
    <button class="tile" type="button" data-level="${l.id}" aria-pressed="false">
      <span class="tile__kicker">Level ${l.number}</span>
      <span class="tile__name">${esc(l.name)}</span>
      <span class="tile__sub">${esc(l.forWho)}</span>
      <span class="tile__time">${esc(l.start)}<br>${esc(l.end)}</span>
    </button>`);
  const first = CONFIG.levels[0], last = CONFIG.levels[CONFIG.levels.length - 1];
  tiles.push(`
    <button class="tile" type="button" data-level="both" aria-pressed="false">
      <span class="tile__kicker">Level ${first.number} + ${last.number}</span>
      <span class="tile__name">Both levels</span>
      <span class="tile__sub">Two hours back to back. Save ${formatPrice(getOption('dropin-1').price * 2 - getOption('dropin-2').price)} a night.</span>
      <span class="tile__time">${esc(first.start)}<br>${esc(last.end)}</span>
    </button>`);
  $('#level-tiles').innerHTML = tiles.join('');

  $('#option-list').innerHTML = CONFIG.options.map((o) => `
    <button class="opt" type="button" data-option="${o.id}" data-levels="${o.levels}" aria-pressed="false">
      ${o.badge ? `<span class="opt__badge">${esc(o.badge)}</span>` : ''}
      <span class="opt__label">${esc(o.label)}</span>
      <span class="opt__blurb">${esc(o.blurb)}</span>
      <span class="opt__price">${formatPrice(o.price)}</span>
    </button>`).join('');
  $('#option-discounts').textContent =
    CONFIG.discounts.map((d) => `${d.label} ${d.amount} ${d.note}.`).join(' ') + ' ' + CONFIG.discountNote;
}

/* ---- state helpers */

function setState(patch) {
  Object.assign(sheet.state, patch);
  saveDraft({ ...sheet.state });
}

function levelLabel(levelId) {
  if (levelId === 'both') return 'Level 1 + Level 3';
  const l = getLevel(levelId);
  return l ? `Level ${l.number} — ${l.name}` : '';
}

function syncSelections() {
  const s = sheet.state;
  levelTiles().forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.level === s.levelId)));
  const wantBoth = s.levelId === 'both';
  optionBtns().forEach((b) => {
    const isBoth = b.dataset.levels === 'both';
    b.hidden = s.levelId ? (isBoth !== wantBoth) : false;
    b.setAttribute('aria-pressed', String(b.dataset.option === s.optionId));
  });
  $('#option-hint').textContent = s.levelId
    ? `${levelLabel(s.levelId)}, ${CONFIG.day}s. Tap to choose, then continue.`
    : 'Tap to choose, then continue.';
}

function syncForm() {
  const s = sheet.state;
  $('#f-first').value = s.firstName;
  $('#f-last').value = s.lastName;
  $('#f-email').value = s.email;
  $('#f-phone').value = s.phone;
  $('#f-partner').checked = !!s.withPartner;
  $('#partner-field').hidden = !s.withPartner;
  $('#f-partner-name').value = s.partnerName;
  $('#f-notes').value = s.notes;
  const r = $(`#details-form input[name="role"][value="${s.role}"]`) || $('#details-form input[name="role"][value="Either"]');
  r.checked = true;
}

function summaryHTML() {
  const s = sheet.state;
  const opt = getOption(s.optionId);
  if (!opt) return '';
  return `
    <span class="summary__what">${esc(opt.label)}</span>
    <span class="summary__meta">${esc(levelLabel(s.levelId))} · ${esc(CONFIG.day)}s, ${esc(CONFIG.venue.name)}</span>
    <span class="summary__total">${bookingTotalFormatted(s)}</span>`;
}

/* ---- screen navigation */

function goto(name, dir = 'forward') {
  const prev = sheet.screen;
  if (dir === 'forward' && prev !== name && sheet.screen !== 'done') sheet.stack.push(prev);
  sheet.screen = name;

  $$('.screen', sheet.body).forEach((sc) => {
    const on = sc.dataset.screen === name;
    if (on) { sc.setAttribute('data-active', ''); sc.setAttribute('data-dir', dir); }
    else { sc.removeAttribute('data-active'); sc.removeAttribute('data-dir'); }
  });
  sheet.body.scrollTop = 0;

  // progress
  const [step, frac, label] = STEP_OF[name];
  sheet.segs.forEach((seg, i) => {
    const n = i + 1;
    seg.style.width = n < step ? '100%' : n === step ? `${frac * 100}%` : '0%';
  });
  sheet.step.textContent = name === 'done' ? 'Booking sent' : `Step ${step} of 3 · ${label}`;

  // header + footer chrome
  sheet.back.classList.toggle('is-off', sheet.stack.length === 0 || name === 'done');
  sheet.foot.hidden = name === 'pay';
  sheet.panel.setAttribute('aria-labelledby', `scr-${name}-title`);

  if (name === 'level') { syncSelections(); }
  if (name === 'option') { syncSelections(); }
  if (name === 'details') { syncForm(); }
  if (name === 'pay') { renderPay(); }
  updateFooter();

  const title = $(`#scr-${name}-title`);
  if (title) requestAnimationFrame(() => title.focus({ preventScroll: true }));
}

function goBack() {
  if (!sheet.stack.length) return;
  const to = sheet.stack.pop();
  goto(to, 'back');
}

function updateFooter() {
  const s = sheet.state;
  const opt = getOption(s.optionId);
  $('#total-value').textContent = opt ? formatPrice(opt.price) : '—';
  $('#total-label').textContent = opt ? (opt.levels === 'both' ? 'Total · both levels' : 'Total') : 'Total';
  const n = sheet.next;
  switch (sheet.screen) {
    case 'level':   n.textContent = 'Continue'; n.disabled = !s.levelId; break;
    case 'option':  n.textContent = 'Continue'; n.disabled = !opt; break;
    case 'details': n.textContent = 'Continue to payment'; n.disabled = false; break;
    case 'done':    n.textContent = 'Done'; n.disabled = false; break;
    default:        n.textContent = 'Continue'; n.disabled = true;
  }
}

function renderPay() {
  $('#pay-summary').innerHTML = summaryHTML();
  const ok = cardPaymentAvailable(sheet.state.optionId);
  const card = $('#pay-card');
  card.setAttribute('aria-disabled', String(!ok));
  $('#pay-card-sub').textContent = ok ? 'Secure checkout with Stripe' : 'Not switched on yet';
  $('#pay-note').textContent = ok
    ? 'Card payments are handled by Stripe. Cash bookings are confirmed by email and paid on the night.'
    : 'Card payment is coming soon — for now, book with cash and pay when you arrive. We\'ll email you to confirm your place.';
  $('#pay-error').textContent = '';
}

/* ---- open / close */

function openSheet(entry = {}, from) {
  sheet.opener = from || document.activeElement;
  const draft = loadDraft() || {};
  sheet.state = { ...EMPTY, ...draft, ...entry };
  sheet.stack = [];

  // where to start: one decision per screen, skip what is already known
  let start = 'level';
  const opt = getOption(sheet.state.optionId);
  if (opt && opt.levels === 'both') { sheet.state.levelId = 'both'; start = 'option'; sheet.stack.push('level'); }
  else if (opt && sheet.state.levelId === 'both') { sheet.state.levelId = ''; start = 'level'; }
  else if (!opt && sheet.state.levelId) { start = 'option'; if (sheet.state.levelId) sheet.stack.push('level'); }
  else if (opt && sheet.state.levelId) { start = 'option'; sheet.stack.push('level'); }
  saveDraft({ ...sheet.state });

  sheet.root.hidden = false;
  document.documentElement.classList.add('is-locked');
  sheet.screen = start; // no push on first render
  goto(start, 'forward');
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.root.classList.add('is-open')));
  sheet.open = true;
  document.addEventListener('keydown', onKey);
}

function closeSheet() {
  if (!sheet.open) return;
  sheet.open = false;
  sheet.root.classList.remove('is-open');
  document.removeEventListener('keydown', onKey);
  const finish = () => {
    sheet.root.hidden = true;
    document.documentElement.classList.remove('is-locked');
    if (sheet.opener && sheet.opener.focus) sheet.opener.focus({ preventScroll: true });
  };
  if (reduceMotion()) finish(); else setTimeout(finish, 470);
}

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
  if (e.key !== 'Tab') return;
  const focusables = $$('button:not([disabled]), input:not([disabled]), textarea, a[href], [tabindex="0"]', sheet.panel)
    .filter((el) => el.offsetParent !== null && !el.hidden);
  if (!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ---- drag to dismiss (phone) */

function initDrag() {
  const grip = $('#sheet [data-grip]');
  const head = $('#sheet .sheet__head');
  let startY = 0, dy = 0, dragging = false;
  const start = (e) => { dragging = true; dy = 0; startY = e.touches[0].clientY; sheet.root.classList.add('is-dragging'); };
  const move = (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    sheet.panel.style.transform = `translateY(${dy}px)`;
  };
  const end = () => {
    if (!dragging) return;
    dragging = false;
    sheet.root.classList.remove('is-dragging');
    sheet.panel.style.transform = '';
    if (dy > 110) closeSheet();
  };
  [grip, head].forEach((el) => {
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
  });
}

/* ---- validation UI */

const ERR_FIELDS = { firstName: ['#f-first', '#e-first'], lastName: ['#f-last', '#e-last'], email: ['#f-email', '#e-email'], partnerName: ['#f-partner-name', '#e-partner'] };

function showErrors(errors) {
  let first = null;
  Object.entries(ERR_FIELDS).forEach(([key, [inSel, errSel]]) => {
    const input = $(inSel), err = $(errSel);
    const msg = errors[key] || '';
    err.textContent = msg;
    input.setAttribute('aria-invalid', String(!!msg));
    if (msg && !first) first = input;
  });
  if (first) first.focus();
  return !first;
}

function clearError(key) {
  const [inSel, errSel] = ERR_FIELDS[key];
  $(errSel).textContent = '';
  $(inSel).setAttribute('aria-invalid', 'false');
}

/* ---- actions */

function onNext() {
  const s = sheet.state;
  if (sheet.screen === 'level') { if (s.levelId) goto('option'); return; }
  if (sheet.screen === 'option') { if (getOption(s.optionId)) goto('details'); return; }
  if (sheet.screen === 'details') {
    readForm();
    const { errors } = validateBooking(s);
    const fieldErrors = Object.fromEntries(Object.entries(errors).filter(([k]) => k in ERR_FIELDS));
    if (showErrors(fieldErrors)) goto('pay');
    return;
  }
  if (sheet.screen === 'done') { closeSheet(); return; }
}

function readForm() {
  const f = $('#details-form');
  setState({
    firstName: f.firstName.value, lastName: f.lastName.value, email: f.email.value, phone: f.phone.value,
    withPartner: f.withPartner.checked, partnerName: f.partnerName.value,
    role: (f.querySelector('input[name="role"]:checked') || {}).value || 'Either',
    notes: f.notes.value,
  });
}

async function payCash() {
  readForm();
  const btn = $('#pay-cash');
  btn.classList.add('is-busy');
  $('#pay-error').textContent = '';

  // show the confirmation state first — the mail fallback must not be the thing the user waits for
  $('#done-summary').innerHTML = summaryHTML();
  $('#done-ref').textContent = '…';
  $('#done-lede').textContent = 'Sending your request…';
  $('#done-fine').textContent = '';
  const snapshot = { ...sheet.state };
  goto('done');

  const res = await submitCashBooking(snapshot);
  btn.classList.remove('is-busy');
  if (!res.ok) {
    goto('pay', 'back');
    $('#pay-error').textContent = res.error || 'Something went wrong — please try again or email us.';
    if (res.errors) { goto('details', 'back'); showErrors(res.errors); }
    return;
  }
  $('#done-ref').textContent = res.reference;
  $('#done-lede').textContent = `Thanks ${snapshot.firstName.trim()} — we'll email you to confirm your place. Pay ${bookingTotalFormatted(snapshot)} in cash at the door.`;
  $('#done-fine').textContent = res.fallback
    ? 'Your mail app should open with the request ready — just press send. Saved to “Your bookings” on this device.'
    : 'Saved to “Your bookings” on this device.';
  clearDraft();
  sheet.state = { ...EMPTY };
  renderHistory();
}

async function payCard() {
  readForm();
  const card = $('#pay-card');
  if (card.getAttribute('aria-disabled') === 'true') {
    $('#pay-error').textContent = 'Card payment isn\'t switched on yet — choose cash at the door for now.';
    return;
  }
  card.classList.add('is-busy');
  $('#pay-error').textContent = '';
  const res = await startCheckout({ ...sheet.state });
  card.classList.remove('is-busy');
  if (res && !res.ok) {
    if (res.errors) { goto('details', 'back'); showErrors(res.errors); return; }
    $('#pay-error').textContent = res.error || 'Could not start the card payment.';
  }
}

function showPaidReturn(ref) {
  const hit = getBookings().find((b) => b.reference === ref);
  openSheet(hit ? { levelId: hit.levelId, optionId: hit.optionId } : {});
  sheet.stack = [];
  $('#done-summary').innerHTML = hit ? summaryHTML() : '';
  $('#done-ref').textContent = ref || '—';
  $('#done-lede').textContent = 'Payment received. You\'ll get a confirmation by email — see you on Thursday.';
  $('#done-fine').textContent = 'Saved to “Your bookings” on this device.';
  goto('done');
  sheet.state = { ...EMPTY };
}

/* ---- wiring */

function initSheet() {
  buildSheet();
  initDrag();

  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => openSheet({}, e.currentTarget)));
  document.addEventListener('click', (e) => {
    const lvl = e.target.closest('[data-book-level]');
    if (lvl) { openSheet({ levelId: lvl.dataset.bookLevel, optionId: '' }, lvl); return; }
    const opt = e.target.closest('[data-book-option]');
    if (opt) { openSheet({ optionId: opt.dataset.bookOption }, opt); return; }
  });

  $$('#sheet [data-close]').forEach((el) => el.addEventListener('click', closeSheet));
  sheet.back.addEventListener('click', goBack);
  sheet.next.addEventListener('click', onNext);

  $('#level-tiles').addEventListener('click', (e) => {
    const t = e.target.closest('.tile'); if (!t) return;
    const id = t.dataset.level;
    const opt = getOption(sheet.state.optionId);
    // keep a preselected option only if it still fits the level
    const keep = opt && ((opt.levels === 'both') === (id === 'both'));
    setState({ levelId: id, optionId: keep ? sheet.state.optionId : '' });
    syncSelections(); updateFooter();
    setTimeout(() => goto('option'), reduceMotion() ? 0 : 220);
  });

  $('#option-list').addEventListener('click', (e) => {
    const b = e.target.closest('.opt'); if (!b) return;
    setState({ optionId: b.dataset.option });
    syncSelections(); updateFooter();
  });

  const form = $('#details-form');
  form.addEventListener('input', (e) => {
    readForm();
    const key = e.target.name;
    if (key in ERR_FIELDS) clearError(key);
  });
  form.addEventListener('change', readForm);
  form.addEventListener('submit', (e) => { e.preventDefault(); onNext(); });
  $('#f-partner').addEventListener('change', (e) => {
    $('#partner-field').hidden = !e.target.checked;
    if (e.target.checked) $('#f-partner-name').focus(); else clearError('partnerName');
  });

  $('#pay-cash').addEventListener('click', payCash);
  $('#pay-card').addEventListener('click', payCard);
}

/* ------------------------------------------------------------------ boot */

renderLevels();
renderRail();
renderPrices();
renderStatic();
renderHistory();
initSheet();
initReveal();
initStoryBar();

$('#history-clear').addEventListener('click', () => { clearBookings(); renderHistory(); toast('Cleared. Your bookings with us are unaffected.'); });

const ret = checkReturnFromPayment();
if (ret.booked) showPaidReturn(ret.reference);
else if (ret.cancelled) toast('Payment cancelled — your place isn\'t booked yet. You can try again or choose cash.');
