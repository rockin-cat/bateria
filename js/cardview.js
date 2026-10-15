// La carta ROCKIN a la pantalla: la imatge de la carta (o una carta dibuixada
// amb el mateix estil), una pilota que bota sobre els temps i marques
// sobre les rodones: verd si el cop ha anat bé, taronja si ha anat just, vermell si no.

import { PIECES, cardLabel } from './cards.js';

const COLOR = { perfect: '#1f9d55', good: '#6bbf3a', near: '#f08c00', missed: '#d64545', wrong: '#d64545' };

// Colors de les cartes ROCKIN (els mateixos que a les imatges)
const INK_COLORS = { hh: '#ffdd57', oh: '#ffdd57', ride: '#f7a600', crash: '#c95a64', sn: '#7fd85a', ghost: '#7fd85a', rim: '#7fd85a', kk: '#3ab5ff', ghostkk: '#3ab5ff', t1: '#5fa8ad', t2: '#8d8d8d', t3: '#a9885e', pedal: '#ffdd57' };

/**
 * Carta dibuixada amb l'estil de les cartes ROCKIN: quadret amb el número, el logo,
 * els números dels temps, línies de punts i rodones de colors. `opts.base` és el camí
 * fins a la carpeta del joc (per al logo quan es fa servir fora de la pàgina).
 */
export function renderCardSVG(card, opts = {}) {
  const W = 1558;
  const H = 1109;
  const g = card.geo;
  const font = "'Open Sans', Ubuntu, 'Helvetica Neue', Arial, sans-serif";
  const base = opts.base ?? '';
  const X = (x) => (x * W).toFixed(1);
  const Y = (y) => (y * H).toFixed(1);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="card-svg">`;
  s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  // quadret del número i logo
  const box = card.box ?? '#a98a5a';
  const numW = Math.max(78, 34 + 30 * String(card.num).length);
  s += `<rect x="72" y="76" width="${numW}" height="80" fill="${box}"/><text x="${72 + numW / 2}" y="131" font-family="${font}" font-weight="800" font-size="40" text-anchor="middle" fill="#111">${escapeXml(card.num)}</text>`;
  s += `<image href="${base}assets/brand/rockin-icon.png" xlink:href="${base}assets/brand/rockin-icon.png" x="1372" y="72" width="94" height="94"/>`;
  // quines files té cada temps (per a les línies de punts)
  const per = card.grid / 4;
  const byBeat = [[], [], [], []];
  for (const [key, [, y]] of Object.entries(card.marks)) {
    const [p, st] = key.split(':');
    if (Number(st) % per === 0 && p !== 'pedal') byBeat[Number(st) / per].push(y);
  }
  for (let b = 0; b < (card.pulses ?? 4); b++) {
    const x = g.x1 + b * g.dx;
    s += `<text x="${X(x)}" y="${Y(g.ytop + 0.03)}" font-family="${font}" font-weight="800" font-size="96" text-anchor="middle" fill="#111">${b + 1}</text>`;
    const ys = byBeat[b];
    const top = ys.length ? Math.min(...ys) : 0.4;
    s += `<line x1="${X(x)}" y1="${Y(Math.min(top, 0.4))}" x2="${X(x)}" y2="${Y(0.78)}" stroke="#111" stroke-width="6" stroke-dasharray="6 9"/>`;
  }
  // rodones
  for (const [key, [x, y, r]] of Object.entries(card.marks)) {
    const [p] = key.split(':');
    const c = INK_COLORS[p] ?? PIECES[p]?.color ?? '#999';
    const cx = X(x);
    const cy = Y(y);
    const R = r * W;
    if (p === 'oh') {
      // charles obert: dos platets un sobre l'altre (com a les cartes ROCKIN)
      s += `<ellipse cx="${cx}" cy="${(y * H + R * 0.35).toFixed(1)}" rx="${(R * 1.05).toFixed(1)}" ry="${(R * 0.55).toFixed(1)}" fill="${c}" stroke="#111" stroke-width="4"/>`;
      s += `<ellipse cx="${cx}" cy="${(y * H - R * 0.3).toFixed(1)}" rx="${(R * 1.05).toFixed(1)}" ry="${(R * 0.55).toFixed(1)}" fill="${c}" stroke="#111" stroke-width="4"/>`;
    } else if (p === 'rim') {
      s += `<circle cx="${cx}" cy="${cy}" r="${R.toFixed(1)}" fill="${c}"/>`;
      s += `<path d="M${x * W - R * 0.45} ${y * H - R * 0.45} L${x * W + R * 0.45} ${y * H + R * 0.45} M${x * W + R * 0.45} ${y * H - R * 0.45} L${x * W - R * 0.45} ${y * H + R * 0.45}" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`;
    } else if (p === 'ride') {
      s += `<circle cx="${cx}" cy="${cy}" r="${R.toFixed(1)}" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="${(R * 0.32).toFixed(1)}" fill="#fff" opacity=".85"/>`;
    } else if (p === 'pedal') {
      s += `<circle cx="${cx}" cy="${cy}" r="${R.toFixed(1)}" fill="${c}" stroke="#111" stroke-width="4"/>`;
    } else {
      s += `<circle cx="${cx}" cy="${cy}" r="${R.toFixed(1)}" fill="${c}"/>`;
    }
  }
  // Digitació (D = mà dreta, E = mà esquerra) al primer temps i a la primera caixa, com a les cartes ROCKIN 30–32
  if (card.sticking) {
    for (let st = 0; st < 4; st++) {
      const m = card.marks[`hh:${st}`];
      if (m) s += `<text x="${X(m[0])}" y="${(m[1] * H + (st === 0 ? 11 : 8)).toFixed(1)}" font-family="${font}" font-weight="800" font-size="${st === 0 ? 30 : 22}" text-anchor="middle" fill="#111">${st % 2 ? 'E' : 'D'}</text>`;
    }
    const firstSn = Object.keys(card.marks).filter((k) => k.startsWith('sn:')).map((k) => Number(k.split(':')[1])).sort((a, b) => a - b)[0];
    const m = firstSn != null && firstSn % 2 === 0 ? card.marks[`sn:${firstSn}`] : null;
    if (m) s += `<text x="${X(m[0])}" y="${(m[1] * H + 11).toFixed(1)}" font-family="${font}" font-weight="800" font-size="30" text-anchor="middle" fill="#111">D</text>`;
  }
  // llegenda (només si cal)
  const used = new Set(Object.keys(card.marks).map((k) => k.split(':')[0]));
  const legend = [];
  if (card.sticking) { legend.push(['D', 'Mà dreta']); legend.push(['E', 'Mà esquerra']); }
  if (used.has('rim')) legend.push(['rim', 'Rim: baqueta creuada']);
  if (used.has('ride')) legend.push(['ride', 'Ride']);
  if (used.has('oh')) legend.push(['oh', 'Charles obert']);
  if (used.has('pedal')) legend.push(['pedal', 'Charles amb el peu']);
  if (used.has('crash')) legend.push(['crash', 'Crash']);
  legend.forEach(([p, text], i) => {
    const y = 0.83 + i * 0.045;
    const c = INK_COLORS[p];
    if (p === 'D' || p === 'E') {
      s += `<circle cx="${X(0.06)}" cy="${Y(y)}" r="17" fill="${INK_COLORS.hh}"/><text x="${X(0.06)}" y="${Y(y) * 1 + 8}" font-family="${font}" font-weight="800" font-size="22" text-anchor="middle" fill="#111">${p}</text>`;
      s += `<text x="${X(0.08)}" y="${Y(y + 0.012)}" font-family="${font}" font-size="40" fill="#333">${escapeXml(text)}</text>`;
      return;
    }
    s += p === 'oh'
      ? `<ellipse cx="${X(0.06)}" cy="${Y(y)}" rx="16" ry="9" fill="${c}" stroke="#111" stroke-width="3"/>`
      : `<circle cx="${X(0.06)}" cy="${Y(y)}" r="17" fill="${c}"${p === 'pedal' ? ' stroke="#111" stroke-width="3"' : ''}/>`;
    s += `<text x="${X(0.08)}" y="${Y(y + 0.012)}" font-family="${font}" font-size="40" fill="#333">${escapeXml(text)}</text>`;
  });
  if (card.title) {
    // amb llegenda, el títol va a la dreta (com a les cartes ROCKIN amb D/E)
    const t = legend.length ? `x="${X(0.95)}" text-anchor="end"` : `x="${W / 2}" text-anchor="middle"`;
    s += `<text ${t} y="${Y(0.91)}" font-family="${font}" font-weight="800" font-size="52" fill="#111">${escapeXml(card.title)}</text>`;
  }
  s += '</svg>';
  return s;
}

const escapeXml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createCardView(root) {
  let card = null;
  let el = null;
  let ball = null;
  let head = null;
  let layer = null;

  function show(c, { caption = '' } = {}) {
    if (card === c && el) return;
    card = c;
    root.innerHTML = '';
    if (!c) return;
    el = document.createElement('div');
    el.className = 'cardview';
    const frame = document.createElement('div');
    frame.className = 'card-frame';
    frame.innerHTML = c.img ? `<img src="${c.img}" alt="${cardLabel(c)}${c.title ? ' · ' + escapeXml(c.title) : ''}" draggable="false">` : renderCardSVG(c);
    head = document.createElement('div');
    head.className = 'card-playhead';
    ball = document.createElement('div');
    ball.className = 'card-ball';
    layer = document.createElement('div');
    layer.className = 'card-marks';
    frame.append(head, ball, layer);
    el.appendChild(frame);
    if (caption) {
      const cap = document.createElement('div');
      cap.className = 'card-caption';
      cap.textContent = caption;
      el.appendChild(cap);
    }
    root.appendChild(el);
  }

  /** beat: 0–4 dins del compàs; active: si la pilota es veu. */
  function update(beat, active = true) {
    if (!card || !ball) return;
    const g = card.geo;
    const clamped = Math.max(0, Math.min((card.pulses ?? 4) - 0.001, beat));
    const x = g.x1 + clamped * g.dx;
    const frac = clamped % 1;
    const bounce = Math.sin(Math.PI * frac);
    const y = g.ytop - 0.1 - 0.07 * bounce;
    ball.style.left = `${x * 100}%`;
    ball.style.top = `${y * 100}%`;
    ball.style.opacity = active ? '1' : '0';
    head.style.left = `${x * 100}%`;
    head.style.opacity = '0'; // a la carta només la pilota (la línia és només per a la pista)
  }

  function markAt(piece, step, status, { fade = true } = {}) {
    if (!card || !layer) return;
    const m = card.marks[`${piece}:${step}`];
    if (!m) return;
    const d = document.createElement('div');
    d.className = `card-mark ${status}${fade ? ' fade' : ''}`;
    d.style.left = `${m[0] * 100}%`;
    d.style.top = `${m[1] * 100}%`;
    d.style.width = d.style.height = `${Math.max(m[2] * 2.9, 0.045) * 100}%`;
    d.style.borderColor = COLOR[status] ?? '#999';
    layer.appendChild(d);
    if (fade) setTimeout(() => d.remove(), 900);
    return d;
  }

  /** Al final: cada rodona pintada segons com ha anat de mitjana. */
  function summaryMarks(expected) {
    if (!card || !layer) return;
    layer.innerHTML = '';
    const agg = new Map();
    for (const e of expected) {
      if (e.card !== card.id || e.status === 'pending' || e.status === 'skip') continue;
      const k = `${e.piece}:${e.step}`;
      const a = agg.get(k) ?? { ok: 0, n: 0, piece: e.piece, step: e.step, wrong: 0 };
      a.n++;
      if (e.status === 'perfect' || e.status === 'good') a.ok++;
      else if (e.status === 'near') a.ok += 0.5;
      if (e.wrongWith) a.wrong++;
      agg.set(k, a);
    }
    for (const a of agg.values()) {
      const r = a.ok / a.n;
      const status = r >= 0.75 ? 'perfect' : r >= 0.4 ? 'near' : 'missed';
      const d = markAt(a.piece, a.step, status, { fade: false });
      if (d && status !== 'perfect') d.title = `${PIECES[a.piece].name}: ${Math.round(r * 100)} % bé`;
    }
  }

  function clearMarks() { if (layer) layer.innerHTML = ''; }

  return { show, update, markAt, summaryMarks, clearMarks, get card() { return card; } };
}
