import * as THREE from 'three';

/* ---------- colors ---------- */
export const COL = {
  bg: 0x0B1B1F,
  petrol: 0x2D5856,
  petrolDark: 0x1E3D3C,
  deep: 0x0D1F24,
  white: 0xEDF2F1,
  gray: 0x9AA6A5,
  gold: 0xF5C64F,
  glow: 0x4FE3C1,
};
export const HEX = {
  petrol: '#2D5856', petrolDark: '#1E3D3C', deep: '#0D1F24', gold: '#F5C64F',
  glow: '#4FE3C1', white: '#F2F6F5', gray: '#9AA6A5', bg: '#0B1B1F',
};

/* ---------- icons (stroke svg) ---------- */
export const ICONS = {
  office: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>',
  workshop: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  delivery: '<svg viewBox="0 0 24 24"><path d="M1 5h14v11H1zM15 9h4l3 3v4h-7"/><circle cx="5.5" cy="18" r="2"/><circle cx="18.5" cy="18" r="2"/></svg>',
  install: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/></svg>',
  gallery: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/></svg>',
};

/* ---------- easing + tweens ---------- */
export const ease = {
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  linear: t => t,
};
const tweens = new Set();
export function tween(dur, fn, { e = ease.inOut, delay = 0, tag = null } = {}) {
  return new Promise(res => {
    const tw = { t0: performance.now() + delay * 1000, dur: Math.max(dur, .001) * 1000, fn, e, res, tag };
    tweens.add(tw);
  });
}
export function killTweens(tag) {
  for (const tw of tweens) if (tw.tag === tag) { tweens.delete(tw); tw.res(false); }
}
export function updateTweens(now) {
  for (const tw of tweens) {
    if (now < tw.t0) continue;
    const k = Math.min(1, (now - tw.t0) / tw.dur);
    tw.fn(tw.e(k));
    if (k >= 1) { tweens.delete(tw); tw.res(true); }
  }
}
export const wait = s => new Promise(r => setTimeout(r, s * 1000));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));

/* ---------- material helpers ---------- */
export const std = (color, rough = .6, metal = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
export const glowMat = (hex, k = 2, extra = {}) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false, ...extra });

/* ---------- canvas helpers ---------- */
export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
export function canvasTex(c, { srgb = true, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* Poster-like brand compositions, drawn on canvas.
   Used for screens, prints and wall posters in the scene. */
export function drawDesign(ctx, x, y, w, h, v, img) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const s = Math.min(w, h);
  const AR = '800 ' + Math.round(s * .2) + 'px "Baloo Bhaijaan 2", sans-serif';
  switch (v % 5) {
    case 0: { // petrol + gold sun
      ctx.fillStyle = HEX.petrol; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = HEX.gold; ctx.beginPath(); ctx.arc(x + w * .68, y + h * .36, s * .26, 0, 7); ctx.fill();
      ctx.fillStyle = HEX.petrolDark; ctx.fillRect(x, y + h * .62, w, h * .38);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + w * .1, y + h * .72, w * .55, h * .05); ctx.fillRect(x + w * .1, y + h * .82, w * .35, h * .04);
      break; }
    case 1: { // white + petrol diagonal
      ctx.fillStyle = '#F2F6F5'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = HEX.petrol; ctx.beginPath(); ctx.moveTo(x, y + h * .55); ctx.lineTo(x + w, y + h * .25); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
      ctx.strokeStyle = HEX.gold; ctx.lineWidth = s * .05; ctx.beginPath(); ctx.arc(x + w * .3, y + h * .3, s * .17, 0, 7); ctx.stroke();
      break; }
    case 2: { // dark + arabic type
      const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#16383A'); g.addColorStop(1, '#0B1B1F');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(79,227,193,.18)'; ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x + w * i / 8, y); ctx.lineTo(x + w * i / 8, y + h); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.font = AR; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
      ctx.fillText('السند', x + w / 2, y + h * .46);
      ctx.fillStyle = HEX.gold; ctx.fillRect(x + w * .35, y + h * .66, w * .3, h * .03);
      break; }
    case 3: { // gold + petrol blocks
      ctx.fillStyle = HEX.gold; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = HEX.petrol; ctx.fillRect(x + w * .1, y + h * .1, w * .5, h * .5);
      ctx.fillStyle = HEX.petrolDark; ctx.beginPath(); ctx.arc(x + w * .7, y + h * .7, s * .22, 0, 7); ctx.fill();
      break; }
    default: { // mark on petrol
      ctx.fillStyle = HEX.petrolDark; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = HEX.glow; ctx.lineWidth = s * .015;
      ctx.strokeRect(x + w * .08, y + h * .08, w * .84, h * .84);
      if (img) { const ih = h * .5, iw = ih * img.width / img.height; ctx.drawImage(img, x + (w - iw) / 2, y + h * .22, iw, ih); }
    }
  }
  if (img && v % 5 !== 4 && v % 5 !== 2) {
    const ih = s * .14, iw = ih * img.width / img.height;
    ctx.globalAlpha = .9; ctx.drawImage(img, x + w * .08, y + h * .08, iw, ih); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function loadImage(src) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}
