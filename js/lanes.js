// La pista: un carril per peça, les rodones vénen de la dreta cap a la línia
// de cop (com els tutors de bateria electrònica). Sobre cada rodona es veu com
// ha anat el cop, i els cops de l'alumnat queden marcats al seu lloc exacte,
// de manera que es veu si van avançats o endarrerits.

import { LANE_LABEL, LANE_COLOR, PIECES } from './cards.js';

const HIT_X = 0.2; // on és la línia de cop (fracció de l'amplada)
const VERDICT_COLOR = { perfect: '#44d17a', good: '#b7e36b', near: '#ffb347', missed: '#ff5a5a', wrong: '#ff5a5a' };

export function createLanes(canvas) {
  const g = canvas.getContext('2d');
  let lanes = ['hh', 'sn', 'kk'];
  let dpr = 1;
  let W = 0;
  let H = 0;
  const marks = []; // cops de l'alumnat { lane, time, kind }
  let showLabels = true;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    W = Math.max(200, r.width);
    H = Math.max(120, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function laneY(lane) {
    const i = lanes.indexOf(lane);
    const top = 26;
    const h = (H - top - 6) / lanes.length;
    return i < 0 ? -100 : top + h * (i + 0.5);
  }
  const laneH = () => (H - 32) / lanes.length;

  /**
   * Dibuixa. `s`: la sessió; `pos`: session.position().
   * opts: { labels, hideNotes (només la carta), counting (text gran) }
   */
  function draw(s, pos, opts = {}) {
    if (!W) resize();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#1b1a1b';
    g.fillRect(0, 0, W, H);
    if (!s) return;

    const secondsVisible = s.barDur * (W < 640 ? 1.15 : 2.1);
    const pxPerSec = (W * (1 - HIT_X)) / secondsVisible;
    const xOf = (t) => W * HIT_X + (t - pos.heard) * pxPerSec;
    const lh = laneH();

    // Carrils
    lanes.forEach((lane, i) => {
      const y = laneY(lane);
      g.fillStyle = i % 2 ? '#232123' : '#282628';
      g.fillRect(0, y - lh / 2, W, lh);
    });

    // Compassos i temps
    const firstBar = Math.max(0, pos.bar - 1);
    for (let b = firstBar; b <= pos.bar + 3; b++) {
      const info = s.bars[b];
      const start = s.barStart(b);
      const sub = s.div ?? (info?.card?.grid === 12 ? 3 : 2);
      for (let k = 0; k < (s.bpb ?? 4) * sub; k++) {
        const t = start + (k * s.spb) / sub;
        const x = xOf(t);
        if (x < -10 || x > W + 10) continue;
        const onBeat = k % sub === 0;
        g.strokeStyle = k === 0 ? 'rgba(255,255,255,.35)' : onBeat ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.05)';
        g.lineWidth = k === 0 ? 2 : 1;
        g.beginPath(); g.moveTo(x, 22); g.lineTo(x, H); g.stroke();
        g.fillStyle = onBeat ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.35)';
        g.font = `${onBeat ? 700 : 400} 12px Ubuntu, system-ui, sans-serif`;
        g.textAlign = 'center';
        g.fillText(onBeat ? String(k / sub + 1) : sub === 3 ? (k % 3 === 1 ? 'i' : 'a') : 'i', x, 15);
      }
      if (info) {
        const x = xOf(start);
        const label = info.kind === 'demo' ? 'ESCOLTA' : info.kind === 'count' ? (info.entryBreak ? 'BREAK · ENTRADA' : 'PREPARA’T') : info.kind === 'play' ? (info.quiet ? '🤫 EN SILENCI' : info.part ? info.part.toUpperCase() : '') : info.kind === 'end' ? 'FINAL' : '';
        if (label && x > W * HIT_X - 200 && x < W) {
          g.fillStyle = info.kind === 'demo' ? '#7fc8ff' : info.kind === 'count' ? '#fdbe10' : 'rgba(255,255,255,.6)';
          g.font = '700 11px Ubuntu, system-ui, sans-serif';
          g.textAlign = 'left';
          g.fillText(label, x + 6, 30);
        }
        if (info.kind === 'demo' || info.kind === 'count') {
          const x2 = xOf(start + s.barDur);
          g.fillStyle = info.kind === 'demo' ? 'rgba(80,160,255,.07)' : 'rgba(253,190,16,.07)';
          g.fillRect(x, 22, x2 - x, H);
        }
      }
    }

    // Línia de cop
    const hx = W * HIT_X;
    g.fillStyle = 'rgba(253,190,16,.18)';
    g.fillRect(hx - 3, 22, 6, H);
    g.strokeStyle = '#fdbe10';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(hx, 22); g.lineTo(hx, H); g.stroke();

    // Rodones
    if (!opts.hideNotes) {
      for (let b = firstBar; b <= pos.bar + 3; b++) {
        const info = s.bars[b];
        if (!info) continue;
        for (const n of info.notes) {
          const x = xOf(n.time);
          if (x < -30 || x > W + 30) continue;
          drawNote(n, x, laneY(PIECES[n.piece].lane), lh, n.time < pos.heard);
        }
      }
    } else {
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.font = '600 14px Ubuntu, system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('Mira la carta: les rodones ja no surten a la pista', (W * (1 + HIT_X)) / 2, H / 2);
    }

    // Cops de l'alumnat
    for (let i = marks.length - 1; i >= 0; i--) {
      const m = marks[i];
      const x = xOf(m.time);
      if (x < -20) { marks.splice(i, 1); continue; }
      const y = laneY(m.lane);
      g.strokeStyle = m.kind === 'extra' || m.kind === 'wrong' ? '#ff5a5a' : '#ffffff';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, y - lh * 0.42); g.lineTo(x, y + lh * 0.42); g.stroke();
    }

    // Etiquetes dels carrils
    if (showLabels) {
      lanes.forEach((lane) => {
        const y = laneY(lane);
        g.fillStyle = 'rgba(27,26,27,.85)';
        g.fillRect(0, y - 10, 64, 20);
        g.fillStyle = LANE_COLOR[lane];
        g.beginPath(); g.arc(10, y, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#eee';
        g.font = '600 11px Ubuntu, system-ui, sans-serif';
        g.textAlign = 'left';
        g.fillText(LANE_LABEL[lane], 19, y + 4);
      });
    }

    // Text gran (compte)
    if (opts.big) {
      g.fillStyle = 'rgba(253,190,16,.95)';
      g.font = '700 54px Lora, Georgia, serif';
      g.textAlign = 'center';
      g.fillText(opts.big, (W * (1 + HIT_X)) / 2, H / 2 + 18);
    }
  }

  function drawNote(n, x, y, lh, past) {
    const p = PIECES[n.piece];
    const r = Math.min(lh * 0.36, 14) * (p.ghost ? 0.6 : 1);
    const st = n.exp?.status;
    let alpha = 1;
    if (n.kind === 'demo' && past) alpha = 0.35;
    if (st === 'missed') alpha = 0.45;
    g.globalAlpha = alpha;
    if (n.piece === 'rim') {
      g.fillStyle = p.color;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#1b1a1b'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x - r * 0.5, y - r * 0.5); g.lineTo(x + r * 0.5, y + r * 0.5); g.moveTo(x + r * 0.5, y - r * 0.5); g.lineTo(x - r * 0.5, y + r * 0.5); g.stroke();
    } else if (p.open) {
      g.strokeStyle = p.color; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
      g.fillStyle = p.color; g.font = '700 10px Ubuntu, sans-serif'; g.textAlign = 'center'; g.fillText('o', x, y + 3);
    } else {
      g.fillStyle = p.color;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      if (n.piece === 'crash' || n.piece === 'ride') {
        g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(x, y, r * 0.55, 0, Math.PI * 2); g.stroke();
      }
    }
    if (n.kind === 'demo' && past && x > W * HIT_X - 40) {
      // la demostració encén la rodona quan sona
      g.globalAlpha = Math.max(0, 1 - (W * HIT_X - x) / 40);
      g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r + 4, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1;
    if (st && st !== 'pending' && st !== 'skip') {
      const c = VERDICT_COLOR[st];
      g.strokeStyle = c; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, r + 4, 0, Math.PI * 2); g.stroke();
      if (st === 'missed') {
        g.beginPath();
        g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r);
        g.stroke();
      }
    }
  }

  return {
    resize,
    draw,
    setLanes(l) { lanes = l; },
    get lanes() { return lanes; },
    addMark(piece, time, kind) {
      const lane = PIECES[piece]?.lane;
      if (lane && lanes.includes(lane)) marks.push({ lane, time, kind });
      if (marks.length > 200) marks.shift();
    },
    clearMarks() { marks.length = 0; },
    set labels(v) { showLabels = v; },
  };
}
