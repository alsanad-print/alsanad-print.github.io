import * as THREE from 'three';
import { EffectComposer } from '../lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../lib/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../lib/addons/postprocessing/OutputPass.js';
import { UI, CONFIG, pick, field } from './data.js';
import { COL, HEX, tween, killTweens, ease, damp, std, glowMat, canvas, canvasTex, roundRect, loadImage } from './util.js';

const $ = s => document.querySelector(s);
const EYE = 1.65, H = 5.4, SPACING = 3.5;

export class Gallery {
  constructor(renderer, { lang, isTouch, markImg, onExit, data, isOwner }) {
    this.isOwner = !!isOwner; this.videos = [];
    this.data = data; this.r = renderer; this.lang = lang; this.isTouch = isTouch; this.markImg = markImg; this.onExit = onExit;
    this.active = false; this.yaw = 0; this.pitch = 0; this.keys = {};
    this.frames = []; this.walls = []; this.cur = -1; this.filter = 'all';
  }

  /* ------------------------------------------------------------ build */
  async init() {
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071315);
    scene.fog = new THREE.Fog(0x071315, 14, 34);
    const cam = this.cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, .05, 120);
    cam.rotation.order = 'YXZ';

    this.composer = new EffectComposer(this.r);
    this.composer.addPass(new RenderPass(scene, cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .6, .6, .9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    scene.add(new THREE.HemisphereLight(0xDDF7F0, 0x0A1A1C, 1.1));
    const key = new THREE.PointLight(0xFFF2DD, 30, 30, 1.6); key.position.set(0, H - .4, 0); scene.add(key);

    // works grouped by category
    const cats = this.data.categories.map(c => ({ ...c, items: this.data.works.map((w, i) => ({ w, i })).filter(o => o.w.cat === c.id) }));
    this.cats = cats;
    const N = Math.max(4, cats.length);
    const maxN = Math.max(3, ...cats.map(c => c.items.length));
    const L = this.L = Math.max(12, maxN * SPACING + 3);
    const a = this.apothem = L / (2 * Math.tan(Math.PI / N));
    this.N = N;

    // materials
    const wallM = std(0x16302F, .92);
    const floorM = std(0x0C1B1E, .38, .15);
    const ceilM = std(0x0A1719, .9);
    const glow = glowMat(COL.glow, 2.2);
    const goldG = glowMat(COL.gold, 2.4);

    // floor + ceiling
    const circR = a / Math.cos(Math.PI / N) + 1;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(circR, N, Math.PI / 2 + Math.PI / N), floorM);
    floor.rotation.x = -Math.PI / 2; floor.name = 'floor'; scene.add(floor); this.floor = floor;
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(circR, N, Math.PI / 2 + Math.PI / N), ceilM);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);
    // floor grid inlay
    const gridM = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      uniforms: { uC: { value: new THREE.Color(COL.glow) }, uT: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform vec3 uC; uniform float uT; varying vec3 vW;
        void main(){ vec2 q=vW.xz/1.5; vec2 g=abs(fract(q-.5)-.5)/fwidth(q); float l=1.-min(min(g.x,g.y),1.);
          float d=length(vW.xz); float ring=exp(-pow((d-mod(uT*2.5,18.))*1.4,2.));
          gl_FragColor=vec4(uC*1.4, l*.07+ring*.1*l+ring*.03); }`,
    });
    this.gridM = gridM;
    const grid = new THREE.Mesh(new THREE.CircleGeometry(circR, N, Math.PI / 2 + Math.PI / N), gridM);
    grid.rotation.x = -Math.PI / 2; grid.position.y = .005; scene.add(grid);
    // center inlay
    const ringIn = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.54, 64), glowMat(COL.glow, 1.3)); ringIn.rotation.x = -Math.PI / 2; ringIn.position.y = .01; scene.add(ringIn);
    const ringIn2 = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.765, 64), glowMat(COL.gold, 1.3)); ringIn2.rotation.x = -Math.PI / 2; ringIn2.position.y = .01; scene.add(ringIn2);
    if (this.markImg) {
      const mt = new THREE.Texture(this.markImg); mt.colorSpace = THREE.SRGBColorSpace; mt.needsUpdate = true;
      const floorLogo = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4 * this.markImg.height / this.markImg.width), new THREE.MeshBasicMaterial({ map: mt, transparent: true, opacity: .1, depthWrite: false }));
      floorLogo.rotation.x = -Math.PI / 2; floorLogo.position.y = .012; scene.add(floorLogo);
      // hanging mark
      const hang = this.hang = new THREE.Group(); hang.position.set(0, H - 1.1, 0); scene.add(hang);
      const hm = new THREE.MeshBasicMaterial({ map: mt, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
      hm.color.set(COL.glow).multiplyScalar(1.8);
      hang.add(new THREE.Mesh(new THREE.PlaneGeometry(.8, .8 * this.markImg.height / this.markImg.width), hm));
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.1, .025, 8, 80), goldG); r1.rotation.x = Math.PI / 2; r1.position.y = .65; hang.add(r1);
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.6, .02, 8, 96), glow); r2.rotation.x = Math.PI / 2; r2.position.y = .75; hang.add(r2);
    }

    // walls
    for (let i = 0; i < N; i++) {
      const th = i * Math.PI * 2 / N;
      const out = new THREE.Vector3(Math.sin(th), 0, -Math.cos(th)); // from center to wall
      const inN = out.clone().negate();
      const c = out.clone().multiplyScalar(a);
      const tan = new THREE.Vector3(Math.cos(th), 0, Math.sin(th)); // along wall, left→right when facing it
      const wall = new THREE.Mesh(new THREE.BoxGeometry(L + .6, H, .3), wallM);
      wall.position.copy(c).addScaledVector(out, .15); wall.position.y = H / 2; wall.rotation.y = -th; scene.add(wall);
      // base + top light strips
      const base = new THREE.Mesh(new THREE.BoxGeometry(L, .04, .06), glow); base.position.copy(c).addScaledVector(inN, .05); base.position.y = .06; base.rotation.y = -th; scene.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(L, .05, .08), glowMat(COL.white, 1.05)); top.position.copy(c).addScaledVector(inN, .08); top.position.y = H - .25; top.rotation.y = -th; scene.add(top);
      this.walls.push({ c, out, inN, tan, th });
    }

    // titles + frames
    const loads = [];
    cats.forEach((cat, ci) => {
      const wl = this.walls[ci]; if (!wl) return;
      // title
      const [tc, tx] = canvas(1024, 256);
      tx.textAlign = 'center'; tx.textBaseline = 'middle';
      tx.fillStyle = '#fff'; tx.direction = 'rtl'; tx.font = '800 104px "Baloo Bhaijaan 2", sans-serif'; tx.fillText(cat.ar, 512, 100);
      tx.direction = 'ltr'; tx.fillStyle = HEX.gold; tx.font = '700 38px Montserrat, sans-serif'; tx.fillText(cat.en.toUpperCase(), 512, 196);
      const title = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshBasicMaterial({ map: canvasTex(tc), transparent: true, toneMapped: false, color: 0xbbbbbb }));
      title.position.copy(wl.c).addScaledVector(wl.inN, .17); title.position.y = H - .95; title.rotation.y = -wl.th; this.scene.add(title);

      const n = cat.items.length;
      if (!n) {
        const [sc, sx] = canvas(1024, 160); sx.textAlign = 'center'; sx.textBaseline = 'middle';
        sx.fillStyle = 'rgba(255,255,255,.55)'; sx.direction = 'rtl'; sx.font = '700 56px "Baloo Bhaijaan 2", sans-serif'; sx.fillText(UI.ar.soon, 512, 56);
        sx.direction = 'ltr'; sx.font = '600 30px Montserrat, sans-serif'; sx.fillText(UI.en.soon.toUpperCase(), 512, 122);
        const soon = new THREE.Mesh(new THREE.PlaneGeometry(4.4, .7), new THREE.MeshBasicMaterial({ map: canvasTex(sc), transparent: true }));
        soon.position.copy(wl.c).addScaledVector(wl.inN, .17); soon.position.y = 2.2; soon.rotation.y = -wl.th; this.scene.add(soon);
      }
      cat.items.forEach((o, j) => {
        const off = (j - (n - 1) / 2) * SPACING;
        const p = wl.c.clone().addScaledVector(wl.tan, off).addScaledVector(wl.inN, .2); p.y = 2.15;
        const fr = this.makeFrame(o, cat, j, p, wl);
        loads.push(fr.ready);
      });
    });
    await Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 6000))]);

    this.ray = new THREE.Raycaster();
    this.bindInput();
    this.buildTabs();
    this.buildList();
    if (this.isOwner) { const a = $('#gAdd'); a.style.display = ''; }
    $('#gCardClose').addEventListener('click', () => this.closeCard());
    $('#gPrev').addEventListener('click', () => this.step(-1));
    $('#gNext').addEventListener('click', () => this.step(1));
    $('#gCard').addEventListener('click', e => { if (e.target.id === 'gCard') this.closeCard(); });
    $('#gList').addEventListener('click', () => this.toggleList());
  }

  placeholder(o, cat, j) {
    const [c, x] = canvas(800, 600);
    const g = x.createLinearGradient(0, 0, 800, 600); g.addColorStop(0, '#22967F'); g.addColorStop(1, '#0B2A25');
    x.fillStyle = g; x.fillRect(0, 0, 800, 600);
    x.strokeStyle = 'rgba(60,196,164,.12)'; x.lineWidth = 1;
    for (let i = 0; i <= 16; i++) { x.beginPath(); x.moveTo(i * 50, 0); x.lineTo(i * 50, 600); x.stroke(); }
    for (let i = 0; i <= 12; i++) { x.beginPath(); x.moveTo(0, i * 50); x.lineTo(800, i * 50); x.stroke(); }
    if (this.markImg) { x.globalAlpha = .14; const h = 380, w = h * this.markImg.width / this.markImg.height; x.drawImage(this.markImg, 400 - w / 2, 300 - h / 2, w, h); x.globalAlpha = 1; }
    x.strokeStyle = HEX.gold; x.lineWidth = 3; x.setLineDash([14, 10]); roundRect(x, 40, 40, 720, 520, 24); x.stroke(); x.setLineDash([]);
    x.textAlign = 'center'; x.fillStyle = '#fff'; x.direction = 'rtl';
    x.font = '800 64px "Baloo Bhaijaan 2", sans-serif'; x.fillText(o.w.title_ar || cat.ar, 400, 280);
    x.fillStyle = HEX.gold; x.font = '700 30px "Baloo Bhaijaan 2", sans-serif'; x.fillText(UI.ar.placeholder + ' · ' + cat.ar, 400, 350);
    x.direction = 'ltr'; x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '600 22px Montserrat, sans-serif'; x.fillText(o.w.img, 400, 520);
    return c;
  }

  makeFrame(o, cat, j, p, wl) {
    const g = new THREE.Group(); g.position.copy(p); g.rotation.y = -wl.th; this.scene.add(g);
    const fr = { g, o, cat, wl, idx: o.i, src: null, w: 2.4, h: 1.8 };
    this.frames[o.i] = fr;
    const backM = std(0xF2F6F5, .5);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .07), backM); g.add(back);
    const imgM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const img = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), imgM); img.position.z = .04; g.add(img);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(1, .03, .03), glowMat(COL.gold, 2)); g.add(edge);
    // plaque
    const [pc, px] = canvas(512, 128);
    const plaqueM = new THREE.MeshBasicMaterial({ map: canvasTex(pc), transparent: true });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.0, .5), plaqueM); g.add(plaque);
    fr.drawPlaque = () => {
      px.clearRect(0, 0, 512, 128);
      px.fillStyle = 'rgba(8,20,22,.85)'; roundRect(px, 0, 0, 512, 128, 18); px.fill();
      const rtl = this.lang !== 'en';
      px.fillStyle = HEX.gold; px.fillRect(rtl ? 500 : 0, 22, 12, 84);
      px.direction = rtl ? 'rtl' : 'ltr'; px.textAlign = rtl ? 'right' : 'left';
      const xx = rtl ? 478 : 34;
      const F = { ar: ['800 44px "Baloo Bhaijaan 2"', '700 28px "Baloo Bhaijaan 2"'], ku: ['700 36px "Noto Kufi Arabic"', '500 24px "Noto Kufi Arabic"'], en: ['700 36px Montserrat', '600 24px Montserrat'] }[this.lang];
      px.fillStyle = '#fff'; px.font = F[0] + ', sans-serif';
      px.fillText(field(o.w, 'title', this.lang), xx, 58);
      px.fillStyle = HEX.glow; px.font = F[1] + ', sans-serif';
      const tag = o.w.video ? '▶ ' + UI[this.lang].video + '  ·  ' : o.w.before ? UI[this.lang].before + ' / ' + UI[this.lang].after + '  ·  ' : '';
      px.fillText(tag + '◉ ' + field(o.w, 'area', this.lang), xx, 100);
      plaqueM.map.needsUpdate = true;
    };
    fr.drawPlaque();
    // fake spotlight cone + floor pool
    const coneM = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { uC: { value: new THREE.Color(0xFFF1D6) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uC; varying vec2 vUv; void main(){ float a=pow(vUv.y,2.0)*.065; gl_FragColor=vec4(uC,a); }',
    });
    const topY = H - .6 - 2.15, hc = H - .9;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(.08, 1.35, hc, 32, 1, true), coneM);
    cone.position.set(0, topY - hc / 2, .75); g.add(cone);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, .2, 16), glowMat(0xFFF1D6, 2.5)); lamp.position.set(0, topY, .75); g.add(lamp);

    const layout = (aspect) => {
      let w = 2.6, h = w / aspect; if (h > 1.95) { h = 1.95; w = h * aspect; }
      fr.w = w; fr.h = h;
      back.scale.set(w + .18, h + .18, 1); img.scale.set(w, h, 1);
      edge.scale.set(w + .18, 1, 1); edge.position.set(0, -h / 2 - .1, .04);
      plaque.position.set(0, -h / 2 - .6, .02);
    };
    layout(4 / 3);
    fr.ready = loadImage(o.w.img).then(im => {
      let src = im;
      if (!im) { src = this.placeholder(o, cat, j); fr.src = src.toDataURL('image/jpeg', .85); }
      else fr.src = o.w.img;
      const t = new THREE.Texture(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
      imgM.map = t; imgM.needsUpdate = true; fr.posterTex = t;
      layout(src.width / src.height);
    });
    img.userData.frame = o.i; back.userData.frame = o.i;
    if (o.w.video) this.videos.push({ fr, imgM, poster: null, vid: null, on: false });
    fr.imgM = imgM;
    fr.hit = [img, back];
    return fr;
  }

  /* ------------------------------------------------------------ input */
  bindInput() {
    const el = this.r.domElement;
    let down = null;
    el.addEventListener('pointerdown', e => {
      if (!this.active) return;
      down = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, t: performance.now(), id: e.pointerId };
      el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (!this.active) return;
      if (down) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.hypot(dx, dy) > 4) { killTweens('gyaw'); this.hideHint(); }
        const k = this.isTouch ? .0055 : .0042;
        this.yaw = down.yaw + dx * k;
        this.pitch = THREE.MathUtils.clamp(down.pitch + dy * k * .8, -.55, .55);
      } else if (!this.isTouch) {
        const f = this.pickFrame(e);
        document.body.classList.toggle('hovering', f != null);
      }
    });
    const up = e => {
      if (!this.active || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
      down = null;
      if (moved > 7 || dt > 600) return;
      const f = this.pickFrame(e);
      if (f != null) { this.goTo(f, true); return; }
      const hit = this.pickFloor(e);
      if (hit) this.walkTo(hit);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { down = null; });
    el.addEventListener('wheel', e => {
      if (!this.active) return;
      const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      this.move(f.multiplyScalar(-Math.sign(e.deltaY) * .6));
    }, { passive: true });
    addEventListener('keydown', e => {
      if (!this.active) return;
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') { if ($('#gCard').classList.contains('open')) this.closeCard(); else if ($('#gListView').classList.contains('open')) this.toggleList(false); else this.onExit(); }
      if ($('#gCard').classList.contains('open') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const dir = (e.key === 'ArrowLeft') === (this.lang !== 'en') ? 1 : -1; this.step(dir);
      }
    });
    addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
  }
  ndc(e) { const r = this.r.domElement.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  pickFrame(e) {
    this.ray.setFromCamera(this.ndc(e), this.cam);
    const objs = this.frames.filter(Boolean).flatMap(f => f.hit);
    const h = this.ray.intersectObjects(objs, false)[0];
    return h && h.distance < 18 ? h.object.userData.frame : null;
  }
  pickFloor(e) {
    this.ray.setFromCamera(this.ndc(e), this.cam);
    const h = this.ray.intersectObject(this.floor, false)[0];
    return h ? h.point : null;
  }
  clamp(p) {
    const lim = this.apothem - 1.0;
    for (const w of this.walls) {
      const d = p.x * w.out.x + p.z * w.out.z;
      if (d > lim) { p.x -= w.out.x * (d - lim); p.z -= w.out.z * (d - lim); }
    }
    return p;
  }
  move(v) { const p = this.cam.position.clone().add(v); this.clamp(p); this.cam.position.copy(p); }
  walkTo(pt, yaw = null, pitch = null) {
    this.hideHint();
    killTweens('gwalk'); killTweens('gyaw');
    const p0 = this.cam.position.clone();
    const p1 = this.clamp(new THREE.Vector3(pt.x, EYE, pt.z));
    const dur = Math.min(2.2, Math.max(.5, p0.distanceTo(p1) / 4));
    const pr = tween(dur, k => { this.cam.position.lerpVectors(p0, p1, k); this.cam.position.y = EYE + Math.sin(k * Math.PI * Math.max(1, Math.round(dur * 3))) * .025; }, { tag: 'gwalk', e: ease.inOutSine });
    if (yaw != null) {
      const y0 = this.yaw; let d = yaw - y0; d = Math.atan2(Math.sin(d), Math.cos(d));
      const pi0 = this.pitch, pi1 = pitch ?? 0;
      tween(dur, k => { this.yaw = y0 + d * k; this.pitch = pi0 + (pi1 - pi0) * k; }, { tag: 'gyaw' });
    }
    return pr;
  }
  async goTo(i, openAfter) {
    const f = this.frames[i]; if (!f) return;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.cam.fov / 2)) * this.cam.aspect);
    const need = Math.max((f.w + .6) / 2 / Math.tan(hfov / 2), (f.h + 1.4) / 2 / Math.tan(THREE.MathUtils.degToRad(this.cam.fov / 2)));
    const dist = Math.min(this.apothem * 1.6, Math.max(2.4, need));
    const wp = f.g.getWorldPosition(new THREE.Vector3());
    const stand = wp.clone().addScaledVector(f.wl.inN, dist);
    const pitch = Math.atan2(2.0 - EYE, dist) * .8;
    if (openAfter) this.closeCard(true);
    const ok = await this.walkTo(stand, Math.atan2(f.wl.inN.x, f.wl.inN.z), pitch);
    if (ok !== false && openAfter) this.openCard(i);
  }
  faceWall(ci) {
    const w = this.walls[ci]; if (!w) return;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.cam.fov / 2)) * this.cam.aspect);
    const d = Math.min(this.apothem * 1.75, (this.L * .5) / Math.tan(hfov / 2) + .5);
    const stand = w.c.clone().addScaledVector(w.inN, d);
    this.walkTo(stand, Math.atan2(w.inN.x, w.inN.z), .06);
  }

  /* ------------------------------------------------------------ UI */
  buildTabs() {
    const wrap = $('#gTabs'); wrap.innerHTML = '';
    const mk = (id, label) => { const b = document.createElement('button'); b.dataset.id = id; b.textContent = label; wrap.appendChild(b); return b; };
    mk('all', UI[this.lang].all);
    this.cats.forEach(c => mk(c.id, pick(c, this.lang)));
    wrap.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      this.filter = b.dataset.id; this.markTabs();
      if ($('#gListView').classList.contains('open')) { this.renderList(); return; }
      this.closeCard(true);
      if (b.dataset.id === 'all') this.overview();
      else this.faceWall(this.cats.findIndex(c => c.id === b.dataset.id));
    };
    this.markTabs();
  }
  markTabs() { document.querySelectorAll('#gTabs button').forEach(b => b.classList.toggle('on', b.dataset.id === this.filter)); }
  buildList() { this.renderList(); }
  renderList() {
    const items = this.data.works.map((w, i) => ({ w, i })).filter(o => this.filter === 'all' || o.w.cat === this.filter);
    $('#gGrid').innerHTML = items.map(o => {
      const f = this.frames[o.i]; const cat = this.data.categories.find(c => c.id === o.w.cat);
      return `<button class="g-item" data-i="${o.i}"><img src="${f?.src || ''}" alt="" loading="lazy"><div><b>${field(o.w, 'title', this.lang)}</b><small>${cat ? pick(cat, this.lang) : ''} · ${field(o.w, 'area', this.lang)}</small></div></button>`;
    }).join('');
    $('#gGrid').onclick = e => { const b = e.target.closest('.g-item'); if (!b) return; const i = +b.dataset.i; this.toggleList(false); this.goTo(i, true); };
  }
  toggleList(force) {
    const el = $('#gListView'); const open = force ?? !el.classList.contains('open');
    el.classList.toggle('open', open);
    if (open) { this.closeCard(true); this.renderList(); }
    const u = UI[this.lang];
    $('#gList span').textContent = open ? u.roomView : u.listView;
  }
  openCard(i) {
    const o = this.data.works[i], f = this.frames[i]; if (!o) return;
    this.cur = i;
    const cat = this.data.categories.find(c => c.id === o.cat);
    const u = UI[this.lang], box = $('#gMedia');
    if (o.video) box.innerHTML = `<video src="${o.video}" poster="${f?.src || ''}" controls autoplay muted playsinline loop></video>`;
    else if (o.before) {
      box.innerHTML = `<div class="cmp" style="--p:50%"><img src="${f?.src || o.img}" alt=""><div class="cmp-b"><img src="${o.before}" alt=""></div><input type="range" min="0" max="100" value="50" aria-label="${u.before}/${u.after}"><span class="cmp-l">${u.before}</span><span class="cmp-r">${u.after}</span></div>`;
      const r = box.querySelector('input'); r.addEventListener('input', () => r.parentElement.style.setProperty('--p', r.value + '%'));
    } else box.innerHTML = `<img src="${f?.src || ''}" alt="">`;
    window.__track?.('work-' + (o.id || i));
    $('#gCat').textContent = cat ? pick(cat, this.lang) : '';
    $('#gTitle').textContent = field(o, 'title', this.lang);
    $('#gArea').textContent = field(o, 'area', this.lang);
    $('#gDesc').textContent = field(o, 'desc', this.lang);
    const ask = $('#gAsk');
    if (CONFIG.whatsapp) {
      const msg = encodeURIComponent(({ ar: 'مرحباً، أودّ الاستفسار عن عمل مشابه لـ: ', en: 'Hello, I would like to inquire about a project similar to: ', ku: 'سڵاو، دەمەوێت پرسیار بکەم دەربارەی کارێکی هاوشێوەی: ' }[this.lang]) + field(o, 'title', this.lang));
      ask.href = `https://wa.me/${CONFIG.whatsapp}?text=${msg}`; ask.style.display = ''; ask.querySelector('span').textContent = UI[this.lang].inquire;
    } else ask.style.display = 'none';
    $('#gCard').classList.add('open');
  }
  closeCard(silent) { $('#gCard').classList.remove('open'); $('#gMedia').querySelector('video')?.pause(); if (!silent) this.cur = -1; }
  step(d) {
    if (this.cur < 0) return;
    const n = this.data.works.length; const i = (this.cur + d + n) % n;
    this.openCard(i); this.goTo(i, false);
  }
  hideHint() { $('#gHint').style.opacity = 0; }
  overview() {
    const a = this.apothem;
    this.walkTo(new THREE.Vector3(0, EYE, a * .62), 0, .05);
  }

  updateVideos() {
    const p = this.cam.position, fwd = new THREE.Vector3(); this.cam.getWorldDirection(fwd);
    for (const v of this.videos) {
      const wp = v.fr.g.getWorldPosition(new THREE.Vector3());
      const d = wp.distanceTo(p), facing = wp.clone().sub(p).normalize().dot(fwd) > .35;
      const want = this.active && d < 9 && facing && !this.low;
      if (want && !v.on) {
        if (!v.vid) {
          v.vid = Object.assign(document.createElement('video'), { src: v.fr.o.w.video, muted: true, loop: true, playsInline: true, crossOrigin: 'anonymous', preload: 'auto' });
          v.tex = new THREE.VideoTexture(v.vid); v.tex.colorSpace = THREE.SRGBColorSpace;
        }
        v.vid.play().then(() => { v.fr.imgM.map = v.tex; v.fr.imgM.needsUpdate = true; }).catch(() => {});
        v.on = true;
      } else if (!want && v.on) {
        v.vid.pause(); v.fr.imgM.map = v.fr.posterTex; v.fr.imgM.needsUpdate = true; v.on = false;
      }
    }
  }
  lowQuality(severe) {
    this.low = !!severe;
    this.r.setPixelRatio(1);
    this.composer.setSize(innerWidth, innerHeight);
    if (severe) this.bloom.enabled = false;
  }

  /* ------------------------------------------------------------ lifecycle */
  setLang(l) {
    this.lang = l;
    if (!this.frames.length) return;
    this.frames.forEach(f => f && f.drawPlaque());
    this.buildTabs(); this.renderList();
    const u = UI[l];
    $('#gHint').textContent = this.isTouch ? u.galleryHintTouch : u.galleryHintDesk;
    $('#gList span').textContent = $('#gListView').classList.contains('open') ? u.roomView : u.listView;
    if ($('#gCard').classList.contains('open') && this.cur >= 0) this.openCard(this.cur);
  }
  enter() {
    this.active = true;
    const a = this.apothem;
    this.cam.position.set(0, EYE, a * .78);
    this.yaw = 0; this.pitch = .04; this.filter = 'all'; this.markTabs();
    const u = UI[this.lang];
    $('#gHint').textContent = this.isTouch ? u.galleryHintTouch : u.galleryHintDesk;
    $('#gHint').style.opacity = 1;
    clearTimeout(this._ht); this._ht = setTimeout(() => this.hideHint(), 7000);
    // small intro glide
    this.cam.position.z = a * .95;
    this.walkTo(new THREE.Vector3(0, EYE, a * .62), 0, .05);
  }
  leave() {
    this.active = false; killTweens('gwalk'); killTweens('gyaw'); this.updateVideos();
    this.closeCard(); this.toggleList(false);
    document.body.classList.remove('hovering');
  }
  resize() {
    if (!this.cam) return;
    this.cam.aspect = innerWidth / innerHeight;
    this.cam.fov = this.cam.aspect < .8 ? 74 : 62;
    this.cam.updateProjectionMatrix();
    this.composer.setSize(innerWidth, innerHeight);
    this.bloom.resolution.set(innerWidth / 2, innerHeight / 2);
  }
  update(dt, t) {
    // keyboard movement
    const k = this.keys; let fx = 0, fz = 0;
    if (k['w'] || k['arrowup']) fz += 1;
    if (k['s'] || k['arrowdown']) fz -= 1;
    if (k['a']) fx -= 1;
    if (k['d']) fx += 1;
    if (!$('#gCard').classList.contains('open')) {
      if (k['arrowleft']) this.yaw += dt * 1.6;
      if (k['arrowright']) this.yaw -= dt * 1.6;
    }
    if (fx || fz) {
      killTweens('gwalk'); this.hideHint();
      const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      this.move(f.multiplyScalar(fz).add(r.multiplyScalar(fx)).normalize().multiplyScalar(dt * 4));
    }
    this.cam.rotation.set(this.pitch, this.yaw, 0);
    if (this.hang) { this.hang.rotation.y += dt * .5; this.hang.position.y = H - 1.1 + Math.sin(t * 1.2) * .06; }
    this.gridM.uniforms.uT.value = t;
    if ((this._vt = (this._vt || 0) + dt) > .5) { this._vt = 0; this.updateVideos(); }
    this.composer.render();
  }
}
