/* =====================================================================
   العرض المبسّط — صفحة مؤسسية كاملة بدون ثري دي
   تُستخدم: (1) للأجهزة التي لا تدعم WebGL، (2) لمن يختار «عرض مبسّط»،
   (3) كمحتوى نصي تقرؤه محركات البحث.
   ===================================================================== */
import { CONFIG, STATIONS, UI, JOURNEY, LANGS, pick, field } from './data.js';
import { lookupOrder, prettyCode, normCode } from './orders.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SVC = ['office', 'print', 'workshop', 'delivery', 'install'];

export function classicHTML(lang, data, hasGL = true) {
  const u = UI[lang];
  const cats = data.categories || [];
  const works = (data.works || []).filter(w => !w.sample);
  const clients = (data.clients || []).filter(c => c.logo && c.strip !== false);
  const map = CONFIG.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapQuery)}`;
  const year = new Date().getFullYear();
  return `
  <header class="cl-top">
    <img class="cl-logo" src="assets/logo-secondary-white.png" alt="${esc(u.brand)}">
    <nav class="cl-nav">
      <a href="#c-services">${esc(u.services)}</a>
      <a href="#c-work">${esc(u.gallery)}</a>
      <a href="#c-track">${esc(u.trackTitle)}</a>
      <a href="#c-contact">${esc(u.contact)}</a>
    </nav>
    <div class="cl-tools">
      <div class="cl-langs">${LANGS.map(l => `<button data-cl-lang="${l.id}" class="${l.id === lang ? 'on' : ''}">${l.short}</button>`).join('')}</div>
      ${hasGL ? `<button class="btn btn-gold" data-act="full-view" title="${esc(u.fullView)}"><span class="fv-l">${esc(u.fullView)}</span><span class="fv-s">3D</span></button>` : ''}
    </div>
  </header>

  <section class="cl-hero">
    <em>AL-SANAD ADVERTISING</em>
    <h1>${esc(u.heroTitle)}</h1>
    <p>${esc(u.heroSub)}</p>
    <div class="cl-cta">
      <a class="btn btn-gold" href="order/">${esc(u.orderFull)}</a>
      ${CONFIG.whatsapp ? `<a class="btn btn-wa" href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener"><span>${esc(u.whatsapp)}</span></a>` : ''}
      <a class="btn" href="#c-track">${esc(u.trackTitle)}</a>
    </div>
  </section>

  <section class="cl-sec" id="c-services">
    <div class="cl-head"><em>01</em><h2>${esc(u.services)}</h2></div>
    <div class="cl-svc">
      ${SVC.map(id => { const s = pick(STATIONS[id], lang); return `
      <article class="cl-card">
        <span class="no">${STATIONS[id].no}</span>
        <h3>${esc(s.title)}</h3>
        <p class="tag">${esc(s.tag)}</p>
        <p>${esc(s.desc)}</p>
        <ul>${(s.points || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      </article>`; }).join('')}
    </div>
  </section>

  <section class="cl-sec" id="c-work">
    <div class="cl-head"><em>02</em><h2>${esc(u.gallery)}</h2></div>
    <p style="margin:-8px 0 18px"><a class="btn" href="projects/">${esc(u.allProjects || '')} →</a></p>
    ${works.length ? `
    <div class="cl-filters"><button class="on" data-f="all">${esc(u.all)}</button>${cats.filter(c => works.some(w => (w.cats || [w.cat]).includes(c.id))).map(c => `<button data-f="${esc(c.id)}">${esc(pick(c, lang))}</button>`).join('')}</div>
    <div class="cl-grid">
      ${works.map((w, i) => { const c = cats.find(x => x.id === (w.cats || [w.cat])[0]); return `
      <button class="cl-w" data-cat="${esc((w.cats || [w.cat]).join(' '))}" data-i="${i}">
        <img src="${esc(w.img)}" alt="${esc(field(w, 'title', lang))}" loading="lazy">
        ${w.before ? `<span class="cl-badge">${esc(u.before)} / ${esc(u.after)}</span>` : w.video ? `<span class="cl-badge">▶ ${esc(u.video)}</span>` : ''}
        <span class="cl-w-t"><b>${esc(field(w, 'title', lang))}</b><small>${esc(c ? pick(c, lang) : '')} · ${esc(field(w, 'area', lang))}</small></span>
      </button>`; }).join('')}
    </div>` : `<p class="cl-muted">${esc(u.soon)}</p>`}
  </section>

  <section class="cl-sec" id="c-track">
    <div class="cl-head"><em>03</em><h2>${esc(u.trackTitle)}</h2></div>
    <p class="cl-muted">${esc(u.trackSub)}</p>
    <form class="cl-track" id="clTrack"><input dir="ltr" placeholder="${esc(u.trackPh)}" autocomplete="off"><button class="btn btn-gold">${esc(u.trackGo)}</button></form>
    <p class="cl-err" id="clTrackErr"></p>
    <div id="clTrackOut"></div>
  </section>

  ${clients.length ? `
  <section class="cl-sec">
    <div class="cl-head"><em>04</em><h2>${esc(u.clients)}</h2></div>
    <div class="cl-clients">${clients.map(c => `<img src="${esc(c.logo)}" alt="${esc(c['name_' + lang] || c.name_ar || c.name)}" loading="lazy">`).join('')}</div>
  </section>` : ''}

  <section class="cl-sec" id="c-contact">
    <div class="cl-head"><em>${clients.length ? '05' : '04'}</em><h2>${esc(u.contact)}</h2></div>
    <div class="cl-contact">
      <div><small>${esc(u.cOffice)}</small><b>${esc(pick(CONFIG.address, lang))}</b><a href="${map}" target="_blank" rel="noopener">${esc(u.cMap)} ↗</a></div>
      ${CONFIG.workshopMap ? `<div><small>${esc(u.cWorkshop)}</small><a href="${CONFIG.workshopMap}" target="_blank" rel="noopener">${esc(u.viewMap)} ↗</a></div>` : ''}
      <div><small>${esc(u.cHours)}</small><b>${esc(pick(CONFIG.hours, lang))}</b></div>
      <div><small>${esc(u.cPhone)}</small><b><bdi dir="ltr">${esc(CONFIG.phoneDisplay)}</bdi></b>${CONFIG.whatsapp ? `<a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">${esc(u.whatsapp)} ↗</a>` : ''}</div>
      ${CONFIG.phone2 ? `<div><small>${esc(u.cPhone2)}</small><b><a href="tel:${CONFIG.phone2}"><bdi dir="ltr">${esc(CONFIG.phone2Display)}</bdi></a></b></div>` : ''}
      <div><small>${esc(u.cFollow)}</small>
        ${CONFIG.instagram ? `<a href="https://www.instagram.com/${CONFIG.instagram}/" target="_blank" rel="noopener">Instagram · <bdi dir="ltr">@${esc(CONFIG.instagram)}</bdi></a>` : ''}
        ${CONFIG.tiktok ? `<a href="https://www.tiktok.com/@${CONFIG.tiktok}" target="_blank" rel="noopener">TikTok · <bdi dir="ltr">@${esc(CONFIG.tiktok)}</bdi></a>` : ''}
      </div>
    </div>
  </section>

  <footer class="cl-foot">© ${year} ${esc(u.brand)} — ${esc(u.rights)}</footer>

  <div class="cl-lb" id="clLb" hidden><div class="cl-lb-box"><button class="cl-x" data-lb-close>×</button><div id="clLbBody"></div></div></div>`;
}

function timelineHTML(o, lang) {
  const u = UI[lang], skip = new Set(o.skip || []); const st = Math.max(1, Math.min(6, +o.s || 1));
  return `<div class="cl-order"><small>${esc(u.orderNo)} <bdi dir="ltr">${esc(prettyCode(o.code))}</bdi></small><h3>${esc(pick(o.t, lang))}</h3>
  <p>${esc(st >= 6 ? u.orderComplete : u.orderCurrent + ': ' + pick(JOURNEY[st - 1], lang)[0])}</p>
  <ol class="tl">${JOURNEY.map((j, k) => { const n = k + 1; const c = skip.has(j.id) ? 'skip' : st > n ? 'done' : st === n ? 'now' : 'next';
    return `<li class="${c}"><i></i><b>${esc(pick(j, lang)[0])}</b><span>${esc({ skip: u.stSkip, done: u.stDone, now: u.stNow, next: u.stNext }[c])}${o.d?.[n] && c !== 'skip' ? ' · ' + esc(o.d[n]) : ''}</span></li>`; }).join('')}</ol>
  ${pick(o.n, lang) ? `<p class="tl-note">${esc(pick(o.n, lang))}</p>` : ''}</div>`;
}

export function renderClassic(el, { lang, data, onLang, hasGL = true }) {
  if (!el) return;
  el.innerHTML = classicHTML(lang, data, hasGL);
  const u = UI[lang];
  const works = (data.works || []).filter(w => !w.sample);
  el.querySelectorAll('[data-cl-lang]').forEach(b => b.addEventListener('click', () => onLang?.(b.dataset.clLang)));
  el.querySelectorAll('.cl-filters button').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('.cl-filters button').forEach(x => x.classList.toggle('on', x === b));
    el.querySelectorAll('.cl-w').forEach(w => { w.hidden = b.dataset.f !== 'all' && !w.dataset.cat.split(' ').includes(b.dataset.f); });
  }));
  const lb = el.querySelector('#clLb'), lbBody = el.querySelector('#clLbBody');
  el.querySelectorAll('.cl-w').forEach(b => b.addEventListener('click', () => {
    const w = works[+b.dataset.i];
    let media = `<img src="${esc(w.img)}" alt="">`;
    if (w.video) media = `<video src="${esc(w.video)}" poster="${esc(w.img)}" controls autoplay muted playsinline loop></video>`;
    else if (w.before) media = `<div class="cmp" style="--p:50%"><img src="${esc(w.img)}" alt=""><div class="cmp-b"><img src="${esc(w.before)}" alt=""></div><input type="range" min="0" max="100" value="50" aria-label="${esc(u.before)}/${esc(u.after)}"><span class="cmp-l">${esc(u.before)}</span><span class="cmp-r">${esc(u.after)}</span></div>`;
    lbBody.innerHTML = `${media}<div class="cl-lb-t"><b>${esc(field(w, 'title', lang))}</b><small>${esc(field(w, 'area', lang))}</small>${field(w, 'desc', lang) ? `<p>${esc(field(w, 'desc', lang))}</p>` : ''}</div>`;
    const r = lbBody.querySelector('.cmp input'); if (r) r.addEventListener('input', () => r.parentElement.style.setProperty('--p', r.value + '%'));
    lb.hidden = false;
  }));
  lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('[data-lb-close]')) { lb.hidden = true; lbBody.innerHTML = ''; } });
  const f = el.querySelector('#clTrack');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const inp = f.querySelector('input'), btn = f.querySelector('button'), err = el.querySelector('#clTrackErr'), out = el.querySelector('#clTrackOut');
    err.textContent = ''; out.innerHTML = '';
    if (normCode(inp.value).length !== 8) { err.textContent = u.trackNotFound; return; }
    btn.disabled = true; btn.textContent = u.trackChecking;
    let o = null; try { o = await lookupOrder(inp.value); } catch (x) {}
    btn.disabled = false; btn.textContent = u.trackGo;
    if (!o) { err.textContent = u.trackNotFound; return; }
    out.innerHTML = timelineHTML(o, lang);
  });
}
