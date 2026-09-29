'use strict';
/* ToolBox Pro - vanilla JS, no backend. */
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, p = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [a, v] of Object.entries(p)) {
    if (a === 'class') e.className = v;
    else if (a.startsWith('on')) e.addEventListener(a.slice(2), v);
    else if (a === 'value' || a === 'checked') e[a] = v;
    else if (v === true) e.setAttribute(a, '');
    else if (v !== false && v != null) e.setAttribute(a, v);
  }
  e.append(...kids.flat().filter(x => x != null && x !== false));
  return e;
};
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
};
const dlg = $('#dlg');

/* ---------- toast, clipboard, download ---------- */
function toast(msg, type = 'ok') {
  const box = $('#toasts'), host = dlg.open ? dlg : document.body;
  if (box.parentNode !== host) host.append(box);
  const t = h('div', { class: 'toast ' + (type === 'err' ? 'err' : ''), role: type === 'err' ? 'alert' : 'status' }, msg);
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 3200);
}
async function copyText(s) {
  if (!s) { toast('Nothing to copy', 'err'); return false; }
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(s); toast('Copied to clipboard'); return true; } } catch { /* try fallback */ }
  try {
    const t = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0;top:0' }); t.value = s;
    (dlg.open ? dlg : document.body).append(t); t.select();
    const ok = document.execCommand('copy'); t.remove();
    if (ok) { toast('Copied to clipboard'); return true; }
  } catch { /* fall through */ }
  toast('Copy failed. Select the text and copy it manually.', 'err'); return false;
}
function save(name, blob) {
  if (!blob || !blob.size) { toast('Nothing to download', 'err'); return; }
  const u = URL.createObjectURL(blob), a = h('a', { href: u, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 5000); toast('Downloaded successfully');
}
const saveText = (name, s, type = 'text/plain') => save(name, new Blob([s], { type: type + ';charset=utf-8' }));

/* object URL tracking so everything is revoked when a tool closes */
let urls = [];
const mkUrl = b => { const u = URL.createObjectURL(b); urls.push(u); return u; };
const revUrl = u => { if (u) { URL.revokeObjectURL(u); urls = urls.filter(x => x !== u); } };
const revokeAll = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; };

/* ---------- ui helpers ---------- */
const field = (label, ctl) => h('label', { class: 'f' }, typeof label === 'string' ? h('span', {}, label) : label, ctl);
const inp = (p = {}) => h('input', p);
const num = (p = {}) => h('input', Object.assign({ type: 'number', step: 'any', inputmode: 'decimal' }, p));
const area = (p = {}) => h('textarea', Object.assign({ rows: 7, spellcheck: 'false' }, p));
const sel = (opts, p = {}) => h('select', p, ...opts.map(o => Array.isArray(o) ? h('option', { value: o[0] }, o[1]) : h('option', { value: o }, o)));
const btn = (t, fn, c = '') => h('button', { type: 'button', class: 'btn ' + c, onclick: fn }, t);
const stat = (k, v) => h('div', { class: 'stat' }, h('span', {}, k), h('strong', {}, String(v)));
const chk = (label, checked = false) => { const c = h('input', { type: 'checkbox', checked }); return [c, h('label', {}, c, label)]; };
const fb = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
const val = e => e.value.trim() === '' ? NaN : Number(e.value);
const fmtN = v => Number.isFinite(v) ? String(+v.toPrecision(12)) : '';
const copyBtn = get => btn('Copy', () => copyText(get()));
const dlBtn = (get, name, label = 'Download TXT', type = 'text/plain') => btn(label, () => { const s = get(); if (!s) { toast('Nothing to download', 'err'); return; } saveText(name, s, type); });
const msgEl = () => { const m = h('p', { class: 'msg', role: 'status' }); m.set = (t, ok) => { m.textContent = t; m.className = 'msg' + (ok ? ' ok' : ''); }; return m; };
const cryptoOk = () => !!(window.crypto && crypto.getRandomValues);
function rnd(n) { const m = Math.floor(2 ** 32 / n) * n, a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= m); return a[0] % n; }

/* ---------- calculators ---------- */
function ageTool(el) {
  const d = inp({ type: 'date', max: new Date().toLocaleDateString('en-CA') }), out = h('div', { class: 'stats', 'aria-live': 'polite' }), m = msgEl();
  const run = () => {
    out.replaceChildren(); m.set('');
    if (!d.value) { m.set('Please select your date of birth.'); return; }
    const b = new Date(d.value + 'T00:00:00'), n = new Date(); n.setHours(0, 0, 0, 0);
    if (isNaN(b) || b > n) { m.set('Date of birth cannot be in the future.'); toast('Invalid date', 'err'); return; }
    let y = n.getFullYear() - b.getFullYear(), mo = n.getMonth() - b.getMonth(), dd = n.getDate() - b.getDate();
    if (dd < 0) { mo--; dd += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); }
    if (mo < 0) { y--; mo += 12; }
    out.append(stat('Years', y), stat('Months', mo), stat('Days', dd), stat('Total days', Math.round((n - b) / 864e5).toLocaleString()));
  };
  el.append(field('Date of birth', d), btn('Calculate age', run, 'pri'), m, out);
}
function pctTool(el) {
  const modes = [['What is X% of Y?', 'X (%)', 'Y'], ['X is what percentage of Y?', 'X', 'Y'], ['Percentage increase', 'From', 'To'], ['Percentage decrease', 'From', 'To']];
  const s = sel(modes.map((x, i) => [i, x[0]])), la = h('span'), lb = h('span'), a = num(), b = num(), out = h('div', { class: 'big', 'aria-live': 'polite' }), m = msgEl();
  const lab = () => { la.textContent = modes[s.value][1]; lb.textContent = modes[s.value][2]; out.textContent = ''; m.set(''); };
  s.onchange = lab; lab();
  const run = () => {
    out.textContent = ''; m.set(''); const x = val(a), y = val(b), i = +s.value;
    if (!Number.isFinite(x) || !Number.isFinite(y)) { m.set('Please enter both numbers.'); return; }
    if (i === 0) out.textContent = `${fmtN(x)}% of ${fmtN(y)} = ${fmtN(x * y / 100)}`;
    else if (i === 1) { if (y === 0) { m.set('Y cannot be zero.'); return; } out.textContent = `${fmtN(x)} is ${fmtN(x / y * 100)}% of ${fmtN(y)}`; }
    else { if (x === 0) { m.set('The starting value cannot be zero.'); return; }
      const c = (i === 2 ? y - x : x - y) / x * 100;
      out.textContent = `${i === 2 ? 'Increase' : 'Decrease'}: ${fmtN(c)}%` + (c < 0 ? (i === 2 ? ' (the value actually decreased)' : ' (the value actually increased)') : ''); }
  };
  el.append(field('Calculation', s), h('div', { class: 'two' }, field(la, a), field(lb, b)), btn('Calculate', run, 'pri'), m, out);
}
function cgpaTool(el) {
  const rows = h('div', { class: 'rows' }), mult = num({ value: '9.5', min: '0' }), out = h('div', { class: 'stats', 'aria-live': 'polite' }), m = msgEl();
  let n = 0;
  const add = () => {
    n++; const r = h('div', { class: 'row' }, inp({ type: 'text', 'aria-label': 'Subject name', value: 'Subject ' + n }),
      num({ 'aria-label': 'Grade points', placeholder: 'Grade points', min: '0' }), num({ 'aria-label': 'Credits', placeholder: 'Credits', min: '0' }),
      btn('Remove', () => { if (rows.children.length > 1) r.remove(); else toast('Keep at least one subject', 'err'); }, 'ghost'));
    rows.append(r);
  };
  add(); add();
  const run = () => {
    out.replaceChildren(); m.set(''); let tp = 0, tc = 0;
    for (const r of rows.children) {
      const [, g, c] = r.querySelectorAll('input'), gp = val(g), cr = val(c);
      if (!(gp >= 0) || !(cr > 0)) { m.set('Enter grade points (0 or more) and credits (above 0) for every subject.'); toast('Check your subjects', 'err'); return; }
      tp += gp * cr; tc += cr;
    }
    const k = val(mult); if (!(k > 0)) { m.set('Enter a valid percentage multiplier.'); return; }
    const cg = tp / tc; out.append(stat('CGPA', cg.toFixed(2)), stat('Percentage', (cg * k).toFixed(2) + '%'), stat('Total credits', fmtN(tc)));
  };
  el.append(rows, h('div', { class: 'acts' }, btn('Add subject', add), btn('Calculate CGPA', run, 'pri')), field('Percentage multiplier (percentage = CGPA × multiplier)', mult), m, out);
}
function bmiTool(el) {
  const u = sel([['m', 'Metric (cm, kg)'], ['i', 'Imperial (in, lb)']]), lh = h('span'), lw = h('span'), ht = num({ min: '0' }), w = num({ min: '0' }), out = h('div', { class: 'stats', 'aria-live': 'polite' }), m = msgEl();
  const lab = () => { lh.textContent = u.value === 'm' ? 'Height (cm)' : 'Height (inches)'; lw.textContent = u.value === 'm' ? 'Weight (kg)' : 'Weight (pounds)'; out.replaceChildren(); };
  u.onchange = lab; lab();
  const run = () => {
    out.replaceChildren(); m.set(''); const H = val(ht), W = val(w);
    if (!(H > 0) || !(W > 0)) { m.set('Please enter a height and weight above zero.'); return; }
    const b = u.value === 'm' ? W / ((H / 100) ** 2) : 703 * W / (H ** 2);
    if (!Number.isFinite(b) || b > 200) { m.set('Those values look unrealistic. Please check the units.'); return; }
    out.append(stat('BMI', b.toFixed(1)), stat('Category', b < 18.5 ? 'Underweight' : b < 25 ? 'Normal weight' : b < 30 ? 'Overweight' : 'Obesity'));
  };
  el.append(field('Units', u), h('div', { class: 'two' }, field(lh, ht), field(lw, w)), btn('Calculate BMI', run, 'pri'), m, out,
    h('p', { class: 'note' }, 'BMI is only a general screening measure. It does not account for muscle mass, age or body composition. Talk to a health professional for advice.'));
}
function discountTool(el) {
  const p = num({ min: '0' }), d = num({ min: '0', max: '100' }), out = h('div', { class: 'stats', 'aria-live': 'polite' }), m = msgEl();
  const run = () => {
    out.replaceChildren(); m.set(''); const P = val(p), D = val(d);
    if (!(P >= 0) || !(D >= 0 && D <= 100)) { m.set('Enter a price of 0 or more and a discount between 0 and 100.'); return; }
    const sv = P * D / 100; out.append(stat('Discount amount', sv.toFixed(2)), stat('Final price', (P - sv).toFixed(2)), stat('Savings', fmtN(D) + '%'));
  };
  el.append(h('div', { class: 'two' }, field('Original price', p), field('Discount (%)', d)), btn('Calculate', run, 'pri'), m, out);
}

/* ---------- text tools ---------- */
function liveCount(el, keys) {
  const t = area({ rows: 9 }), out = h('div', { class: 'stats', 'aria-live': 'polite' });
  const upd = () => {
    const s = t.value, w = s.trim() ? s.trim().split(/\s+/).length : 0;
    const c = { Words: w, Characters: [...s].length, 'Characters without spaces': [...s.replace(/\s/g, '')].length,
      Sentences: s.split(/[.!?]+(?:\s|$)/).filter(x => x.trim()).length, Paragraphs: s.split(/\n\s*\n/).filter(x => x.trim()).length,
      'Reading time': w ? Math.max(1, Math.ceil(w / 200)) + ' min' : '0 min', Lines: s ? s.split(/\r?\n/).length : 0 };
    out.replaceChildren(...keys.map(k => stat(k, typeof c[k] === 'number' ? c[k].toLocaleString() : c[k])));
  };
  t.oninput = upd; upd();
  el.append(field('Your text', t), out, btn('Clear', () => { t.value = ''; upd(); t.focus(); }));
}
const wordTool = el => liveCount(el, ['Words', 'Characters', 'Characters without spaces', 'Sentences', 'Paragraphs', 'Reading time']);
const charTool = el => liveCount(el, ['Characters', 'Characters without spaces', 'Words', 'Lines']);
const SMALL = new Set('a an and as at but by for in nor of on or per the to vs via'.split(' '));
const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
function caseTool(el) {
  const t = area({ rows: 9 });
  const ops = [['UPPERCASE', s => s.toUpperCase()], ['lowercase', s => s.toLowerCase()],
    ['Title Case', s => s.toLowerCase().replace(/[\p{L}\p{N}'’]+/gu, (w, i) => i > 0 && SMALL.has(w) ? w : cap(w))],
    ['Sentence case', s => s.toLowerCase().replace(/(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())],
    ['Capitalize Words', s => s.toLowerCase().replace(/[\p{L}\p{N}'’]+/gu, cap)],
    ['Toggle Case', s => [...s].map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('')]];
  el.append(field('Your text', t), h('div', { class: 'acts' }, ...ops.map(([n, f]) => btn(n, () => { if (!t.value) { toast('Please enter some text', 'err'); return; } t.value = f(t.value); }))),
    h('div', { class: 'acts' }, copyBtn(() => t.value), dlBtn(() => t.value, 'toolbox-pro-result.txt'), btn('Clear', () => { t.value = ''; t.focus(); }, 'ghost')));
}
function dedupeTool(el) {
  const t = area({ rows: 8 }), o = area({ rows: 8, readonly: true }), [c1, l1] = chk('Case sensitive', true), [c2, l2] = chk('Trim whitespace', true), [c3, l3] = chk('Keep first occurrence', true), m = msgEl();
  const run = () => {
    if (!t.value) { m.set('Please enter some lines first.'); toast('Please enter some text', 'err'); return; }
    let L = t.value.split(/\r?\n/); if (c2.checked) L = L.map(x => x.trim());
    const key = x => c1.checked ? x : x.toLowerCase(), seen = new Set(), keep = [], src = c3.checked ? L : [...L].reverse();
    for (const x of src) { const k = key(x); if (!seen.has(k)) { seen.add(k); keep.push(x); } }
    if (!c3.checked) keep.reverse();
    o.value = keep.join('\n'); m.set(`Removed ${L.length - keep.length} duplicate line(s). ${keep.length} unique line(s) remain.`, true);
  };
  el.append(field('Lines', t), h('div', { class: 'opts' }, l1, l2, l3), btn('Remove duplicate lines', run, 'pri'), m, field('Result', o),
    h('div', { class: 'acts' }, copyBtn(() => o.value), dlBtn(() => o.value, 'toolbox-pro-result.txt')));
}
function sortTool(el) {
  const t = area({ rows: 8 }), o = area({ rows: 8, readonly: true });
  const nn = l => { const v = parseFloat(l.replace(/,/g, '')); return isNaN(v) ? null : v; };
  const numCmp = dir => (a, b) => { const x = nn(a), y = nn(b); if (x === null && y === null) return 0; if (x === null) return 1; if (y === null) return -1; return dir * (x - y); };
  const modes = { az: L => L.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })), za: L => L.sort((a, b) => b.localeCompare(a, undefined, { sensitivity: 'base' })),
    na: L => L.sort(numCmp(1)), nd: L => L.sort(numCmp(-1)), rev: L => L.reverse(),
    rnd: L => { for (let i = L.length - 1; i > 0; i--) { const j = cryptoOk() ? rnd(i + 1) : Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } return L; } };
  const s = sel([['az', 'A-Z'], ['za', 'Z-A'], ['na', 'Numeric ascending'], ['nd', 'Numeric descending'], ['rev', 'Reverse'], ['rnd', 'Randomize']]);
  const run = () => { if (!t.value) { toast('Please enter some lines', 'err'); return; } o.value = modes[s.value](t.value.split(/\r?\n/)).join('\n'); };
  el.append(field('Lines', t), field('Sort by', s), btn('Sort lines', run, 'pri'), field('Result', o), h('div', { class: 'acts' }, copyBtn(() => o.value), dlBtn(() => o.value, 'toolbox-pro-result.txt')));
}

/* ---------- developer tools ---------- */
function jsonTool(el) {
  const t = area({ rows: 12 }), m = msgEl(), ind = sel([['2', '2 spaces'], ['4', '4 spaces'], ['tab', 'Tab']]);
  const P = () => {
    if (!t.value.trim()) { m.set('Please enter valid JSON.'); toast('Invalid JSON', 'err'); return null; }
    try { return { v: JSON.parse(t.value) }; } catch (e) { m.set('Invalid JSON: ' + e.message); toast('Invalid JSON', 'err'); return null; }
  };
  el.append(field('JSON input', t), field('Indentation', ind), h('div', { class: 'acts' },
    btn('Format', () => { const p = P(); if (p) { t.value = JSON.stringify(p.v, null, ind.value === 'tab' ? '\t' : +ind.value); m.set('Formatted successfully.', true); } }, 'pri'),
    btn('Minify', () => { const p = P(); if (p) { t.value = JSON.stringify(p.v); m.set('Minified successfully.', true); } }),
    btn('Validate', () => { const p = P(); if (p) { m.set('Valid JSON.', true); toast('Valid JSON'); } }),
    copyBtn(() => t.value),
    btn('Download JSON', () => { const p = P(); if (p) saveText('formatted.json', JSON.stringify(p.v, null, 2), 'application/json'); })), m);
}
function b64Tool(el) {
  const t = area({ rows: 6 }), o = area({ rows: 6, readonly: true }), mode = sel([['e', 'Text to Base64'], ['d', 'Base64 to text']]), m = msgEl();
  const run = () => {
    m.set(''); o.value = '';
    if (!t.value) { m.set('Please enter some input.'); return; }
    try {
      if (mode.value === 'e') {
        const b = new TextEncoder().encode(t.value); let s = '';
        for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
        o.value = btoa(s);
      } else {
        const bin = atob(t.value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
        const u = Uint8Array.from(bin, c => c.charCodeAt(0));
        try { o.value = new TextDecoder('utf-8', { fatal: true }).decode(u); } catch { m.set('The decoded data is not valid UTF-8 text.'); toast('Decoding failed', 'err'); return; }
      }
      m.set('Done.', true);
    } catch { m.set(mode.value === 'd' ? 'This is not valid Base64.' : 'Something went wrong. Please try again.'); toast('Conversion failed', 'err'); }
  };
  el.append(field('Mode', mode), field('Input', t), btn('Convert', run, 'pri'), m, field('Output', o), h('div', { class: 'acts' }, copyBtn(() => o.value), dlBtn(() => o.value, 'toolbox-pro-result.txt')));
}
function urlTool(el) {
  const t = area({ rows: 5 }), o = area({ rows: 5, readonly: true }), mode = sel([['ec', 'Encode (component)'], ['eu', 'Encode (full URL)'], ['d', 'Decode']]), m = msgEl();
  const run = () => {
    m.set(''); o.value = ''; if (!t.value) { m.set('Please enter some input.'); return; }
    try { o.value = mode.value === 'ec' ? encodeURIComponent(t.value) : mode.value === 'eu' ? encodeURI(t.value) : decodeURIComponent(t.value); m.set('Done.', true); }
    catch { m.set('This input cannot be processed. It may contain invalid percent-encoding.'); toast('Conversion failed', 'err'); }
  };
  el.append(field('Mode', mode), field('Input', t), btn('Convert', run, 'pri'), m, field('Output', o), h('div', { class: 'acts' }, copyBtn(() => o.value), dlBtn(() => o.value, 'toolbox-pro-result.txt')));
}
function uuidV4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128;
  const x = [...b].map(v => v.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
function uuidTool(el) {
  if (!cryptoOk()) { el.append(h('p', { class: 'msg' }, 'Your browser does not support secure random numbers.')); return; }
  const c = num({ value: '1', min: '1', max: '100', step: '1' }), o = area({ rows: 8, readonly: true }), m = msgEl();
  const run = () => { const n = val(c); if (!Number.isInteger(n) || n < 1 || n > 100) { m.set('Enter a whole number from 1 to 100.'); return; } m.set(''); o.value = Array.from({ length: n }, uuidV4).join('\n'); };
  el.append(field('How many UUIDs (1-100)', c), btn('Generate', run, 'pri'), m, field('UUID v4', o), h('div', { class: 'acts' }, copyBtn(() => o.value), dlBtn(() => o.value, 'toolbox-pro-uuids.txt')));
  run();
}
function hashTool(el) {
  const t = area({ rows: 5 }), a = sel(['SHA-256', 'SHA-384', 'SHA-512']), o = area({ rows: 4, readonly: true }), m = msgEl();
  if (!(window.crypto && crypto.subtle)) { el.append(h('p', { class: 'msg' }, 'Your browser does not support the Web Crypto API. Open this site over HTTPS or localhost.')); return; }
  const run = async () => {
    try { const d = await crypto.subtle.digest(a.value, new TextEncoder().encode(t.value)); o.value = [...new Uint8Array(d)].map(v => v.toString(16).padStart(2, '0')).join(''); m.set(''); }
    catch { m.set('Something went wrong. Please try again.'); toast('Hashing failed', 'err'); }
  };
  t.oninput = run; a.onchange = run;
  el.append(field('Input text', t), field('Algorithm', a), m, field('Hash (hex)', o), h('div', { class: 'acts' }, copyBtn(() => o.value), dlBtn(() => o.value, 'toolbox-pro-hash.txt')));
  run();
}

/* ---------- image tools ---------- */
function pickImage(onImg, opt = {}) {
  const maxMB = opt.maxMB || 25, input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', class: 'sr' });
  const zone = h('label', { class: 'drop' }, input, h('strong', {}, 'Choose an image'), h('span', {}, 'or drop it here (JPG, PNG or WebP, up to ' + maxMB + ' MB)'));
  async function handle(f) {
    if (!f) return;
    if (!f.size) { toast('This file is empty.', 'err'); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast('Please select a JPG, PNG or WebP image.', 'err'); return; }
    if (f.size > maxMB * 1048576) { toast(`This image is larger than ${maxMB} MB.`, 'err'); return; }
    const ce = opt.check && opt.check(f); if (ce) { toast(ce, 'err'); return; }
    const u = mkUrl(f), img = new Image();
    try { img.src = u; await img.decode(); } catch { revUrl(u); toast('Unable to read this image.', 'err'); return; }
    onImg(img, f, u);
  }
  input.onchange = () => { handle(input.files[0]); input.value = ''; };
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('over'); handle(e.dataTransfer.files[0]); });
  return zone;
}
function canvasBlob(img, w, ht, type, q) {
  return new Promise((res, rej) => {
    try {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = ht; const x = cv.getContext('2d');
      if (!x) return rej(new Error('canvas'));
      if (type === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, w, ht); }
      x.drawImage(img, 0, 0, w, ht);
      cv.toBlob(b => b && b.type === type ? res(b) : rej(new Error('fmt')), type, q);
    } catch { rej(new Error('canvas')); }
  });
}
function imgTool(el, c) {
  const st = { img: null, file: null, src: null, out: null }, info = h('p', { class: 'note' }), prev = h('img', { class: 'prev', alt: 'Preview of the result', hidden: true }), stats = h('div', { class: 'stats', 'aria-live': 'polite' }), m = msgEl();
  const fmt = c.fmts ? sel(c.fmts, {}) : null, mode = c.modes ? sel(c.modes) : null;
  const q = c.q ? inp({ type: 'range', min: '10', max: '100', value: '80' }) : null, qo = h('output', {}, '80%');
  if (q) q.oninput = () => qo.textContent = q.value + '%';
  const MW = c.max ? num({ min: '1', step: '1', placeholder: 'No limit' }) : null, MH = c.max ? num({ min: '1', step: '1', placeholder: 'No limit' }) : null;
  const W = c.resize ? num({ min: '1', step: '1' }) : null, H = c.resize ? num({ min: '1', step: '1' }) : null, [lk, lkl] = chk('Lock aspect ratio', true);
  let ratio = 1;
  if (W) { W.oninput = () => { if (lk.checked && W.value) H.value = Math.max(1, Math.round(W.value / ratio)); }; H.oninput = () => { if (lk.checked && H.value) W.value = Math.max(1, Math.round(H.value * ratio)); }; }
  const fmtOf = () => c.fixed ? (typeof c.fixed === 'function' ? c.fixed(mode) : c.fixed) : fmt.value;
  const chk_ = f => c.check ? c.check(f, mode) : '';
  const zone = pickImage((img, f, u) => {
    revUrl(st.src); st.img = img; st.file = f; st.src = u; ratio = img.naturalWidth / img.naturalHeight;
    if (W) { W.value = img.naturalWidth; H.value = img.naturalHeight; }
    info.textContent = `${f.name}: ${img.naturalWidth} × ${img.naturalHeight} px, ${fb(f.size)}`; m.set(''); stats.replaceChildren();
    revUrl(st.out); st.out = null; st.blob = null; prev.hidden = false; prev.src = u;
  }, { check: f => chk_(f) });
  const run = async () => {
    m.set(''); if (!st.img) { toast('Please select an image first.', 'err'); m.set('Please select an image first.'); return; }
    const ce = chk_(st.file); if (ce) { m.set(ce); toast(ce, 'err'); return; }
    let w = st.img.naturalWidth, ht = st.img.naturalHeight;
    if (W) { w = parseInt(W.value, 10); ht = parseInt(H.value, 10); if (!(w > 0 && ht > 0) || w > 16384 || ht > 16384) { m.set('Enter a width and height between 1 and 16384.'); return; } }
    if (MW) { const r = Math.min(1, (parseInt(MW.value, 10) || Infinity) / w, (parseInt(MH.value, 10) || Infinity) / ht); w = Math.max(1, Math.round(w * r)); ht = Math.max(1, Math.round(ht * r)); }
    const type = 'image/' + fmtOf(); m.set('Processing…', true); await new Promise(r => setTimeout(r, 30));
    try {
      const b = await canvasBlob(st.img, w, ht, type, q ? q.value / 100 : 0.92);
      revUrl(st.out); st.out = mkUrl(b); st.blob = b; prev.src = st.out; prev.hidden = false;
      const ch = (1 - b.size / st.file.size) * 100;
      stats.replaceChildren(stat('Original size', fb(st.file.size)), stat('New size', fb(b.size)), stat(ch >= 0 ? 'Reduction' : 'Increase', Math.abs(ch).toFixed(1) + '%'), stat('Dimensions', `${w} × ${ht}`));
      m.set('Done.', true); toast('Conversion completed');
    } catch (e) {
      const t = e.message === 'fmt' ? (type === 'image/webp' ? 'Your browser does not support WebP encoding.' : 'Your browser does not support this format.') : 'Something went wrong. The image may be too large to process.';
      m.set(t); toast(t, 'err');
    }
  };
  const dl = () => { if (!st.blob) { toast('Process an image first.', 'err'); return; } const f = fmtOf(); save(`${c.name}.${f === 'jpeg' ? 'jpg' : f}`, st.blob); };
  const ctl = [mode && field('Conversion', mode), fmt && field('Output format', fmt), q && field('Quality', h('span', { class: 'rng' }, q, qo)),
    MW && h('div', { class: 'two' }, field('Maximum width (px)', MW), field('Maximum height (px)', MH)),
    W && h('div', { class: 'two' }, field('Width (px)', W), field('Height (px)', H)), W && h('div', { class: 'opts' }, lkl)];
  el.append(zone, info, ...ctl.filter(Boolean), h('div', { class: 'acts' }, btn(c.go, run, 'pri'), btn('Download', dl)), m, prev, stats);
}
function b64ImgTool(el) {
  const du = area({ rows: 5, readonly: true }), b6 = area({ rows: 5, readonly: true }), info = h('p', { class: 'note' });
  const zone = pickImage((img, f) => {
    const r = new FileReader();
    r.onload = () => { du.value = r.result; b6.value = r.result.slice(r.result.indexOf(',') + 1); info.textContent = `${f.name}: ${fb(f.size)} original, ${fb(r.result.length)} as text`; toast('Conversion completed'); };
    r.onerror = () => toast('Unable to read this image.', 'err'); r.readAsDataURL(f);
  }, { maxMB: 5 });
  el.append(zone, info, field('Data URL', du), h('div', { class: 'acts' }, copyBtn(() => du.value), dlBtn(() => du.value, 'image-data-url.txt')),
    field('Base64 only', b6), h('div', { class: 'acts' }, copyBtn(() => b6.value), dlBtn(() => b6.value, 'image-base64.txt')));
}

/* ---------- utilities ---------- */
const QR_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
function qrTool(el) {
  const type = sel([['text', 'Text'], ['url', 'URL'], ['email', 'Email'], ['phone', 'Phone']]), v = inp({ type: 'text' }), size = sel([['256', '256 px'], ['384', '384 px'], ['512', '512 px'], ['768', '768 px']], {});
  const ecc = sel([['L', 'Low (L)'], ['M', 'Medium (M)'], ['Q', 'Quartile (Q)'], ['H', 'High (H)']]), cv = h('canvas', { class: 'qr', hidden: true, role: 'img', 'aria-label': 'Generated QR code' }), m = msgEl(); let ready = false;
  size.value = '384'; ecc.value = 'M';
  const load = () => new Promise((res, rej) => {
    if (window.qrcode) return res();
    const s = h('script', { src: QR_SRC, onload: res, onerror: () => { s.remove(); rej(new Error('load')); } }); document.head.append(s);
  });
  const gen = async () => {
    ready = false; cv.hidden = true; let d = v.value.trim();
    if (!d) { m.set('Please enter the content for your QR code.'); return; }
    if (type.value === 'email') { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d)) { m.set('Please enter a valid email address.'); return; } d = 'mailto:' + d; }
    else if (type.value === 'phone') { if (!/^\+?[\d\s()-]{3,}$/.test(d)) { m.set('Please enter a valid phone number.'); return; } d = 'tel:' + d.replace(/[\s()-]/g, ''); }
    else if (type.value === 'url') { if (!/^[a-z][a-z0-9+.-]*:/i.test(d)) d = 'https://' + d; try { new URL(d); } catch { m.set('Please enter a valid URL.'); return; } }
    try { await load(); } catch { m.set('The QR code library could not be loaded. Check your internet connection and try again.'); toast('QR library failed to load', 'err'); return; }
    try {
      qrcode.stringToBytes = s => Array.from(new TextEncoder().encode(s));
      const q = qrcode(0, ecc.value); q.addData(d); q.make();
      const n = q.getModuleCount(), sc = Math.max(1, Math.floor(+size.value / (n + 8))), px = sc * (n + 8), x = cv.getContext('2d');
      cv.width = px; cv.height = px; x.fillStyle = '#fff'; x.fillRect(0, 0, px, px); x.fillStyle = '#000';
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect((k + 4) * sc, (r + 4) * sc, sc, sc);
      cv.hidden = false; ready = true; m.set('QR code generated.', true); toast('QR code generated');
    } catch { m.set('This content is too long for a QR code at this error-correction level.'); toast('QR generation failed', 'err'); }
  };
  const dl = () => { if (!ready) { toast('Generate a QR code first.', 'err'); return; } cv.toBlob(b => b ? save('generated-qr.png', b) : toast('Something went wrong. Please try again.', 'err'), 'image/png'); };
  el.append(h('div', { class: 'two' }, field('Content type', type), field('Content', v)), h('div', { class: 'two' }, field('Size', size), field('Error correction', ecc)),
    h('div', { class: 'acts' }, btn('Generate', gen, 'pri'), btn('Download PNG', dl)), m, cv);
}
const UNITS = {
  Length: { mm: .001, cm: .01, m: 1, km: 1000, in: .0254, ft: .3048, yd: .9144, mi: 1609.344 },
  Weight: { mg: 1e-6, g: .001, kg: 1, t: 1000, oz: .028349523125, lb: .45359237 },
  Area: { 'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1, ha: 1e4, 'km²': 1e6, 'in²': 6.4516e-4, 'ft²': .09290304, acre: 4046.8564224 },
  Volume: { mL: .001, L: 1, 'm³': 1000, tsp: .00492892159375, tbsp: .01478676478125, cup: .2365882365, 'gal (US)': 3.785411784, 'fl oz (US)': .0295735295625 },
  Speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: .44704, knot: 1852 / 3600, 'ft/s': .3048 },
  Time: { ms: .001, s: 1, min: 60, h: 3600, day: 86400, week: 604800 },
  'Data size': { bit: .125, B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 },
  Temperature: { '°C': 1, '°F': 1, K: 1 }
};
function unitTool(el) {
  const cat = sel(Object.keys(UNITS)), a = sel(['x']), b = sel(['x']), v = num({ value: '1' }), out = h('div', { class: 'big', 'aria-live': 'polite' }), m = msgEl();
  const fill = () => { for (const s of [a, b]) s.replaceChildren(...Object.keys(UNITS[cat.value]).map(k => h('option', { value: k }, k))); b.selectedIndex = Math.min(1, b.options.length - 1); calc(); };
  const toC = (x, u) => u === '°C' ? x : u === '°F' ? (x - 32) * 5 / 9 : x - 273.15, fromC = (c, u) => u === '°C' ? c : u === '°F' ? c * 9 / 5 + 32 : c + 273.15;
  function calc() {
    m.set(''); out.textContent = ''; const x = val(v); if (!Number.isFinite(x)) { m.set('Please enter a number.'); return; }
    let r;
    if (cat.value === 'Temperature') { const c = toC(x, a.value); if (c < -273.15 - 1e-9) { m.set('That is below absolute zero.'); return; } r = fromC(c, b.value); }
    else r = x * UNITS[cat.value][a.value] / UNITS[cat.value][b.value];
    out.textContent = `${fmtN(x)} ${a.value} = ${fmtN(r)} ${b.value}`;
  }
  cat.onchange = fill; [a, b].forEach(s => s.onchange = calc); v.oninput = calc;
  el.append(field('Category', cat), field('Value', v), h('div', { class: 'two' }, field('From', a), field('To', b)),
    btn('Swap units', () => { const t = a.value; a.value = b.value; b.value = t; calc(); }), m, out, h('p', { class: 'note' }, 'Data sizes use 1024-based steps (1 KB = 1024 B).'));
  fill();
}
function tsTool(el) {
  const ts = inp({ type: 'text', inputmode: 'numeric', placeholder: 'e.g. 1700000000' }), u = sel([['s', 'Seconds'], ['ms', 'Milliseconds']]), o1 = h('div', { class: 'stats', 'aria-live': 'polite' }), m1 = msgEl();
  const toDate = () => {
    o1.replaceChildren(); m1.set(''); const s = ts.value.trim(), n = Number(s);
    if (!s || !Number.isFinite(n)) { m1.set('Please enter a valid number.'); return; }
    const d = new Date(u.value === 'ms' ? n : n * 1000); if (isNaN(d)) { m1.set('That timestamp is outside the supported date range.'); return; }
    o1.append(stat('Local time', d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })), stat('UTC', d.toUTCString()), stat('ISO 8601', d.toISOString()), stat('Your time zone', Intl.DateTimeFormat().resolvedOptions().timeZone));
  };
  const dt = inp({ type: 'datetime-local', step: '1' }), tz = sel([['l', 'My local time zone'], ['u', 'UTC']]), o2 = h('div', { class: 'stats', 'aria-live': 'polite' }), m2 = msgEl();
  const toTs = () => {
    o2.replaceChildren(); m2.set(''); if (!dt.value) { m2.set('Please choose a date and time.'); return; }
    const d = new Date(tz.value === 'u' ? dt.value + (dt.value.length === 16 ? ':00' : '') + 'Z' : dt.value);
    if (isNaN(d)) { m2.set('That date is not valid.'); return; }
    o2.append(stat('Seconds', Math.floor(d.getTime() / 1000)), stat('Milliseconds', d.getTime()));
  };
  el.append(h('div', { class: 'two' }, field('Unix timestamp', ts), field('Unit', u)), h('div', { class: 'acts' }, btn('Convert to date', toDate, 'pri'),
    btn('Use current time', () => { ts.value = u.value === 'ms' ? Date.now() : Math.floor(Date.now() / 1000); toDate(); })), m1, o1,
    h('div', { class: 'two' }, field('Date and time', dt), field('Interpret as', tz)), btn('Convert to timestamp', toTs, 'pri'), m2, o2);
}
const rgb2hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), n = Math.min(r, g, b), d = M - n, l = (M + n) / 2; let hh = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); hh = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; } return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)]; };
const hsl2rgb = (H, S, L) => { S /= 100; L /= 100; const k = n => (n + H / 30) % 12, a = S * Math.min(L, 1 - L), f = n => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)].map(v => Math.round(v * 255)); };
function colorTool(el) {
  const pick = inp({ type: 'color', value: '#1f5eff' }), hx = inp({ type: 'text' }), rg = inp({ type: 'text' }), hs = inp({ type: 'text' }), sw = h('div', { class: 'swatch', role: 'img', 'aria-label': 'Color preview' }), m = msgEl();
  const toHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  const parse = {
    hx: s => { const x = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim()); if (!x) return null; let t = x[1]; if (t.length === 3) t = [...t].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(t.slice(i, i + 2), 16)); },
    rg: s => { const x = /^(?:rgb\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)?$/i.exec(s.trim()); if (!x) return null; const c = x.slice(1).map(Number); return c.every(v => v <= 255) ? c : null; },
    hs: s => { const x = /^(?:hsl\()?\s*(\d{1,3}(?:\.\d+)?)\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%?\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%?\s*\)?$/i.exec(s.trim()); if (!x) return null; const [a, b, c] = x.slice(1).map(Number); return a <= 360 && b <= 100 && c <= 100 ? hsl2rgb(a, b, c) : null; }
  };
  const set = (c, src) => {
    const hex = toHex(c), [H, S, L] = rgb2hsl(...c);
    if (src !== 'hx') hx.value = hex; if (src !== 'rg') rg.value = `rgb(${c.join(', ')})`; if (src !== 'hs') hs.value = `hsl(${H}, ${S}%, ${L}%)`; pick.value = hex; sw.style.background = hex; m.set('');
  };
  const on = k => e => { const c = parse[k](e.target.value); if (c) set(c, k); else m.set('That color format is not valid.'); };
  hx.oninput = on('hx'); rg.oninput = on('rg'); hs.oninput = on('hs'); pick.oninput = () => set(parse.hx(pick.value));
  const row = (label, i) => h('div', { class: 'two' }, field(label, i), h('div', { class: 'acts', style: 'align-self:end' }, copyBtn(() => i.value)));
  el.append(field('Color picker', pick), sw, row('HEX', hx), row('RGB', rg), row('HSL', hs), m); set([31, 94, 255]);
}
function pwTool(el) {
  if (!cryptoOk()) { el.append(h('p', { class: 'msg' }, 'Your browser does not support secure random numbers.')); return; }
  const len = inp({ type: 'range', min: '6', max: '64', value: '16' }), lo = h('output', {}, '16'), [cu, lu] = chk('Uppercase (A-Z)', true), [cl, ll] = chk('Lowercase (a-z)', true), [cn, ln] = chk('Numbers (0-9)', true), [cs, ls] = chk('Symbols (!@#…)', true);
  const out = h('div', { class: 'pw', 'aria-live': 'polite' }), bar = h('i'), lab = h('p', { class: 'note' }), m = msgEl();
  const SETS = [[cu, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], [cl, 'abcdefghijklmnopqrstuvwxyz'], [cn, '0123456789'], [cs, '!@#$%^&*()-_=+[]{};:,.?']];
  const gen = () => {
    const on = SETS.filter(s => s[0].checked).map(s => s[1]); m.set('');
    if (!on.length) { m.set('Select at least one character type.'); toast('Select at least one character type', 'err'); return; }
    const L = +len.value, pool = on.join(''), p = on.map(s => s[rnd(s.length)]);
    while (p.length < L) p.push(pool[rnd(pool.length)]);
    for (let i = p.length - 1; i > 0; i--) { const j = rnd(i + 1); [p[i], p[j]] = [p[j], p[i]]; }
    out.textContent = p.join('');
    const bits = L * Math.log2(pool.length), s = bits < 40 ? 'Weak' : bits < 60 ? 'Fair' : bits < 80 ? 'Strong' : 'Very strong';
    bar.style.width = Math.min(100, bits / 1.28) + '%'; lab.textContent = `Strength: ${s} (about ${Math.round(bits)} bits)`;
  };
  len.oninput = () => { lo.textContent = len.value; gen(); };
  el.append(field('Length', h('span', { class: 'rng' }, len, lo)), h('div', { class: 'opts' }, lu, ll, ln, ls), out, h('div', { class: 'meter', role: 'presentation' }, bar), lab, m,
    h('div', { class: 'acts' }, btn('Generate password', gen, 'pri'), btn('Copy', () => copyText(out.textContent))));
  SETS.forEach(s => s[0].onchange = gen); gen();
}

/* ---------- registry ---------- */
const T = (id, name, cat, icon, desc, render) => ({ id, name, cat, icon, desc, render });
const TOOLS = [
  T('age', 'Age Calculator', 'Calculators', 'Age', 'Find your exact age in years, months, days and total days.', ageTool),
  T('percentage', 'Percentage Calculator', 'Calculators', '%', 'Percent of a number, ratios, and percentage increase or decrease.', pctTool),
  T('cgpa', 'CGPA Calculator', 'Calculators', 'GPA', 'Add subjects with grade points and credits to get your CGPA.', cgpaTool),
  T('bmi', 'BMI Calculator', 'Calculators', 'BMI', 'Calculate body mass index in metric or imperial units.', bmiTool),
  T('discount', 'Discount Calculator', 'Calculators', '−%', 'See the discount amount, final price and savings for any sale.', discountTool),
  T('word-counter', 'Word Counter', 'Text', 'Wc', 'Count words, characters, sentences and paragraphs as you type.', wordTool),
  T('char-counter', 'Character Counter', 'Text', 'Ch', 'Live character, word and line counts for any text.', charTool),
  T('case-converter', 'Case Converter', 'Text', 'Aa', 'Switch text between upper, lower, title, sentence and toggle case.', caseTool),
  T('duplicate-lines', 'Duplicate Line Remover', 'Text', '≠', 'Remove repeated lines with case and whitespace options.', dedupeTool),
  T('text-sorter', 'Text Sorter', 'Text', 'A↓Z', 'Sort lines alphabetically or numerically, reverse or shuffle them.', sortTool),
  T('json', 'JSON Formatter', 'Developer', '{ }', 'Format, minify and validate JSON with clear error messages.', jsonTool),
  T('base64', 'Base64 Encoder / Decoder', 'Developer', '64', 'Convert text to Base64 and back, with full UTF-8 support.', b64Tool),
  T('url-codec', 'URL Encoder / Decoder', 'Developer', '%20', 'Percent-encode or decode URLs and query strings.', urlTool),
  T('uuid', 'UUID Generator', 'Developer', 'ID', 'Generate one or many random version 4 UUIDs.', uuidTool),
  T('hash', 'Hash Generator', 'Developer', '#', 'Create SHA-256, SHA-384 or SHA-512 hashes with Web Crypto.', hashTool),
  T('image-compressor', 'Image Compressor', 'Image', 'Zip', 'Shrink JPG, PNG and WebP images with quality and size limits.', el => imgTool(el, { name: 'compressed-image', go: 'Compress image', fmts: [['jpeg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP']], q: true, max: true })),
  T('image-resizer', 'Image Resizer', 'Image', '⤢', 'Resize images to exact dimensions and export as JPG, PNG or WebP.', el => imgTool(el, { name: 'resized-image', go: 'Resize image', fmts: [['jpeg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP']], resize: true })),
  T('jpg-png', 'JPG ↔ PNG Converter', 'Image', '⇄', 'Convert JPG images to PNG or PNG images to JPG.', el => imgTool(el, { name: 'converted-image', go: 'Convert image', modes: [['jp', 'JPG to PNG'], ['pj', 'PNG to JPG']],
    fixed: mode => mode.value === 'jp' ? 'png' : 'jpeg', check: (f, mode) => mode.value === 'jp' ? (f.type === 'image/jpeg' ? '' : 'Please select a JPG image for JPG to PNG.') : (f.type === 'image/png' ? '' : 'Please select a PNG image for PNG to JPG.') })),
  T('image-webp', 'Image to WebP', 'Image', 'Web', 'Convert JPG or PNG images to the efficient WebP format.', el => imgTool(el, { name: 'image', go: 'Convert to WebP', fixed: 'webp', q: true })),
  T('image-base64', 'Image to Base64', 'Image', '</>', 'Turn an image into a Base64 string or data URL.', b64ImgTool),
  T('qr', 'QR Code Generator', 'Utilities', 'QR', 'Create QR codes for text, links, email or phone numbers.', qrTool),
  T('units', 'Unit Converter', 'Utilities', 'm↔ft', 'Convert length, weight, temperature, area, volume, speed, time and data.', unitTool),
  T('timestamp', 'Timestamp Converter', 'Utilities', 'Unix', 'Convert Unix timestamps to dates and dates to timestamps.', tsTool),
  T('color', 'Color Converter', 'Utilities', 'HEX', 'Convert between HEX, RGB and HSL with a live preview.', colorTool),
  T('password', 'Password Generator', 'Utilities', '•••', 'Create strong random passwords with a secure generator.', pwTool)
];

/* ---------- home page ---------- */
const CATS = ['All Tools', 'Calculators', 'Text', 'Developer', 'Image', 'Utilities'];
let cat = 'All Tools', query = '';
const favs = () => store.get('tbp:fav', []), recents = () => store.get('tbp:recent', []);
const byId = id => TOOLS.find(t => t.id === id);
function card(t) {
  const on = favs().includes(t.id);
  const c = h('article', { class: 'card' }, h('div', { class: 'card-top' }, h('span', { class: 'ico', 'aria-hidden': 'true' }, t.icon),
    h('button', { class: 'fav' + (on ? ' on' : ''), type: 'button', 'data-id': t.id, 'aria-pressed': String(on), 'aria-label': `${on ? 'Remove' : 'Add'} ${t.name} ${on ? 'from' : 'to'} favorites`, onclick: e => { e.stopPropagation(); toggleFav(t.id); } }, on ? '★' : '☆')),
    h('h3', {}, t.name), h('p', {}, t.desc), h('div', { class: 'card-bot' }, h('span', { class: 'tag' }, t.cat),
      h('button', { class: 'btn sm', type: 'button', 'aria-label': 'Open ' + t.name, onclick: e => { e.stopPropagation(); openTool(t.id, e.currentTarget); } }, 'Open Tool')));
  c.addEventListener('click', () => openTool(t.id, $('.btn', c)));
  return c;
}
function toggleFav(id) {
  let f = favs(); f = f.includes(id) ? f.filter(x => x !== id) : [...f, id]; store.set('tbp:fav', f);
  toast(f.includes(id) ? 'Added to favorites' : 'Removed from favorites'); render(false);
  const b = document.querySelector(`#grid .fav[data-id="${id}"]`); if (b) b.focus();
}
function render(anim = true) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const list = TOOLS.filter(t => (cat === 'All Tools' || t.cat === cat) && words.every(w => (t.name + ' ' + t.desc + ' ' + t.cat).toLowerCase().includes(w)));
  const grid = $('#grid'); grid.replaceChildren(...list.map(card));
  if (anim) { grid.classList.remove('swap'); void grid.offsetWidth; grid.classList.add('swap'); }
  $('#empty').hidden = list.length > 0; $('#all-h').hidden = list.length === 0;
  $('#count').textContent = list.length ? `${list.length} tool${list.length === 1 ? '' : 's'}` : 'No tools found';
  const home = !words.length && cat === 'All Tools';
  const fl = favs().map(byId).filter(Boolean), rl = recents().map(byId).filter(Boolean);
  $('#favs-sec').hidden = !(home && fl.length); $('#favs').replaceChildren(...fl.map(card));
  $('#recent-sec').hidden = !(home && rl.length); $('#recent').replaceChildren(...rl.map(card));
  $('#chips').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === cat)));
}
$('#chips').append(...CATS.map(c => h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: () => { cat = c; render(); } }, c)));
$('#q').addEventListener('input', e => { query = e.target.value; render(); });

/* ---------- tool dialog ---------- */
let lastFocus = null;
function openTool(id, trigger, fromPop) {
  const t = byId(id); if (!t) return;
  lastFocus = trigger || lastFocus; revokeAll();
  $('#dlg-title').textContent = t.name; $('#dlg-desc').textContent = t.desc;
  const body = $('#dlg-body'); body.replaceChildren();
  try { t.render(body); } catch { body.replaceChildren(h('p', { class: 'msg' }, 'Something went wrong. Please try again.')); }
  dlg.classList.remove('closing'); if (!dlg.open) dlg.showModal();
  if (!fromPop && location.hash !== '#tool-' + id) history.pushState(null, '', '#tool-' + id);
  const r = recents().filter(x => x !== id); r.unshift(id); store.set('tbp:recent', r.slice(0, 6));
  body.scrollTop = 0; $('#dlg-title').focus({ preventScroll: true });
}
function closeDlg() {
  if (!dlg.open) return; dlg.classList.add('closing');
  const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160;
  setTimeout(() => { dlg.classList.remove('closing'); if (dlg.open) dlg.close(); }, ms);
}
const requestClose = () => location.hash.startsWith('#tool-') ? history.back() : closeDlg();
$('#dlg-close').addEventListener('click', requestClose);
dlg.addEventListener('cancel', e => { e.preventDefault(); requestClose(); });
dlg.addEventListener('click', e => { if (e.target === dlg) requestClose(); });
dlg.addEventListener('close', () => { revokeAll(); $('#dlg-body').replaceChildren(); document.body.append($('#toasts')); render(false); if (lastFocus && lastFocus.isConnected) lastFocus.focus(); });
addEventListener('popstate', () => { const m = location.hash.match(/^#tool-(.+)$/); if (m && byId(m[1])) openTool(m[1], null, true); else closeDlg(); });

/* ---------- theme ---------- */
const themeBtn = $('#theme');
function paintTheme() { const d = document.documentElement.dataset.theme === 'dark'; themeBtn.textContent = d ? '☀' : '☾'; themeBtn.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); }
themeBtn.addEventListener('click', () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('tbp:theme', n); } catch { /* ignore */ } paintTheme(); });
paintTheme(); render(false);
{ const m = location.hash.match(/^#tool-(.+)$/); if (m && byId(m[1])) { history.replaceState(null, '', location.pathname + location.search); openTool(m[1], null); } }
