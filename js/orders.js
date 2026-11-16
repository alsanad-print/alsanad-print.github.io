/* =====================================================================
   تتبّع الطلبات — تشفير وفك تشفير
   ---------------------------------------------------------------------
   الملف العام data/orders.json لا يحتوي أي معلومة مقروءة:
   كل طلب مشفّر بمفتاح مشتق من رقم الطلب نفسه (PBKDF2 + AES-GCM)،
   فلا يمكن قراءة أي طلب إلا لمن يملك رقمه.
   بيانات الإدارة (اسم العميل، هاتفه، الملاحظات الداخلية) تُحفظ في
   data/orders-admin.enc مشفّرة بكلمة سر الطلبات.
   ===================================================================== */

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const te = new TextEncoder(), td = new TextDecoder();
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const randomSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));

export function newCode() {
  const r = crypto.getRandomValues(new Uint8Array(8));
  let s = ''; for (const b of r) s += ALPHA[b % ALPHA.length];
  return `AS-${s.slice(0, 4)}-${s.slice(4)}`;
}
export const normCode = c => (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^AS(?=.{8}$)/, '');
export const prettyCode = c => { const n = normCode(c); return n.length === 8 ? `AS-${n.slice(0, 4)}-${n.slice(4)}` : (c || '').toUpperCase(); };

async function pbkdf2(secret, saltB64, iter, bits) {
  const km = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: ub64(saltB64), iterations: iter }, km, bits));
}
const aesKey = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

export async function deriveOrder(code, saltB64, iter) {
  const bits = await pbkdf2(normCode(code), saltB64, iter, 512);
  return { h: b64(bits.slice(0, 16)), key: await aesKey(bits.slice(32, 64)) };
}
export async function seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj))));
  return { iv: b64(iv), ct: b64(ct) };
}
export async function unseal(key, { iv, ct }) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(iv) }, key, ub64(ct));
  return JSON.parse(td.decode(pt));
}

/* ---------- public lookup ---------- */
export async function lookupOrder(code, url = 'data/orders.json') {
  if (normCode(code).length !== 8) return null;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return null;
  const db = await r.json();
  const { h, key } = await deriveOrder(code, db.salt, db.iter);
  const e = (db.orders || []).find(o => o.h === h);
  if (!e) return null;
  try { return await unseal(key, e); } catch (err) { return null; }
}

/* ---------- admin ---------- */
export const PUBLIC_ITER = 100000;
export const ADMIN_ITER = 250000;
export async function passKey(pass, saltB64) { return aesKey(await pbkdf2(pass, saltB64, ADMIN_ITER, 256)); }

export function publicPayload(o) {
  return {
    code: o.code,
    t: { ar: o.title_ar || '', en: o.title_en || '', ku: o.title_ku || '' },
    s: o.stage,
    skip: o.skip || [],
    d: o.dates || {},
    n: { ar: o.note_ar || '', en: o.note_en || '', ku: o.note_ku || '' },
    u: o.updated || '',
  };
}
export async function buildPublic(orders, salt) {
  const out = [];
  for (const o of orders) {
    const { h, key } = await deriveOrder(o.code, salt, PUBLIC_ITER);
    out.push({ h, ...(await seal(key, publicPayload(o))) });
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return { v: 1, salt, iter: PUBLIC_ITER, orders: out };
}
