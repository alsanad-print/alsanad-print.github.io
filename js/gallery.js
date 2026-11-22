/* =====================================================================
   معرض الأعمال — حلقة ثلاثية الأبعاد
   الأعمال مرتبة على حلقة تدور بالسحب أو العجلة أو الأسهم،
   والعمل الأمامي يكبر ويضيء. أزرار الفئات تبدّل الحلقة بحركة سلسة.
   ===================================================================== */
import * as THREE from 'three';
import { EffectComposer } from '../lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../lib/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../lib/addons/postprocessing/OutputPass.js';
import { UI, CONFIG, pick, field } from './data.js';
import { COL, HEX, tween, killTweens, ease, damp, glowMat, canvas, canvasTex, roundRect, loadImage } from './util.js';

const $ = s => document.querySelector(s);
const CW = 2.4, CH = 1.8;            // card size (4:3)
const GAP = .55;                     // space between cards along the ring
const CAM_Y = 1.25, LOOK_Y = 1.05;

/* card shader: cover-fit image, rounded corners, dim + edge glow, optional mirror fade */
const cardVS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const cardFS = `
  uniform sampler2D uMap; uniform vec2 uScale; uniform vec2 uOff; uniform float uDim; uniform float uGlow; uniform float uMirror; uniform float uFade; uniform vec3 uEdge; uniform float uHas;
  varying vec2 vUv;
  float rbox(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
  void main(){
    vec2 uv=vUv; if(uMirror>.5) uv.y=1.-uv.y;
    vec2 p=(vUv-.5)*vec2(${CW.toFixed(2)},${CH.toFixed(2)});
    float d=rbox(p,vec2(${(CW / 2).toFixed(2)},${(CH / 2).toFixed(2)}),.07);
    float a=1.-smoothstep(-.004,.004,d);
    vec3 col=uHas>.5 ? texture2D(uMap, uv*uScale+uOff).rgb : vec3(.07,.15,.17);
    col*=uDim;
    float edge=smoothstep(.035,.0,abs(d+.012))*uGlow;
    col+=uEdge*edge*1.6;
    float alpha=a*uFade;
    if(uMirror>.5){ alpha*=smoothstep(.45,1.,vUv.y)*.28; }
    gl_FragColor=vec4(col,alpha);
    #include <colorspace_fragment>
  }`;

export class Gallery {
  constructor(renderer, { lang, isTouch, markImg, onExit, data, isOwner }) {
    this.r = renderer; this.lang = lang; this.isTouch = isTouch; this.markImg = markImg; this.onExit = onExit;
    this.data = data; this.isOwner = !!isOwner;
    this.active = false; this.filter = 'all'; this.items = []; this.cards = new Map(); this.cur = -1;
    this.rot = 0; this.rotT = 0; this.vel = 0; this.drag = null; this.tex = new Map();
  }

  /* ------------------------------------------------------------ data */
  works() { return (this.data.works || []).map((w, i) => ({ w, i })).filter(o => !o.w.sample); }
  catsOf(w) { return w.cats?.length ? w.cats : (w.cat ? [w.cat] : []); }
  usedCats() { const W = this.works(); return (this.data.categories || []).filter(c => W.some(o => this.catsOf(o.w).includes(c.id))); }
  list() { return this.works().filter(o => this.filter === 'all' || this.catsOf(o.w).includes(this.filter)); }

  /* ------------------------------------------------------------ build */
  async init() {
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061214);
    scene.fog = new THREE.Fog(0x061214, 9, 26);
    this.cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 100);

    this.composer = new EffectComposer(this.r);
    this.composer.addPass(new RenderPass(scene, this.cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .55, .7, .86);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // floor: dark glossy disc with fine grid + glow ring
    const floorM = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(COL.glow) }, uG: { value: new THREE.Color(COL.gold) }, uR: { value: 4 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform float uT,uR; uniform vec3 uC,uG; varying vec3 vW;
        void main(){ float d=length(vW.xz);
          vec2 q=vW.xz/.9; vec2 g=abs(fract(q-.5)-.5)/fwidth(q); float l=1.-min(min(g.x,g.y),1.);
          float fade=1.-smoothstep(2.,16.,d);
          float ring=exp(-pow((d-uR)*3.,2.));
          float pulse=exp(-pow((d-mod(uT*2.2,18.))*1.2,2.))*.5;
          vec3 col=uC*(l*.05*fade+pulse*.05*fade)+uC*ring*.35+uG*exp(-pow((d-uR-.35)*14.,2.))*.25;
          gl_FragColor=vec4(col*1.3, (l*.06+ring*.5+pulse*.05)*fade+.0);
        }`,
    });
    this.floorM = floorM;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), floorM);
    floor.rotation.x = -Math.PI / 2; floor.position.y = .001; scene.add(floor);
    // soft back glow
    const glowM = new THREE.MeshBasicMaterial({ map: this.radialTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55, toneMapped: false });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), glowM); glow.position.set(0, 3, -10); scene.add(glow);
    // drifting dust
    const N = 260, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 26; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = (Math.random() - .5) * 20 - 3; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(COL.glow).multiplyScalar(1.4), size: .035, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    scene.add(this.dust);

    this.ring = new THREE.Group(); scene.add(this.ring);
    this.ray = new THREE.Raycaster();
    this.bindInput();
    this.buildTabs();
    this.renderList();
    $('#gCardClose').addEventListener('click', () => this.closeCard());
    $('#gPrev').addEventListener('click', () => this.step(-1, true));
    $('#gNext').addEventListener('click', () => this.step(1, true));
    $('#gCard').addEventListener('click', e => { if (e.target.id === 'gCard') this.closeCard(); });
    $('#gList').addEventListener('click', () => this.toggleList());
    $('#gArrL').addEventListener('click', () => this.step(this.lang === 'en' ? -1 : 1));
    $('#gArrR').addEventListener('click', () => this.step(this.lang === 'en' ? 1 : -1));
    $('#gOpen').addEventListener('click', () => { const o = this.items[this.idx()]; if (o) this.openCard(o.i); });
    if (this.isOwner) $('#gAdd').style.display = '';
    this.layout(true);
  }
  radialTex() {
    const [c, x] = canvas(256, 128);
    const g = x.createRadialGradient(128, 64, 0, 128, 64, 128);
    g.addColorStop(0, 'rgba(60,196,164,.55)'); g.addColorStop(.45, 'rgba(34,150,127,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128); return canvasTex(c);
  }
  placeholderTex(o) {
    const [c, x] = canvas(640, 480);
    const g = x.createLinearGradient(0, 0, 640, 480); g.addColorStop(0, '#16454A'); g.addColorStop(1, '#0B2226');
    x.fillStyle = g; x.fillRect(0, 0, 640, 480);
    if (this.markImg) { x.globalAlpha = .12; const h = 280, w = h * this.markImg.width / this.markImg.height; x.drawImage(this.markImg, 320 - w / 2, 240 - h / 2, w, h); x.globalAlpha = 1; }
    return canvasTex(c);
  }
  getTex(o) {
    if (this.tex.has(o.i)) return this.tex.get(o.i);
    const rec = { tex: null, aspect: 4 / 3, ready: false, listeners: [] };
    this.tex.set(o.i, rec);
    loadImage(o.w.img).then(im => {
      if (!im) return;
      const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
      rec.tex = t; rec.aspect = im.width / im.height; rec.ready = true; rec.src = o.w.img;
      rec.listeners.forEach(f => f());
    });
    return rec;
  }

  makeCard(o) {
    const rec = this.getTex(o);
    const mk = mirror => new THREE.ShaderMaterial({
      vertexShader: cardVS, fragmentShader: cardFS, transparent: true, depthWrite: !mirror, side: THREE.DoubleSide,
      uniforms: { uMap: { value: null }, uScale: { value: new THREE.Vector2(1, 1) }, uOff: { value: new THREE.Vector2(0, 0) }, uDim: { value: 1 }, uGlow: { value: 0 }, uMirror: { value: mirror ? 1 : 0 }, uFade: { value: 0 }, uEdge: { value: new THREE.Color(COL.gold) }, uHas: { value: 0 } },
    });
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(CW, CH);
    const m = new THREE.Mesh(geo, mk(false)); m.position.y = CH / 2 + .32; g.add(m);
    const r = new THREE.Mesh(geo, mk(true)); r.position.y = -(CH / 2 + .32); g.add(r);
    m.userData.item = o;
    const apply = () => {
      const t = rec.tex || this.placeholderTex(o);
      const ca = CW / CH, ia = rec.ready ? rec.aspect : ca;
      const sc = ia > ca ? new THREE.Vector2(ca / ia, 1) : new THREE.Vector2(1, ia / ca);
      const off = new THREE.Vector2((1 - sc.x) / 2, (1 - sc.y) / 2);
      for (const mesh of [m, r]) { const u = mesh.material.uniforms; u.uMap.value = t; u.uScale.value.copy(sc); u.uOff.value.copy(off); u.uHas.value = 1; }
    };
    apply(); if (!rec.ready) rec.listeners.push(apply);
    this.ring.add(g);
    return { g, m, r, o, fade: 0, fadeT: 1, a: 0 };
  }

  /* place the filtered list on a ring; animate in/out */
  layout(first = false) {
    const list = this.list();
    this.items = list;
    const n = Math.max(list.length, 1);
    const circ = n * (CW + GAP);
    this.R = Math.max(4.2, circ / (2 * Math.PI));
    this.step0 = (CW + GAP) / this.R;                 // angle between cards
    this.full = n * this.step0 >= Math.PI * 2 - 1e-3;  // ring closes?
    this.floorM.uniforms.uR.value = this.R;
    const keep = new Set(list.map(o => o.i));
    for (const [i, c] of this.cards) if (!keep.has(i)) c.fadeT = 0;      // fade out
    list.forEach((o, k) => {
      let c = this.cards.get(o.i);
      if (!c) { c = this.makeCard(o); this.cards.set(o.i, c); c.fade = 0; c.a = k * this.step0 + (first ? .6 : .25); }
      c.fadeT = 1; c.k = k;
    });
    this.rot = this.rotT = 0; this.vel = 0;
    // camera distance so the front card fills nicely
    this.fit();
    this.updateCaption(true);
    $('#gEmpty').hidden = list.length > 0;
  }
  fit() {
    const aspect = innerWidth / innerHeight;
    this.cam.aspect = aspect;
    this.cam.fov = aspect < .8 ? 58 : 40;
    this.cam.updateProjectionMatrix();
    const vfov = THREE.MathUtils.degToRad(this.cam.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    // front card should take ~42% of width on desktop, ~78% on phones
    const want = aspect < .8 ? .78 : .42;
    const d = (CW * 1.12 / want) / 2 / Math.tan(hfov / 2);
    this.camZ = this.R + Math.max(d, 3.2);
  }

  /* ------------------------------------------------------------ input */
  idx() { const n = this.items.length; if (!n) return -1; const k = Math.round(this.rot / this.step0); return ((k % n) + n) % n; }
  clampT(v) { if (this.full) return v; const max = (this.items.length - 1) * this.step0; return Math.max(-.25, Math.min(max + .25, v)); }
  step(d, withCard = false) {
    const n = this.items.length; if (!n) return;
    let k = Math.round(this.rotT / this.step0) + d;
    if (!this.full) k = Math.max(0, Math.min(n - 1, k));
    this.rotT = k * this.step0; this.vel = 0;
    this.hideHint();
    if (withCard) { const o = this.items[((k % n) + n) % n]; this.openCard(o.i, true); }
  }
  goToItem(i) {
    const k = this.items.findIndex(o => o.i === i); if (k < 0) return;
    const n = this.items.length, cur = Math.round(this.rotT / this.step0);
    let target = k;
    if (this.full) { const base = cur - (((cur % n) + n) % n); target = base + k; if (target - cur > n / 2) target -= n; if (cur - target > n / 2) target += n; }
    this.rotT = target * this.step0;
  }
  bindInput() {
    const el = this.r.domElement;
    el.addEventListener('pointerdown', e => {
      if (!this.active) return;
      this.drag = { x: e.clientX, y: e.clientY, t: performance.now(), r0: this.rotT, lastX: e.clientX, lastT: performance.now(), moved: 0 };
      el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (!this.active) return;
      if (this.drag) {
        const dx = e.clientX - this.drag.x; this.drag.moved = Math.max(this.drag.moved, Math.abs(dx));
        const k = (this.lang === 'en' ? -1 : 1) * 2.2 / innerWidth * (this.isTouch ? 1.4 : 1);
        this.rotT = this.clampT(this.drag.r0 + dx * k * (this.step0 * 3.2));
        const now = performance.now(); const dt = Math.max(1, now - this.drag.lastT);
        this.vel = (e.clientX - this.drag.lastX) / dt * k * this.step0 * 3.2 * 16; this.drag.lastX = e.clientX; this.drag.lastT = now;
        if (this.drag.moved > 6) this.hideHint();
      } else if (!this.isTouch) {
        const hit = this.pick(e); document.body.classList.toggle('hovering', !!hit);
      }
    });
    const up = e => {
      if (!this.active || !this.drag) return;
      const d = this.drag; this.drag = null;
      if (d.moved < 6 && performance.now() - d.t < 500) {
        const hit = this.pick(e);
        if (hit) { if (hit.i === this.items[this.idx()]?.i) this.openCard(hit.i); else this.goToItem(hit.i); }
        return;
      }
      // inertia then snap
      this.rotT = this.clampT(this.rotT + this.vel * 6);
      this.rotT = Math.round(this.rotT / this.step0) * this.step0; this.vel = 0;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { this.drag = null; });
    let wheelLock = 0;
    el.addEventListener('wheel', e => {
      if (!this.active) return;
      const now = performance.now(); if (now < wheelLock) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 4) return;
      wheelLock = now + 260; this.step(d > 0 ? 1 : -1);
    }, { passive: true });
    addEventListener('keydown', e => {
      if (!this.active) return;
      const cardOpen = $('#gCard').classList.contains('open');
      if (e.key === 'Escape') { if (cardOpen) this.closeCard(); else if ($('#gListView').classList.contains('open')) this.toggleList(false); else this.onExit(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const fwd = (e.key === 'ArrowLeft') === (this.lang !== 'en');
        this.step(fwd ? 1 : -1, cardOpen);
      }
      if (e.key === 'Enter' && !cardOpen) { const o = this.items[this.idx()]; if (o) this.openCard(o.i); }
    });
  }
  ndc(e) { const r = this.r.domElement.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  pick(e) {
    this.ray.setFromCamera(this.ndc(e), this.cam);
    const meshes = [...this.cards.values()].filter(c => c.fadeT > 0).map(c => c.m);
    const h = this.ray.intersectObjects(meshes, false)[0];
    return h ? h.object.userData.item : null;
  }

  /* ------------------------------------------------------------ UI */
  buildTabs() {
    const wrap = $('#gTabs'); wrap.innerHTML = '';
    const mk = (id, label, n) => { const b = document.createElement('button'); b.dataset.id = id; b.innerHTML = `${label}<i>${n}</i>`; wrap.appendChild(b); };
    mk('all', UI[this.lang].all, this.works().length);
    this.usedCats().forEach(c => mk(c.id, pick(c, this.lang), this.works().filter(o => this.catsOf(o.w).includes(c.id)).length));
    wrap.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.dataset.id === this.filter) return;
      this.filter = b.dataset.id; this.markTabs();
      if ($('#gListView').classList.contains('open')) { this.renderList(); return; }
      this.closeCard(true); this.layout();
    };
    this.markTabs();
  }
  markTabs() { document.querySelectorAll('#gTabs button').forEach(b => b.classList.toggle('on', b.dataset.id === this.filter)); }
  catLabel(w) { return this.catsOf(w).map(id => (this.data.categories || []).find(c => c.id === id)).filter(Boolean).map(c => pick(c, this.lang)); }
  client(w) { return (this.data.clients || []).find(c => c.id === w.client); }
  cName(c) { return c ? (c['name_' + this.lang] || c.name_ar || c.name || '') : ''; }
  updateCaption(force) {
    const k = this.idx(); if (k === this._capK && !force) return; this._capK = k;
    const cap = $('#gCap'), o = this.items[k];
    if (!o) { cap.classList.remove('on'); return; }
    cap.classList.remove('on');
    clearTimeout(this._capT);
    this._capT = setTimeout(() => {
      const c = this.client(o.w), u = UI[this.lang], n = this.items.length;
      $('#gCapNo').textContent = `${String(k + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
      $('#gCapClient').innerHTML = c ? `${c.logo ? `<img src="${c.logo}" alt="">` : ''}<span>${this.cName(c)}</span>` : '';
      $('#gCapTitle').textContent = field(o.w, 'title', this.lang);
      $('#gCapTags').innerHTML = [...this.catLabel(o.w), field(o.w, 'area', this.lang)].filter(Boolean).map(t => `<span>${t}</span>`).join('');
      cap.classList.add('on');
    }, force ? 60 : 140);
  }
  renderList() {
    const items = this.list();
    $('#gGrid').innerHTML = items.map(o => {
      const c = this.client(o.w);
      return `<button class="g-item" data-i="${o.i}"><img src="${o.w.img}" alt="" loading="lazy"><div><b>${field(o.w, 'title', this.lang)}</b><small>${c ? this.cName(c) + ' · ' : ''}${this.catLabel(o.w).join('، ')}</small></div></button>`;
    }).join('');
    $('#gGrid').onclick = e => { const b = e.target.closest('.g-item'); if (!b) return; const i = +b.dataset.i; this.toggleList(false); this.goToItem(i); setTimeout(() => this.openCard(i), 450); };
  }
  toggleList(force) {
    const el = $('#gListView'); const open = force ?? !el.classList.contains('open');
    el.classList.toggle('open', open);
    if (open) { this.closeCard(true); this.renderList(); }
    const u = UI[this.lang];
    $('#gList span').textContent = open ? u.roomView : u.listView;
  }
  openCard(i, keepRing) {
    const o = this.data.works[i]; if (!o) return;
    if (!keepRing) this.goToItem(i);
    this.cur = i;
    const u = UI[this.lang], box = $('#gMedia');
    if (o.video) box.innerHTML = `<video src="${o.video}" poster="${o.img}" controls autoplay muted playsinline loop></video>`;
    else box.innerHTML = `<img src="${o.img}" alt="">`;
    window.__track?.('work-' + (o.id || i));
    const kind = o.kind === 'design' ? 'design' : 'build';
    $('#gCat').textContent = [...this.catLabel(o), u[kind]].join(' · ');
    const cl = this.client(o), ge = $('#gClient');
    ge.hidden = !cl;
    if (cl) { ge.href = 'projects/#c-' + encodeURIComponent(cl.id); ge.innerHTML = (cl.logo ? `<img src="${cl.logo}" alt="">` : '') + `<span>${this.cName(cl)}</span>`; }
    $('#gFull').href = 'projects/#p-' + encodeURIComponent(o.id || '');
    $('#gTitle').textContent = field(o, 'title', this.lang);
    $('#gArea').textContent = field(o, 'area', this.lang);
    $('#gDesc').textContent = field(o, 'desc', this.lang);
    const ask = $('#gAsk');
    if (CONFIG.whatsapp) {
      const msg = encodeURIComponent(({ ar: 'مرحباً، أودّ الاستفسار عن عمل مشابه لـ: ', en: 'Hello, I would like to inquire about a project similar to: ', ku: 'سڵاو، دەمەوێت پرسیار بکەم دەربارەی کارێکی هاوشێوەی: ' }[this.lang]) + field(o, 'title', this.lang));
      ask.href = `https://wa.me/${CONFIG.whatsapp}?text=${msg}`; ask.style.display = ''; ask.querySelector('span').textContent = u.inquire;
    } else ask.style.display = 'none';
    $('#gCard').classList.add('open');
  }
  closeCard(silent) { $('#gCard').classList.remove('open'); $('#gMedia').querySelector('video')?.pause(); if (!silent) this.cur = -1; }
  hideHint() { $('#gHint').style.opacity = 0; }
  lowQuality(severe) { this.r.setPixelRatio(1); this.composer.setSize(innerWidth, innerHeight); if (severe) this.bloom.enabled = false; }

  /* ------------------------------------------------------------ lifecycle */
  setLang(l) {
    this.lang = l;
    if (!this.scene) return;
    this.buildTabs(); this.renderList(); this.updateCaption(true);
    const u = UI[l];
    $('#gHint').textContent = this.isTouch ? u.galleryHintTouch : u.galleryHintDesk;
    $('#gOpen span').textContent = u.viewWork;
    $('#gList span').textContent = $('#gListView').classList.contains('open') ? u.roomView : u.listView;
    if ($('#gCard').classList.contains('open') && this.cur >= 0) this.openCard(this.cur, true);
  }
  enter() {
    this.active = true;
    const u = UI[this.lang];
    $('#gHint').textContent = this.isTouch ? u.galleryHintTouch : u.galleryHintDesk;
    $('#gOpen span').textContent = u.viewWork;
    $('#gHint').style.opacity = 1;
    clearTimeout(this._ht); this._ht = setTimeout(() => this.hideHint(), 6000);
    // intro: cards sweep in
    for (const c of this.cards.values()) { c.fade = 0; c.a = (c.k ?? 0) * this.step0 + .7; }
    this.camZoom = 1.35;
    this.updateCaption(true);
  }
  leave() {
    this.active = false;
    this.closeCard(); this.toggleList(false);
    document.body.classList.remove('hovering');
    $('#gCap').classList.remove('on');
  }
  resize() {
    if (!this.cam) return;
    this.fit();
    this.composer.setSize(innerWidth, innerHeight);
    this.bloom.resolution.set(innerWidth / 2, innerHeight / 2);
  }
  update(dt, t) {
    if (!this.drag) this.rot = damp(this.rot, this.rotT, 7, dt); else this.rot = damp(this.rot, this.rotT, 18, dt);
    this.camZoom = damp(this.camZoom ?? 1, 1, 2.2, dt);
    const sign = this.lang === 'en' ? 1 : -1;      // RTL: next item comes from the left
    const n = this.items.length;
    for (const [i, c] of this.cards) {
      c.fade = damp(c.fade, c.fadeT, c.fadeT ? 5 : 8, dt);
      if (c.fadeT === 0 && c.fade < .02) { this.ring.remove(c.g); this.cards.delete(i); continue; }
      const target = (c.k ?? 0) * this.step0;
      c.a = damp(c.a, target, 6, dt);
      // relative angle to the front, wrapped
      let rel = c.a - this.rot;
      if (this.full) { const T = n * this.step0; rel = ((rel % T) + T * 1.5) % T - T / 2; }
      const ang = rel * sign;
      c.g.position.set(Math.sin(ang) * this.R, 0, Math.cos(ang) * this.R);
      c.g.rotation.y = ang;
      const front = Math.max(0, 1 - Math.abs(rel) / (this.step0 * 1.2));
      const s = (.86 + front * .22) * (.6 + c.fade * .4);
      c.g.scale.setScalar(s);
      c.g.position.y = front * .08 + Math.sin(t * 1.2 + i) * .02;
      const vis = Math.max(0, 1 - Math.abs(rel) / 2.4);
      for (const mesh of [c.m, c.r]) {
        const u = mesh.material.uniforms;
        u.uDim.value = .42 + front * .68;
        u.uGlow.value = front * front;
        u.uFade.value = c.fade * vis;
      }
      c.g.visible = vis > .01;
    }
    const z = this.camZ * this.camZoom;
    this.cam.position.set(Math.sin(t * .15) * .25, CAM_Y + Math.sin(t * .3) * .04, z);
    this.cam.lookAt(0, LOOK_Y, this.R * .55);
    this.floorM.uniforms.uT.value = t;
    this.dust.rotation.y = t * .01;
    if (this.active) this.updateCaption();
    this.composer.render();
  }
}
