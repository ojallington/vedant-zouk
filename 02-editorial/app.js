/**
 * Variation 02 · Editorial — UI layer.
 * Data comes from ../shared/site-config.js; validation, Stripe and cash bookings
 * come from ../shared/booking-core.js. This file only renders and wires the page.
 */
import { CONFIG, formatPrice, getOption, getLevel } from '../shared/site-config.js';
import {
  startCheckout, submitCashBooking, validateBooking, describeBooking,
  bookingTotalFormatted, cardPaymentAvailable,
  getBookings, clearBookings, saveDraft, loadDraft, clearDraft, checkReturnFromPayment,
} from '../shared/booking-core.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ page content */

function renderLevels() {
  $('#levels').innerHTML = CONFIG.levels.map((l) => `
    <article class="level" aria-labelledby="lvl-${l.id}">
      <span class="level-n" aria-hidden="true">${l.number}</span>
      <p class="label">Level ${l.number}</p>
      <h3 class="level-name" id="lvl-${l.id}">${esc(l.name)}</h3>
      <p class="level-desc">${esc(l.description)}</p>
      <p class="level-who">${esc(l.forWho)}</p>
      <div class="level-foot" style="grid-column: 1 / 3">
        <span class="level-time">${CONFIG.day}s · ${esc(l.time)}</span>
        <button type="button" class="btn btn-sm" data-book data-level="${l.id}">Book this</button>
      </div>
    </article>`).join('');

  const o = CONFIG.otherLevel;
  $('#level-other').innerHTML = `
    <span class="level-n" aria-hidden="true">${o.number}</span>
    <p class="level-other-name">Level ${o.number} · ${esc(o.name)} <em>— elsewhere in the city</em></p>
    <p>${esc(o.description)} ${esc(o.note)} See <a href="${CONFIG.brand.sceneLink}" rel="noopener" target="_blank">zoukmunich.com</a>.</p>`;
}

function renderOrder() {
  const rows = CONFIG.levels.map((l) => `
    <li class="order-row">
      <span class="order-time"><time datetime="${l.start}">${l.start}</time></span>
      <div class="order-slot">
        <p class="label">Level ${l.number} · ${esc(l.name)}</p>
        <p class="order-name">${esc(l.description)}</p>
        <p class="order-meta">60 minutes · ${esc(l.time)}</p>
        <p class="order-book"><button type="button" class="btn btn-ghost btn-sm" data-book data-level="${l.id}">Book Level ${l.number}</button></p>
      </div>
    </li>`);
  const last = CONFIG.levels[CONFIG.levels.length - 1];
  rows.push(`
    <li class="order-row is-end">
      <span class="order-time"><time datetime="${last.end}">${last.end}</time></span>
      <div class="order-slot">
        <p class="order-name">End of the evening.</p>
        <p class="order-meta">${esc(CONFIG.venue.name)}, ${esc(CONFIG.venue.room)} · ${esc(CONFIG.venue.city)}</p>
      </div>
    </li>`);
  $('#order').innerHTML = rows.join('');
}

function renderRateCard() {
  const groups = [
    { label: 'Per class', ids: ['trial', 'dropin-1', 'dropin-2'] },
    { label: 'Courses · four Thursdays', ids: ['block-1', 'block-2'] },
  ];
  const known = new Set(groups.flatMap((g) => g.ids));
  const extra = CONFIG.options.filter((o) => !known.has(o.id)).map((o) => o.id);
  if (extra.length) groups.push({ label: 'Also', ids: extra });

  $('#rate').innerHTML = groups.map((g) => {
    const rows = g.ids.map((id) => getOption(id)).filter(Boolean).map((o) => `
      <button type="button" class="rate-row" data-book data-option="${o.id}" aria-label="Book ${esc(o.label)}, ${esc(formatPrice(o.price))}">
        <span class="rate-line">
          <span class="rate-name">${esc(o.label)}</span>
          <span class="rate-lead" aria-hidden="true"></span>
          <span class="rate-price">${esc(formatPrice(o.price))}</span>
        </span>
        <span class="rate-sub">
          <span class="rate-blurb">${esc(o.blurb)}</span>
          ${o.badge ? `<span class="rate-badge">${esc(o.badge)}</span>` : ''}
        </span>
      </button>`).join('');
    return rows ? `<div class="rate-group"><span class="label">${esc(g.label)}</span>${rows}</div>` : '';
  }).join('');

  $('#discounts').innerHTML = CONFIG.discounts.map((d) => `
    <div><dt>${esc(d.label)} <b>${esc(d.amount)}</b></dt><dd>${esc(d.note)}</dd></div>`).join('');
  $('#discount-note').textContent = CONFIG.discountNote;

  $$('[data-price]').forEach((el) => {
    const o = getOption(el.dataset.price);
    if (o) el.textContent = formatPrice(o.price);
  });
}

function renderFooter() {
  const a = $('#foot-email');
  a.href = `mailto:${CONFIG.brand.email}`;
  a.textContent = CONFIG.brand.email;
}

function renderHistory() {
  const sec = $('#bookings');
  const all = getBookings();
  if (!all.length) { sec.hidden = true; return; }
  sec.hidden = false;
  const statusWord = { paid: 'Paid', pending: 'Card · pending', requested: 'Cash · requested' };
  $('#history').innerHTML = all.map((b) => {
    const d = b.createdAt ? new Date(b.createdAt) : null;
    const when = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(CONFIG.locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return `
      <li>
        <span class="h-sum">${esc(b.summary || describeBooking(b))}</span>
        <span class="h-status">${esc(statusWord[b.status] || b.status || '')}</span>
        <span class="h-ref">${esc(b.reference || '')}${when ? ` · ${esc(when)}` : ''}</span>
      </li>`;
  }).join('');
}

function showNotice(html) {
  const n = $('#notice');
  n.innerHTML = `<div class="notice-in"><span>${html}</span><button type="button" aria-label="Dismiss">Close</button></div>`;
  n.hidden = false;
  $('button', n).addEventListener('click', () => { n.hidden = true; });
}

/* ------------------------------------------------------------------ booking state */

const EMPTY = {
  optionId: '', levelId: '',
  firstName: '', lastName: '', email: '', phone: '',
  withPartner: false, partnerName: '', role: 'Either', notes: '',
};
let booking = { ...EMPTY };
let step = 1;
let opener = null;

const dlg = $('#booking');
const els = {
  steps: $$('#steps li'),
  panels: $$('.bk-step', dlg),
  levelSeg: $('#level-seg'),
  opts: $('#opts'),
  errLevel: $('#err-level'),
  errOption: $('#err-option'),
  form: $('#details'),
  partnerField: $('#partner-field'),
  summary: $('#summary'),
  doneSummary: $('#done-summary'),
  doneNote: $('#done-note'),
  doneLede: $('#done-lede'),
  errPay: $('#err-pay'),
  payCard: $('#pay-card'),
  payCardText: $('#pay-card-text'),
  payCash: $('#pay-cash'),
  total: $('#total'),
  totalN: $('#total-n'),
  back: $('#bk-back'),
  next: $('#bk-next'),
  done: $('#bk-done'),
  body: $('#bk-body'),
  foot: $('#bk-foot'),
};

function persist() { saveDraft({ ...booking, _step: step }); }

/* ---- step 1: level + option */

function levelChoices() {
  return [
    ...CONFIG.levels.map((l) => ({ id: l.id, title: `Level ${l.number}`, sub: `${l.name} · ${l.start}` })),
    { id: 'both', title: 'Both levels', sub: `${CONFIG.levels[0].start} – ${CONFIG.levels[CONFIG.levels.length - 1].end}` },
  ];
}

function renderLevelSeg() {
  els.levelSeg.innerHTML = levelChoices().map((c) => `
    <label class="seg-item">
      <input type="radio" name="levelId" value="${c.id}" ${booking.levelId === c.id ? 'checked' : ''}>
      <span>${esc(c.title)}<small>${esc(c.sub)}</small></span>
    </label>`).join('');
}

function renderOpts() {
  const wantBoth = booking.levelId === 'both';
  const hasLevel = Boolean(booking.levelId);
  els.opts.innerHTML = CONFIG.options.map((o) => {
    const dim = hasLevel && ((o.levels === 'both') !== wantBoth);
    return `
      <label class="opt-row ${dim ? 'is-dim' : ''}">
        <input type="radio" name="optionId" value="${o.id}" ${booking.optionId === o.id ? 'checked' : ''}>
        <span class="opt-in">
          <span class="opt-dot" aria-hidden="true"></span>
          <span class="opt-name">${esc(o.label)}</span>
          <span class="opt-price">${esc(formatPrice(o.price))}</span>
          <span class="opt-blurb">${esc(o.blurb)}${o.levels === 'both' ? ' · Level 1 + Level 3' : ''}</span>
        </span>
      </label>`;
  }).join('') + `<p class="opt-hint" id="opt-hint"></p>`;
  updateOptHint();
}

function updateOptHint() {
  const hint = $('#opt-hint');
  if (!hint) return;
  const o = getOption(booking.optionId);
  if (o && o.levels === 'one' && !booking.levelId) hint.textContent = 'Now choose Level 1 or Level 3 above.';
  else if (!o && booking.levelId === 'both') hint.textContent = 'Options for both levels are highlighted.';
  else hint.textContent = '';
}

function setLevel(id) {
  booking.levelId = id;
  const o = getOption(booking.optionId);
  if (o) {
    const optBoth = o.levels === 'both';
    if (optBoth && id !== 'both') booking.optionId = '';
    if (!optBoth && id === 'both') booking.optionId = '';
  }
  renderOpts();
  hideErr(els.errLevel); hideErr(els.errOption);
  updateTotal(); persist();
}

function setOption(id) {
  booking.optionId = id;
  const o = getOption(id);
  if (o) {
    if (o.levels === 'both') booking.levelId = 'both';
    else if (booking.levelId === 'both') booking.levelId = '';
  }
  renderLevelSeg(); renderOpts();
  hideErr(els.errLevel); hideErr(els.errOption);
  updateTotal(); persist();
}

/* ---- step 2: details */

function fillForm() {
  const f = els.form;
  f.firstName.value = booking.firstName || '';
  f.lastName.value = booking.lastName || '';
  f.email.value = booking.email || '';
  f.phone.value = booking.phone || '';
  f.withPartner.checked = Boolean(booking.withPartner);
  f.partnerName.value = booking.partnerName || '';
  const role = booking.role || 'Either';
  $$('input[name="role"]', f).forEach((r) => { r.checked = r.value === role; });
  f.notes.value = booking.notes || '';
  els.partnerField.hidden = !f.withPartner.checked;
}

function readForm() {
  const f = els.form;
  booking.firstName = f.firstName.value;
  booking.lastName = f.lastName.value;
  booking.email = f.email.value;
  booking.phone = f.phone.value;
  booking.withPartner = f.withPartner.checked;
  booking.partnerName = f.partnerName.value;
  booking.role = (f.querySelector('input[name="role"]:checked') || {}).value || 'Either';
  booking.notes = f.notes.value;
}

function collectShown() {
  const out = {};
  ['firstName', 'lastName', 'email', 'partnerName'].forEach((k) => {
    const err = $(`#err-${k}`);
    if (!err.hidden) out[k] = err.textContent;
  });
  return out;
}

function showFieldErrors(errors) {
  ['firstName', 'lastName', 'email', 'partnerName'].forEach((k) => {
    const err = $(`#err-${k}`);
    const input = els.form[k];
    const field = input.closest('.field');
    if (errors[k]) { err.textContent = errors[k]; err.hidden = false; field.classList.add('is-invalid'); input.setAttribute('aria-invalid', 'true'); }
    else { err.hidden = true; field.classList.remove('is-invalid'); input.removeAttribute('aria-invalid'); }
  });
}

/* ---- step 3: pay */

function summaryHTML(b, { withTotal = true } = {}) {
  const o = getOption(b.optionId);
  const lvlObj = getLevel(b.levelId);
  const lvl = o && o.levels === 'both' ? 'Level 1 + Level 3' : (lvlObj ? `Level ${lvlObj.number} — ${lvlObj.name}` : '');
  const who = `${esc(b.firstName)} ${esc(b.lastName)}${b.withPartner && b.partnerName ? ` &amp; ${esc(b.partnerName)}` : ''}`;
  const rows = [
    ['Class', `${o ? esc(o.label) : ''}<small>${esc(lvl)} · ${CONFIG.day}s, ${esc(CONFIG.venue.name)}</small>`],
    ['Who', `${who}<small>${esc(b.email)}${b.role && b.role !== 'Either' ? ` · ${esc(b.role)}` : ''}</small>`],
  ];
  if (withTotal) rows.push(['Total', `<span class="big">${esc(bookingTotalFormatted(b))}</span>`]);
  return rows.map(([k, v]) => `<div><dt>${k}</dt><dd${k === 'Total' ? ' class="big"' : ''}>${v}</dd></div>`).join('');
}

function renderPay() {
  els.summary.innerHTML = summaryHTML(booking, { withTotal: false });
  const ok = cardPaymentAvailable(booking.optionId);
  els.payCard.setAttribute('aria-disabled', ok ? 'false' : 'true');
  els.payCardText.textContent = ok
    ? 'Secure checkout with Stripe. Your place is confirmed the moment payment goes through.'
    : 'Card payment is not switched on yet — choose cash for now and pay when you arrive.';
  hideErr(els.errPay);
}

async function payByCard() {
  if (els.payCard.getAttribute('aria-disabled') === 'true') {
    showErr(els.errPay, 'Card payment is not switched on yet — please choose cash for now.');
    return;
  }
  els.payCard.classList.add('is-busy');
  const res = await startCheckout(booking);
  els.payCard.classList.remove('is-busy');
  if (!res.ok) showErr(els.errPay, res.error || 'Something went wrong. Please try cash, or write to us.');
}

async function payCash() {
  els.payCash.classList.add('is-busy');
  const res = await submitCashBooking(booking);
  els.payCash.classList.remove('is-busy');
  if (!res.ok) { showErr(els.errPay, res.error || 'Something went wrong. Please write to us instead.'); return; }
  const done = { ...booking, reference: res.reference };
  els.doneSummary.innerHTML = summaryHTML(done) + `<div><dt>Reference</dt><dd>${esc(res.reference)}</dd></div>`;
  els.doneLede.textContent = `We'll email ${booking.email.trim()} to confirm your place. Pay ${bookingTotalFormatted(booking)} in cash at the door.`;
  if (res.fallback) {
    els.doneNote.textContent = 'Your mail app should have opened with the booking request ready to send — please send it so we receive it. If nothing opened, write to ' + CONFIG.brand.email + ' with the reference above.';
    els.doneNote.hidden = false;
  } else {
    els.doneNote.hidden = true;
  }
  booking = { ...EMPTY };
  clearDraft();
  renderHistory();
  goTo('done');
}

/* ---- navigation */

function showErr(el, msg) { el.textContent = msg; el.hidden = false; }
function hideErr(el) { el.hidden = true; }

function updateTotal() {
  const o = getOption(booking.optionId);
  els.totalN.textContent = o ? formatPrice(o.price) : '—';
}

function goTo(n) {
  step = n;
  els.panels.forEach((p) => { p.hidden = p.dataset.panel !== String(n); });
  els.steps.forEach((li) => {
    const s = Number(li.dataset.step);
    li.classList.toggle('is-current', s === n);
    li.classList.toggle('is-done', n === 'done' || s < n);
    if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  const isDone = n === 'done';
  els.back.hidden = n === 1 || isDone;
  els.next.hidden = n === 3 || isDone;
  els.done.hidden = !isDone;
  els.total.hidden = isDone;
  if (n === 2) fillForm();
  if (n === 3) renderPay();
  updateTotal();
  els.body.scrollTop = 0;
  if (n !== 'done') persist();
  const h = $(`.bk-step[data-panel="${n}"] .bk-h`, dlg);
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}

function next() {
  if (step === 1) {
    const o = getOption(booking.optionId);
    let ok = true;
    if (!o) { showErr(els.errOption, 'Choose an option.'); ok = false; }
    if (!booking.levelId) { showErr(els.errLevel, o && o.levels === 'one' ? 'Choose Level 1 or Level 3.' : 'Choose a level.'); ok = false; }
    if (!ok) return;
    goTo(2);
  } else if (step === 2) {
    readForm(); persist();
    const { errors } = validateBooking(booking);
    const mine = Object.fromEntries(Object.entries(errors).filter(([k]) => !['optionId', 'levelId'].includes(k)));
    showFieldErrors(mine);
    if (Object.keys(mine).length) {
      const first = els.form[Object.keys(mine)[0]];
      if (first) first.focus();
      return;
    }
    goTo(3);
  }
}

function open({ optionId, levelId } = {}, from = null) {
  opener = from || document.activeElement;
  const draft = loadDraft();
  if (draft && !optionId && !levelId) {
    const { _step, ...rest } = draft;
    booking = { ...EMPTY, ...rest };
    step = (_step === 2 || _step === 3) ? _step : 1;
  } else {
    if (draft) { const { _step, ...rest } = draft; booking = { ...EMPTY, ...rest }; } else booking = { ...EMPTY };
    step = 1;
  }
  if (optionId) setOption(optionId);
  if (levelId) setLevel(levelId);
  renderLevelSeg(); renderOpts();
  hideErr(els.errLevel); hideErr(els.errOption); hideErr(els.errPay);
  if (!dlg.open) dlg.showModal();
  goTo(step);
}

function close() {
  if (step !== 'done') { if (step === 2) readForm(); persist(); }
  dlg.close();
}

/* ------------------------------------------------------------------ wiring */

function wire() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-book]');
    if (!t) return;
    e.preventDefault();
    open({ optionId: t.dataset.option, levelId: t.dataset.level }, t);
  });

  els.levelSeg.addEventListener('change', (e) => { if (e.target.name === 'levelId') setLevel(e.target.value); });
  els.opts.addEventListener('change', (e) => { if (e.target.name === 'optionId') setOption(e.target.value); });

  els.form.addEventListener('input', () => {
    readForm(); persist();
    // clear an inline error as soon as the field is fixed
    const { errors } = validateBooking(booking);
    $$('.field.is-invalid', els.form).forEach((field) => {
      const input = field.querySelector('input');
      if (input && !errors[input.name]) showFieldErrors(Object.fromEntries(Object.entries(collectShown()).filter(([k]) => k !== input.name)));
    });
  });
  els.form.addEventListener('change', () => {
    els.partnerField.hidden = !els.form.withPartner.checked;
    if (els.form.withPartner.checked && !els.form.partnerName.value) els.form.partnerName.focus();
    readForm(); persist();
  });
  els.form.addEventListener('submit', (e) => { e.preventDefault(); next(); });

  els.next.addEventListener('click', next);
  els.back.addEventListener('click', () => goTo(step === 3 ? 2 : 1));
  els.done.addEventListener('click', close);
  $('#bk-close').addEventListener('click', close);
  els.payCard.addEventListener('click', payByCard);
  els.payCash.addEventListener('click', payCash);

  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('close', () => {
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    opener = null;
  });
  // click on the backdrop closes
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });

  $('#clear-history').addEventListener('click', () => { clearBookings(); renderHistory(); });
}

/* ------------------------------------------------------------------ boot */

renderLevels();
renderOrder();
renderRateCard();
renderFooter();
renderHistory();
renderLevelSeg();
renderOpts();
wire();

const ret = checkReturnFromPayment();
if (ret.booked) {
  renderHistory();
  showNotice(`<strong>Payment received.</strong> Your place is booked${ret.reference ? ` — reference ${esc(ret.reference)}` : ''}. We'll email you the details.`);
} else if (ret.cancelled) {
  showNotice(`<strong>Payment cancelled.</strong> Nothing was charged and your place isn't booked yet — you can try again or choose cash at the door.`);
}
