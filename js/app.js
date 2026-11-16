import * as THREE from 'three';
import { OrbitControls } from '../lib/addons/controls/OrbitControls.js';
import { EffectComposer } from '../lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../lib/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../lib/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from '../lib/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from '../lib/addons/environments/RoomEnvironment.js';
import { CONFIG, STATIONS, UI, JOURNEY, CATEGORIES, WORKS, LANGS, pick } from './data.js';
import { lookupOrder, prettyCode, normCode } from './orders.js';
import { renderClassic } from './classic.js';
import { COL, HEX, ICONS, ease, tween, killTweens, updateTweens, wait, damp, std, glowMat, canvas, canvasTex, drawDesign, loadImage } from './util.js';
import { Gallery } from './gallery.js';

/* =====================================================================
   setup
   ===================================================================== */
const $ = s => document.querySelector(s);
const isTouch = matchMedia('(pointer:coarse)').matches;
const isSmall = () => innerWidth <= 760;
let lang = 'ar';
try { const l = localStorage.getItem('alsanad-lang'); if (LANGS.some(x => x.id === l)) lang = l; } catch (e) {}
const isRTL = () => lang !== 'en';
const isOwner = (() => { try { return !!localStorage.getItem('alsanad-admin'); } catch (e) { return false; } })();
/* analytics (GoatCounter) */
export function track(name) { try { window.goatcounter?.count?.({ path: name, title: name, event: true }); } catch (e) {} }
window.__track = track;

const canvasEl = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance' });
const DPR = Math.min(devicePixelRatio, isTouch ? 1.6 : 1.75);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.bg);

const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, -300, 500);
const ELEV = THREE.MathUtils.degToRad(34);
const BASE_AZ = Math.PI / 4;
const POLAR = Math.PI / 2 - ELEV;
const CAM_DIST = 80;
cam.position.setFromSphericalCoords(CAM_DIST, POLAR, BASE_AZ);

const controls = new OrbitControls(cam, canvasEl);
controls.enableDamping = true;
controls.dampingFactor = .08;
controls.minPolarAngle = controls.maxPolarAngle = POLAR;
controls.minAzimuthAngle = BASE_AZ - .42;
controls.maxAzimuthAngle = BASE_AZ + .42;
controls.minZoom = .75; controls.maxZoom = 3.4;
controls.zoomSpeed = .9; controls.rotateSpeed = .5;
controls.screenSpacePanning = true;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };

/* lights */
/* image-based lighting: soft studio reflections on every material */
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  scene.environment = pmrem.fromScene(env, .04).texture;
  scene.environmentIntensity = .12;
  env.dispose?.(); pmrem.dispose();
}
scene.add(new THREE.HemisphereLight(0xE6FFF8, 0x10272B, 1.05));
const sun = new THREE.DirectionalLight(0xFFF6EA, 2.1);
sun.position.set(-14, 30, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
sun.shadow.bias = -.0005; sun.shadow.normalBias = .03;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x3CC4A4, .55); rim.position.set(20, 8, -18); scene.add(rim);

/* post */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .7, .55, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* =====================================================================
   materials
   ===================================================================== */
const M = {
  white: std(0xEDF2F1, .55),
  whiteSoft: std(0xD7E1DF, .7),
  petrol: std(COL.petrol, .5),
  petrolDark: std(COL.petrolDark, .55),
  charcoal: std(0x253034, .45, .25),
  dark: std(0x172024, .5, .2),
  gray: std(0x8E9A99, .6),
  steel: std(0xB9C4C4, .3, .7),
  gold: std(COL.gold, .4, .2),
  wood: std(0xC08A4E, .7),
  skin: std(0xC8946E, .7),
  hair: std(0x2A1E18, .8),
  plant: std(0x3F8F5C, .8, 0, { flatShading: true }),
  plant2: std(0x2F7449, .8, 0, { flatShading: true }),
  asphalt: std(0x1F292C, .9),
  acrylic: new THREE.MeshStandardMaterial({ color: 0x9FE8D8, roughness: .1, metalness: 0, transparent: true, opacity: .55 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9CC7CC, roughness: .08, metalness: .3, transparent: true, opacity: .4 }),
  glow: glowMat(COL.glow, 2.4),
  glowDim: glowMat(COL.glow, .9),
  glowLine: glowMat(COL.glow, 1.25),
  goldGlow: glowMat(COL.gold, 2.6),
  uv: glowMat(0x9C7BFF, 3),
  warm: glowMat(0xFFD9A0, 1.2),
};

/* geometry helpers */
function shadowy(m, cast = true, recv = true) { m.castShadow = cast; m.receiveShadow = recv; return m; }
function add(parent, mesh, x = 0, y = 0, z = 0) { mesh.position.set(x, y, z); parent.add(mesh); return mesh; }
function box(p, w, h, d, mat, x, y, z) { return add(p, shadowy(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)), x, y, z); }
function rbox(p, w, h, d, r, mat, x, y, z) { return add(p, shadowy(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat)), x, y, z); }
function cyl(p, rt, rb, h, mat, x, y, z, seg = 24) { return add(p, shadowy(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)), x, y, z); }
function sphere(p, r, mat, x, y, z, seg = 16) { return add(p, shadowy(new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat)), x, y, z); }
function plane(p, w, h, mat, x, y, z) { return add(p, new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), x, y, z); }

const T = .55; // platform top height

function platform(g, size, mat = M.white) {
  rbox(g, size, T, size, .24, mat, 0, T / 2, 0).castShadow = false;
  const rimM = rbox(g, size + .14, .07, size + .14, .26, M.glowDim, 0, .035, 0);
  rimM.castShadow = rimM.receiveShadow = false;
  // thin petrol band on the two front faces
  const band = std(COL.petrol, .5);
  box(g, size - .5, .06, .02, band, 0, T * .55, size / 2 + .005).castShadow = false;
  box(g, .02, .06, size - .5, band, size / 2 + .005, T * .55, 0).castShadow = false;
}

function worker(shirt = M.petrol) {
  const g = new THREE.Group();
  box(g, .13, .55, .15, M.dark, -.09, .275, 0);
  box(g, .13, .55, .15, M.dark, .09, .275, 0);
  rbox(g, .44, .56, .27, .08, shirt, 0, .83, 0);
  rbox(g, .11, .5, .13, .04, shirt, -.28, .82, 0);
  rbox(g, .11, .5, .13, .04, shirt, .28, .82, 0);
  sphere(g, .15, M.skin, 0, 1.27, 0);
  const h = sphere(g, .155, M.hair, 0, 1.31, -.02); h.scale.set(1, .7, 1);
  // tiny logo dot on chest
  plane(g, .1, .1, M.white, .1, .95, .136);
  return g;
}

function plantPot(p, x, z, s = 1) {
  const g = new THREE.Group();
  cyl(g, .2 * s, .16 * s, .36 * s, M.white, 0, .18 * s, 0);
  const f1 = add(g, shadowy(new THREE.Mesh(new THREE.IcosahedronGeometry(.32 * s, 0), M.plant)), 0, .62 * s, 0);
  const f2 = add(g, shadowy(new THREE.Mesh(new THREE.IcosahedronGeometry(.22 * s, 0), M.plant2)), .1 * s, .9 * s, .05 * s);
  f1.rotation.set(.3, .5, 0); f2.rotation.set(.8, .2, .3);
  g.position.set(x, T, z); p.add(g); return g;
}

/* =====================================================================
   assets
   ===================================================================== */
const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
const loadTex = src => new Promise(res => texLoader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
const setProgress = k => { $('.loader-bar i').style.width = Math.round(k * 100) + '%'; };

let markImg, markTex, logoTex, logoPetrolTex;
let galleryThumbs = [];
let galleryData = { categories: CATEGORIES, works: WORKS };
const designTex = []; // poster textures

/* =====================================================================
   world
   ===================================================================== */
const world = new THREE.Group(); scene.add(world);
const R = 9.5, SO = 7.2, SS = 5.8, GS = 5.2, G = 13.6;
const stations = {}; // id -> {group, pos, anchor, act, target, update}
const pickables = [];

function registerStation(id, group, pos, anchorY, update) {
  group.position.copy(pos);
  group.traverse(o => { if (o.isMesh) { o.userData.station = id; pickables.push(o); } });
  world.add(group);
  stations[id] = { id, group, pos: pos.clone(), anchor: new THREE.Vector3(pos.x, anchorY, pos.z), act: .3, target: .3, update, lift: 0 };
}

/* ---------- ground ---------- */
function buildGround() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBg: { value: new THREE.Color(COL.bg) }, uGlow: { value: new THREE.Color(COL.glow) } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uBg; uniform vec3 uGlow; varying vec3 vW;
      float grid(vec2 p,float s){ vec2 q=p/s; vec2 g=abs(fract(q-.5)-.5)/fwidth(q); return 1.-min(min(g.x,g.y),1.); }
      void main(){
        float d=length(vW.xz);
        float g1=grid(vW.xz,1.)*.35+grid(vW.xz,4.75)*.75;
        float fade=1.-smoothstep(10.,46.,d);
        float r=mod(uTime*7.,70.);
        float ring=exp(-pow((d-r)*.7,2.))*(1.-r/70.);
        vec3 col=uBg+uGlow*(g1*.075*fade+ring*.09*(.35+g1));
        col*=mix(1.,.6,smoothstep(22.,80.,d));
        gl_FragColor=vec4(col,1.);
      }`,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.01;
  scene.add(ground);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: .35 }));
  sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; scene.add(sh);
  return mat;
}

/* ---------- network lines + pulses ---------- */
const pulses = [];
function linePath(pts, mat = M.glowLine, width = .12, pulseCount = 2, speed = 3.2, pulseMat = M.glow) {
  const v = pts.map(p => new THREE.Vector3(p[0], .045, p[1]));
  let len = 0; const segs = [];
  for (let i = 0; i < v.length - 1; i++) {
    const a = v[i], b = v[i + 1], l = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(l + width, .05, width), mat);
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    world.add(m);
    segs.push({ a, b, l, start: len }); len += l;
  }
  // corner nodes
  for (let i = 1; i < v.length - 1; i++) {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .06, 20), mat); n.position.copy(v[i]); world.add(n);
  }
  const path = { segs, len };
  for (let k = 0; k < pulseCount; k++) {
    const p = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .35, 4, 8), pulseMat);
    world.add(p);
    pulses.push({ mesh: p, path, off: k / pulseCount, speed });
  }
  return path;
}
function pointOnPath(path, d, out) {
  d = Math.max(0, Math.min(path.len, d));
  for (const s of path.segs) {
    if (d <= s.start + s.l + 1e-6) { const k = (d - s.start) / s.l; out.copy(s.a).lerp(s.b, k); return s; }
  }
  const s = path.segs[path.segs.length - 1]; out.copy(s.b); return s;
}

function buildNetwork() {
  const ho = SO / 2 + .1, hs = SS / 2 + .1;
  linePath([[0, -ho], [0, -R + hs]]);
  linePath([[-ho, 0], [-R + hs, 0]]);
  linePath([[0, ho], [0, R - hs]]);
  linePath([[ho, 0], [R - hs, 0]]);
  linePath([[-hs, -R], [-R, -R], [-R, -hs]], M.glowLine, .1, 1, 2.6);
  linePath([[-R, hs], [-R, R], [-hs, R]], M.glowLine, .1, 1, 2.6);
  linePath([[hs, R], [R, R], [R, hs]], M.glowLine, .1, 1, 2.6);
  linePath([[R, -hs], [R, -R], [hs, -R]], M.glowDim, .08, 1, 2.2);
  // gallery link (gold)
  const gc = -G + GS / 2 + .1;
  linePath([[-R, -R], [gc, gc]], glowMat(COL.gold, 1.4), .12, 2, 2.2, M.goldGlow);
}

/* ---------- OFFICE (hub) ---------- */
function buildOffice() {
  const g = new THREE.Group();
  platform(g, SO);
  const h = SO / 2 - .2;
  // back walls
  rbox(g, .2, 3.1, SO - .4, .05, M.petrol, -h, T + 1.55, 0);
  rbox(g, SO - .4, 3.1, .2, .05, M.white, 0, T + 1.55, -h);
  // big screen on petrol wall
  const screenMat = new THREE.MeshBasicMaterial({ map: designTex[0], toneMapped: false });
  screenMat.color.setScalar(1.15);
  const scr = plane(g, 3.4, 1.9, screenMat, -h + .12, T + 1.75, .55); scr.rotation.y = Math.PI / 2;
  const frame = box(g, .06, 2.05, 3.55, M.dark, -h + .09, T + 1.75, .55); frame.castShadow = false;
  // logo above screen
  const logoM = new THREE.MeshBasicMaterial({ map: markTex, transparent: true, toneMapped: false });
  logoM.color.set(COL.white);
  const lg = plane(g, .45, .62, logoM, -h + .12, T + 2.95 - .12, -2.2); lg.rotation.y = Math.PI / 2;
  // shelves on white wall
  for (const [k, y] of [[0, 1.0], [1, 1.7], [2, 2.4]].map((a, i) => [i, a[1]])) {
    box(g, 2.6, .06, .38, M.whiteSoft, 1.45, T + y, -h + .3);
    for (let i = 0; i < 6; i++) {
      const c = [M.petrol, M.gold, M.gray, M.petrolDark, M.white, M.gold][(i + k * 2) % 6];
      const bh = .3 + ((i * 7 + k * 3) % 4) * .06;
      box(g, .18, bh, .28, c, .4 + i * .38 + (k % 2) * .1, T + y + .03 + bh / 2, -h + .3);
    }
  }
  // two posters
  for (let i = 0; i < 2; i++) {
    const pm = new THREE.MeshStandardMaterial({ map: designTex[i], roughness: .6 });
    box(g, .9, 1.25, .05, M.dark, -1.7 + i * 1.1, T + 1.7, -h + .14);
    plane(g, .82, 1.17, pm, -1.7 + i * 1.1, T + 1.7, -h + .17);
  }
  // desk
  rbox(g, 2.8, .95, 1.0, .08, M.white, -.5, T + .475, -.9);
  box(g, 2.9, .07, 1.1, M.petrolDark, -.5, T + .98, -.9);
  box(g, 2.8, .12, .02, M.glow, -.5, T + .3, -.39).castShadow = false;
  // monitor facing camera-ish
  const mon = new THREE.Group(); mon.position.set(-.9, T + 1.02, -1.05); mon.rotation.y = Math.PI / 4; g.add(mon);
  box(mon, .08, .3, .08, M.dark, 0, .15, 0);
  box(mon, 1.0, .6, .05, M.dark, 0, .55, 0);
  const monScreen = new THREE.MeshBasicMaterial({ map: designTex[0], toneMapped: false }); monScreen.color.setScalar(1.1);
  plane(mon, .92, .52, monScreen, 0, .55, .03);
  // keyboard
  box(g, .5, .03, .18, M.charcoal, -.3, T + 1.03, -.7);
  // staff behind desk + customer
  const staff = worker(); staff.position.set(-.9, T, -1.95); g.add(staff);
  const cust = worker(M.gray); cust.position.set(.6, T, .4); cust.rotation.y = Math.PI * 1.08; g.add(cust);
  // sample stand
  rbox(g, .9, 1.4, .08, .03, M.white, 2.1, T + .7, 1.2).rotation.y = -.5;
  const smp = plane(g, .78, 1.2, new THREE.MeshStandardMaterial({ map: designTex[3] }), 2.1 + Math.sin(-.5) * .05, T + .72, 1.2 + Math.cos(-.5) * .05); smp.rotation.y = -.5;
  plantPot(g, 2.7, -2.6, 1.15);
  plantPot(g, -2.6, 2.7, .9);

  // hologram mark
  const holo = new THREE.Group(); holo.position.set(.9, T + 3.6, .9); g.add(holo);
  const hm = new THREE.MeshBasicMaterial({ map: markTex, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
  hm.color.set(COL.glow).multiplyScalar(1.8);
  const holoPlane = plane(holo, 1.05, 1.45, hm, 0, 0, 0);
  const ringM = glowMat(COL.glow, 2);
  const ring = add(holo, new THREE.Mesh(new THREE.TorusGeometry(.95, .025, 8, 64), ringM), 0, -1.05, 0); ring.rotation.x = Math.PI / 2;
  const ring2 = add(holo, new THREE.Mesh(new THREE.TorusGeometry(.6, .02, 8, 48), ringM), 0, -1.05, 0); ring2.rotation.x = Math.PI / 2;
  const beam = add(holo, new THREE.Mesh(new THREE.CylinderGeometry(.6, .95, 1.0, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.glow).multiplyScalar(.6), transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })), 0, -.55, 0);

  let scrIdx = 0, scrT = 0, monIdx = 1;
  registerStation('office', g, new THREE.Vector3(0, 0, 0), T + 5.0, (dt, t, a) => {
    holo.rotation.y += dt * (.5 + a * 1.2);
    holo.position.y = T + 3.6 + Math.sin(t * 1.6) * .12;
    ring.scale.setScalar(1 + Math.sin(t * 2) * .05);
    ring2.rotation.z += dt * 1.5;
    hm.color.set(COL.glow).multiplyScalar(1.2 + a * 1.2);
    beam.material.opacity = .08 + a * .14;
    scrT += dt * (1 + a * 2);
    if (scrT > 3) { scrT = 0; scrIdx = (scrIdx + 1) % designTex.length; screenMat.map = designTex[scrIdx]; monIdx = (monIdx + 2) % designTex.length; monScreen.map = designTex[monIdx]; }
    screenMat.color.setScalar(.9 + a * .5);
    staff.rotation.y = Math.sin(t * .8) * .15;
  });
}

/* ---------- PRINT ---------- */
function buildPrint() {
  const g = new THREE.Group();
  platform(g, SS);
  const pz = -.75;
  // legs
  box(g, .14, .75, .8, M.dark, -1.6, T + .375, pz);
  box(g, .14, .75, .8, M.dark, 1.6, T + .375, pz);
  box(g, 3.3, .08, .1, M.dark, 0, T + .2, pz);
  // body
  rbox(g, 3.6, .55, .9, .08, M.white, 0, T + 1.03, pz);
  rbox(g, 3.7, .28, .72, .08, M.charcoal, 0, T + 1.42, pz - .08);
  rbox(g, .5, 1.05, 1.0, .06, M.charcoal, -1.95, T + 1.13, pz);
  rbox(g, .5, 1.05, 1.0, .06, M.charcoal, 1.95, T + 1.13, pz);
  // control screen
  const ctrl = new THREE.MeshBasicMaterial({ map: designTex[4], toneMapped: false });
  const cs = plane(g, .34, .24, ctrl, 1.95, T + 1.5, pz + .51);
  // brand strip
  box(g, 3.2, .04, .02, M.glow, 0, T + .8, pz + .46).castShadow = false;
  // media roll at back
  const roll = cyl(g, .2, .2, 3.3, M.whiteSoft, 0, T + .95, pz - .6); roll.rotation.z = Math.PI / 2;
  // carriage + uv lamp
  const car = new THREE.Group(); car.position.set(0, T + 1.24, pz + .36); g.add(car);
  rbox(car, .42, .26, .34, .05, M.dark, 0, 0, 0);
  box(car, .32, .04, .2, M.uv, 0, -.14, 0).castShadow = false;
  const uvLight = new THREE.PointLight(0x9C7BFF, 0, 2.2); uvLight.position.set(0, -.3, .2); car.add(uvLight);
  // output media (curved, scrolling texture)
  const outTex = designTex.long; outTex.wrapS = outTex.wrapT = THREE.RepeatWrapping; outTex.repeat.set(1, .5);
  const geo = new THREE.PlaneGeometry(3.1, 1.9, 1, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = (pos.getY(i) + .95) / 1.9; // 0 bottom..1 top
    const a = (1 - v) * Math.PI * .5;      // top: vertical lip → bottom: lies on floor
    const r = 1.0;
    pos.setY(i, Math.cos(a) * r * .45 + v * .1);
    pos.setZ(i, Math.sin(a) * r * 1.5);
  }
  geo.computeVertexNormals();
  const outMat = new THREE.MeshStandardMaterial({ map: outTex, roughness: .55, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: outTex, emissiveIntensity: .15 });
  const out = add(g, shadowy(new THREE.Mesh(geo, outMat), false, true), 0, T + .45, pz + .45);
  // paper rolls standing
  for (let i = 0; i < 3; i++) cyl(g, .17, .17, 1.6, M.white, 2.25, T + .8, -2.3 + i * .42);
  box(g, .16, .02, .16, M.gray, 2.25, T + 1.61, -2.3);
  // workstation
  rbox(g, 1.2, .78, .6, .04, M.white, -1.75, T + .39, 1.55);
  const m2 = new THREE.Group(); m2.position.set(-1.75, T + .8, 1.45); m2.rotation.y = Math.PI * .1; g.add(m2);
  box(m2, .7, .42, .04, M.dark, 0, .26, 0);
  const m2s = new THREE.MeshBasicMaterial({ map: designTex[1], toneMapped: false });
  plane(m2, .64, .36, m2s, 0, .26, .025);
  const op = worker(); op.position.set(-.55, T, .7); op.rotation.y = Math.PI * .95; g.add(op);
  // boxes
  rbox(g, .7, .5, .6, .04, M.petrol, 1.8, T + .25, 1.8);
  rbox(g, .55, .4, .5, .04, M.whiteSoft, 1.85, T + .7, 1.8);

  let x = 0, dir = 1;
  registerStation('print', g, new THREE.Vector3(0, 0, -R), T + 3.2, (dt, t, a) => {
    const sp = .9 + a * 2.6;
    x += dir * dt * sp; if (x > 1.45) { x = 1.45; dir = -1; } if (x < -1.45) { x = -1.45; dir = 1; }
    car.position.x = x;
    outTex.offset.y -= dt * (.02 + a * .07);
    uvLight.intensity = a * 1.6;
    M.uv.color.set(0x9C7BFF).multiplyScalar(.8 + a * 1.4);
    op.rotation.y = Math.PI * .95 + Math.sin(t * .7) * .2;
  });
}

/* ---------- WORKSHOP (CNC) ---------- */
function buildWorkshop() {
  const g = new THREE.Group();
  platform(g, SS);
  // back racks
  rbox(g, .16, 2.4, SS - .6, .04, M.whiteSoft, -SS / 2 + .35, T + 1.2, 0);
  const boards = [[M.wood, -.5], [M.gold, .1], [M.white, .7], [M.petrol, 1.3]];
  boards.forEach(([m, z], i) => { const b = rbox(g, .07, 1.9 - i * .15, .9, .02, m, -SS / 2 + .6 + i * .05, T + .95 - i * .07, z - 1.2); b.rotation.z = -.12; });
  // CNC table
  const cz = -.35;
  rbox(g, 3.3, .82, 2.1, .06, M.white, .35, T + .41, cz);
  box(g, 3.1, .07, 1.9, M.charcoal, .35, T + .86, cz);
  for (let i = 0; i < 7; i++) box(g, .03, .02, 1.85, M.gray, -1.0 + i * .45, T + .9, cz).castShadow = false;
  // CNC label
  const [lc, lx] = canvas(256, 96); lx.fillStyle = '#fff'; lx.fillRect(0, 0, 256, 96);
  lx.fillStyle = HEX.deep; lx.font = '800 64px Montserrat, sans-serif'; lx.textAlign = 'center'; lx.textBaseline = 'middle'; lx.fillText('CNC', 128, 52);
  plane(g, .9, .34, new THREE.MeshStandardMaterial({ map: canvasTex(lc) }), .35, T + .45, cz + 1.056);
  // acrylic sheet
  box(g, 2.5, .04, 1.45, M.acrylic, .35, T + .91, cz).castShadow = false;
  // gantry
  const gan = new THREE.Group(); gan.position.set(.35, 0, cz); g.add(gan);
  rbox(gan, .2, 1.05, .38, .04, M.charcoal, -1.62, T + 1.35, 0);
  rbox(gan, .2, 1.05, .38, .04, M.charcoal, 1.62, T + 1.35, 0);
  rbox(gan, 3.45, .3, .42, .05, M.petrol, 0, T + 1.95, 0);
  box(gan, 3.2, .03, .02, M.glow, 0, T + 1.95, .22).castShadow = false;
  const head = new THREE.Group(); head.position.set(0, T + 1.62, .18); gan.add(head);
  rbox(head, .38, .5, .36, .05, M.dark, 0, 0, 0);
  cyl(head, .07, .07, .3, M.steel, 0, -.38, 0, 12);
  const tipM = glowMat(COL.gold, 2.6);
  const tip = cyl(head, .02, .045, .14, tipM, 0, -.58, 0, 10); tip.castShadow = false;
  // sparks
  const N = 70;
  const sp = { pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), life: new Float32Array(N) };
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sp.pos, 3));
  const sMat = new THREE.PointsMaterial({ color: new THREE.Color(COL.gold).multiplyScalar(3), size: .07, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const sparks = new THREE.Points(sGeo, sMat); sparks.frustumCulled = false; g.add(sparks);
  const tipW = new THREE.Vector3();
  // letters: A + S
  const A = new THREE.Shape();
  A.moveTo(-.55, 0); A.lineTo(-.15, 1.3); A.lineTo(.15, 1.3); A.lineTo(.55, 0); A.lineTo(.3, 0); A.lineTo(.2, .35); A.lineTo(-.2, .35); A.lineTo(-.3, 0); A.closePath();
  const hole = new THREE.Path(); hole.moveTo(-.12, .55); hole.lineTo(.12, .55); hole.lineTo(0, .98); hole.closePath(); A.holes.push(hole);
  const aGeo = new THREE.ExtrudeGeometry(A, { depth: .22, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 });
  const aMesh = add(g, shadowy(new THREE.Mesh(aGeo, M.white)), 1.55, T, 1.95); aMesh.rotation.y = -.35;
  const sCurve = new THREE.CatmullRomCurve3([[.32, 1.15], [0, 1.25], [-.28, 1.05], [-.1, .75], [.22, .5], [.3, .2], [0, .02], [-.32, .12]].map(p => new THREE.Vector3(p[0], p[1], 0)));
  const sMesh = add(g, shadowy(new THREE.Mesh(new THREE.TubeGeometry(sCurve, 48, .1, 10), M.gold)), .55, T + .1, 2.15); sMesh.rotation.y = -.35;
  // worker
  const wk = worker(); wk.position.set(-1.0, T, 1.25); wk.rotation.y = Math.PI * .85; g.add(wk);

  registerStation('workshop', g, new THREE.Vector3(-R, 0, 0), T + 3.1, (dt, t, a) => {
    const sp2 = .45 + a * 1.4;
    gan.position.z = cz + Math.sin(t * sp2 * .7) * .6;
    head.position.x = Math.sin(t * sp2 * 1.3) * 1.2;
    head.position.y = T + 1.62 - (Math.sin(t * sp2 * 2.6) * .5 + .5) * .08 * a;
    tip.getWorldPosition(tipW); g.worldToLocal(tipW);
    const rate = a * 1.0;
    for (let i = 0; i < N; i++) {
      sp.life[i] -= dt;
      if (sp.life[i] <= 0) {
        if (Math.random() < rate) {
          sp.life[i] = .3 + Math.random() * .45;
          sp.pos[i * 3] = tipW.x; sp.pos[i * 3 + 1] = tipW.y - .06; sp.pos[i * 3 + 2] = tipW.z;
          const ang = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2.4;
          sp.vel[i * 3] = Math.cos(ang) * s; sp.vel[i * 3 + 1] = .8 + Math.random() * 2; sp.vel[i * 3 + 2] = Math.sin(ang) * s;
        } else { sp.pos[i * 3 + 1] = -99; continue; }
      }
      sp.vel[i * 3 + 1] -= 9.8 * dt;
      sp.pos[i * 3] += sp.vel[i * 3] * dt; sp.pos[i * 3 + 1] += sp.vel[i * 3 + 1] * dt; sp.pos[i * 3 + 2] += sp.vel[i * 3 + 2] * dt;
      if (sp.pos[i * 3 + 1] < T + .9) { sp.pos[i * 3 + 1] = T + .9; sp.vel[i * 3 + 1] *= -.3; sp.vel[i * 3] *= .6; sp.vel[i * 3 + 2] *= .6; }
    }
    sGeo.attributes.position.needsUpdate = true;
    tipM.color.set(COL.gold).multiplyScalar(1.6 + a * 2);
    sMesh.rotation.y = -.35 + Math.sin(t * .6) * .08;
  });
}

/* ---------- DELIVERY ---------- */
function buildDelivery() {
  const g = new THREE.Group();
  platform(g, SS);
  // road
  box(g, SS - .3, .02, 2.0, M.asphalt, 0, T + .01, .45).castShadow = false;
  const [dc, dx] = canvas(256, 16); dx.fillStyle = '#000'; dx.fillRect(0, 0, 256, 16); dx.fillStyle = '#fff'; dx.fillRect(0, 4, 150, 8);
  const dashTex = canvasTex(dc); dashTex.wrapS = THREE.RepeatWrapping; dashTex.repeat.set(5, 1);
  const dashMat = new THREE.MeshBasicMaterial({ map: dashTex, transparent: true, opacity: .8, alphaMap: dashTex, color: COL.gold, toneMapped: false });
  const dash = plane(g, SS - .4, .07, dashMat, 0, T + .025, .45); dash.rotation.x = -Math.PI / 2;
  for (const z of [-.52, 1.42]) box(g, SS - .3, .03, .04, M.glowDim, 0, T + .02, z).castShadow = false;
  // truck
  const truck = new THREE.Group(); truck.position.set(-.1, T, .45); g.add(truck);
  box(truck, 4.2, .18, .95, M.dark, 0, .45, 0);
  const cargo = rbox(truck, 2.75, 1.55, 1.3, .06, M.petrol, -.6, 1.33, 0);
  const sideM = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false });
  plane(truck, 2.0, 2.0 * logoTex.image.height / logoTex.image.width, sideM, -.6, 1.33, .656);
  const back = plane(truck, 1.0, 1.0 * logoTex.image.height / logoTex.image.width, sideM, -1.976, 1.33, 0); back.rotation.y = -Math.PI / 2;
  box(truck, 2.75, .05, .02, M.glow, -.6, .62, .66).castShadow = false;
  rbox(truck, 1.1, 1.15, 1.25, .12, M.white, 1.42, 1.05, 0);
  rbox(truck, .3, .5, 1.2, .05, M.white, 1.95, .75, 0);
  const glassM = std(0x16282C, .15, .6);
  box(truck, .03, .48, 1.05, glassM, 1.98, 1.32, 0).rotation.z = .12;
  box(truck, .55, .4, .02, glassM, 1.5, 1.35, .63);
  box(truck, .55, .4, .02, glassM, 1.5, 1.35, -.63);
  const hlM = glowMat(0xFFF1C9, 1.2);
  box(truck, .03, .12, .22, hlM, 2.11, .78, .42).castShadow = false;
  box(truck, .03, .12, .22, hlM, 2.11, .78, -.42).castShadow = false;
  const wheels = [];
  for (const x of [-1.5, -.85, 1.45]) for (const z of [.55, -.55]) {
    const w = cyl(truck, .3, .3, .22, M.dark, x, .3, z, 20); w.rotation.x = Math.PI / 2;
    const hub = cyl(w, .14, .14, .23, M.steel, 0, 0, 0, 12);
    wheels.push(w);
  }
  // headlight beams
  const beamM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xFFF1C9), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  for (const z of [.42, -.42]) { const b = add(truck, new THREE.Mesh(new THREE.ConeGeometry(.35, 1.6, 16, 1, true), beamM), 2.9, .7, z); b.rotation.z = Math.PI / 2; }
  // pallet + boxes
  box(g, 1.1, .12, .9, M.wood, -1.95, T + .06, -2.0);
  rbox(g, .5, .45, .4, .03, M.white, -2.15, T + .35, -2.05);
  rbox(g, .45, .45, .4, .03, M.petrol, -1.65, T + .35, -1.95);
  rbox(g, .45, .35, .38, .03, M.gold, -1.95, T + .78, -2.0);
  const dw = worker(); dw.position.set(1.3, T, -1.8); dw.rotation.y = Math.PI * .2; g.add(dw);
  // sign post
  cyl(g, .04, .04, 1.3, M.steel, 2.45, T + .65, -1.4, 8);
  const [sc, sx] = canvas(256, 128); sx.fillStyle = HEX.petrol; sx.fillRect(0, 0, 256, 128); sx.fillStyle = '#fff';
  sx.font = '800 54px "Baloo Bhaijaan 2", sans-serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.direction = 'rtl'; sx.fillText('كل العراق', 128, 70);
  const sp = plane(g, .9, .45, new THREE.MeshStandardMaterial({ map: canvasTex(sc) }), 2.45, T + 1.35, -1.38);
  sp.rotation.y = -.3;

  registerStation('delivery', g, new THREE.Vector3(0, 0, R), T + 3.1, (dt, t, a) => {
    const speed = .6 + a * 3.4;
    dashTex.offset.x += dt * speed * .18;
    for (const w of wheels) w.rotation.y -= dt * speed * 3;
    truck.position.y = T + Math.sin(t * 14 * (.3 + a)) * .012;
    truck.position.x = -.1 + Math.sin(t * .8) * .08 * a;
    hlM.color.set(0xFFF1C9).multiplyScalar(1 + a * 2.2);
    beamM.opacity = a * .16;
  });
}

/* ---------- INSTALL (storefront) ---------- */
function buildInstall() {
  const g = new THREE.Group();
  platform(g, SS);
  const fz = -1.75;
  // building block
  rbox(g, 4.6, 3.0, 1.0, .05, M.whiteSoft, 0, T + 1.5, fz - .4);
  rbox(g, 4.4, 2.0, .25, .05, M.petrol, 0, T + 1.0, fz + .2);
  // glass storefront
  box(g, 1.65, 1.6, .05, M.glass, -.9, T + .85, fz + .34).castShadow = false;
  box(g, 1.65, 1.6, .05, M.glass, .9, T + .85, fz + .34).castShadow = false;
  const inner = plane(g, 3.4, 1.55, M.warm, 0, T + .85, fz + .3);
  box(g, .08, 1.7, .1, M.dark, 0, T + .85, fz + .36);
  // sign box
  const signG = new THREE.Group(); signG.position.set(0, T + 2.5, fz + .3); g.add(signG);
  rbox(signG, 4.7, 1.0, .45, .1, M.petrolDark, 0, 0, 0);
  box(signG, 4.5, .05, .05, M.goldGlow, 0, -.52, .2).castShadow = false;
  const signM = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false });
  const lw = 3.1, lh = lw * logoTex.image.height / logoTex.image.width;
  plane(signG, lw, lh, signM, 0, 0, .232);
  const glowBack = plane(signG, 4.6, .9, new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.glow), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 0, 0, .228);
  // light pool on floor
  const pool = plane(g, 3.6, 1.6, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xFFD9A0), transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 0, T + .012, fz + 1.2);
  pool.rotation.x = -Math.PI / 2;
  // ladder
  const lad = new THREE.Group(); lad.position.set(1.55, T, -.35); lad.rotation.x = -.22; g.add(lad);
  box(lad, .06, 2.5, .06, M.steel, -.25, 1.25, 0); box(lad, .06, 2.5, .06, M.steel, .25, 1.25, 0);
  for (let i = 0; i < 7; i++) box(lad, .5, .04, .05, M.steel, 0, .25 + i * .33, 0);
  const lw1 = worker(); lw1.position.set(1.55, T + .95, -.55); lw1.rotation.y = Math.PI; g.add(lw1);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.1, .45, .12), M.petrol); arm.position.set(.2, 1.15, -.1); arm.rotation.x = -2.4; lw1.add(arm);
  const lw2 = worker(); lw2.position.set(-.6, T, 1.4); lw2.rotation.y = Math.PI * 1.1; g.add(lw2);
  plantPot(g, -2.4, -.75, 1);
  plantPot(g, 2.45, 1.9, .9);

  let flick = 0;
  registerStation('install', g, new THREE.Vector3(R, 0, 0), T + 4.2, (dt, t, a) => {
    // the sign "switches on" when active, with a short flicker
    const on = a > .6;
    flick = on ? Math.min(1, flick + dt * 1.6) : Math.max(0, flick - dt * .8);
    const fl = flick < 1 && flick > 0 ? (Math.sin(t * 60) > .2 ? 1 : .3) : 1;
    const base = .75 + Math.sin(t * 1.5) * .08;
    const k = (base + flick * 1.6) * fl;
    signM.color.setScalar(k);
    glowBack.material.opacity = flick * .22 * fl;
    pool.material.opacity = .05 + flick * .22;
    M.warm.color.set(0xFFD9A0).multiplyScalar(.7 + flick * .9);
    arm.rotation.x = -2.4 + Math.sin(t * 3) * .25;
  });
}

/* ---------- GALLERY PORTAL ---------- */
let portalMat;
const _cd = new THREE.Vector3(), _wp = new THREE.Vector3();
function buildPortal(thumbs) {
  const g = new THREE.Group();
  platform(g, GS, M.petrolDark);
  const inner = new THREE.Group(); inner.rotation.y = Math.PI / 4; g.add(inner);
  // steps
  rbox(inner, 2.8, .14, .7, .04, M.white, 0, T + .07, .85);
  rbox(inner, 2.4, .14, .5, .04, M.white, 0, T + .21, .45);
  // pillars + lintel
  rbox(inner, .42, 3.3, .6, .06, M.dark, -1.45, T + 1.65 + .14, 0);
  rbox(inner, .42, 3.3, .6, .06, M.dark, 1.45, T + 1.65 + .14, 0);
  rbox(inner, 3.4, .45, .66, .06, M.dark, 0, T + 3.5, 0);
  for (const x of [-1.22, 1.22]) box(inner, .04, 3.1, .04, M.goldGlow, x, T + 1.75, .31).castShadow = false;
  box(inner, 2.48, .04, .04, M.goldGlow, 0, T + 3.26, .31).castShadow = false;
  portalMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uA: { value: .3 }, uGold: { value: new THREE.Color(COL.gold) }, uGlow: { value: new THREE.Color(COL.glow) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `
      uniform float uTime,uA; uniform vec3 uGold,uGlow; varying vec2 vUv;
      void main(){
        vec2 p=vUv-.5; p.y*=1.25; float d=length(p); float a=atan(p.y,p.x);
        float rings=sin(d*38.-uTime*3.)*.5+.5;
        float swirl=sin(a*5.+d*14.-uTime*1.4)*.5+.5;
        vec3 col=mix(uGlow,uGold,smoothstep(.0,.6,d+swirl*.15));
        float core=smoothstep(.55,.0,d);
        float alpha=core*(.35+rings*.25+swirl*.2)*(.6+uA*.9);
        gl_FragColor=vec4(col*(1.4+uA*1.8),alpha);
      }`,
  });
  plane(inner, 2.44, 2.95, portalMat, 0, T + 1.75, 0);
  // floating frames
  const frames = [];
  thumbs.forEach((tex, i) => {
    const f = new THREE.Group();
    box(f, .82, .62, .03, M.white, 0, 0, 0).castShadow = false;
    plane(f, .74, .54, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 0, .02);
    g.add(f); frames.push({ f, ph: i / thumbs.length * Math.PI * 2, h: 1.5 + (i % 3) * .7 });
  });
  registerStation('gallery', g, new THREE.Vector3(-G, 0, -G), T + 4.5, (dt, t, a) => {
    portalMat.uniforms.uTime.value = t;
    portalMat.uniforms.uA.value = a;
    frames.forEach((o, i) => {
      const ang = o.ph + t * (.25 + a * .5);
      o.f.position.set(Math.cos(ang) * 2.35, T + o.h + Math.sin(t * 1.3 + i) * .12, Math.sin(ang) * 2.35);
      _cd.copy(cam.position).sub(controls.target).setY(0).normalize();
      o.f.getWorldPosition(_wp); o.f.lookAt(_wp.x + _cd.x, _wp.y, _wp.z + _cd.z);
    });
  });
}

/* =====================================================================
   labels
   ===================================================================== */
const labelEls = {};
function buildLabels() {
  const wrap = $('#labels'); wrap.innerHTML = '';
  for (const id of Object.keys(stations)) {
    const el = document.createElement('div');
    el.className = 'st-label ' + id + (id === 'gallery' ? ' gal' : '');
    el.innerHTML = `<span class="ic">${ICONS[id]}</span><span><em>${STATIONS[id].no}</em><b></b><small></small></span>`;
    el.addEventListener('click', e => { e.stopPropagation(); select(id); });
    el.addEventListener('pointerenter', () => { if (!isTouch) hovered = id; });
    el.addEventListener('pointerleave', () => { if (!isTouch && hovered === id) hovered = null; });
    wrap.appendChild(el); labelEls[id] = el;
  }
  refreshLabelText();
}
function refreshLabelText() {
  for (const id in labelEls) {
    const s = pick(STATIONS[id], lang);
    labelEls[id].querySelector('b').textContent = s.title;
    labelEls[id].querySelector('small').textContent = s.tag;
  }
}
const _v = new THREE.Vector3();
function placeLabels() {
  const w = innerWidth, h = innerHeight;
  for (const id in labelEls) {
    const st = stations[id];
    _v.copy(st.anchor); _v.y += st.lift; _v.project(cam);
    const x = (_v.x * .5 + .5) * w, y = (-_v.y * .5 + .5) * h;
    labelEls[id].style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
  }
}

/* =====================================================================
   camera framing
   ===================================================================== */
let viewH = 30;
const home = { target: new THREE.Vector3(), zoom: 1 };
function computeFrame() {
  const aspect = innerWidth / innerHeight;
  const basePos = new THREE.Vector3().setFromSphericalCoords(CAM_DIST, POLAR, BASE_AZ);
  const fwd = basePos.clone().negate().normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  const acc = p => { const x = p.dot(right), y = p.dot(up); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
  const b = new THREE.Box3(), p = new THREE.Vector3();
  for (const id in stations) {
    const st = stations[id];
    b.setFromObject(st.group); b.max.y = Math.min(b.max.y, 4.5);
    for (let i = 0; i < 8; i++) acc(p.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
    acc(st.anchor);
  }
  const small = isSmall();
  const uiTop = small ? 78 : 92, uiBot = small ? 96 : 92, labelPx = small ? 40 : 58, side = small ? 10 : 60;
  const Wu = maxX - minX, Hu = maxY - minY;
  const availH = innerHeight - uiTop - uiBot - labelPx;
  viewH = Math.max(Hu * innerHeight / availH, (Wu / aspect) * innerWidth / (innerWidth - side * 2));
  const upp = viewH / innerHeight;
  const contentPx = Hu / upp;
  const offPx = small ? (uiTop + labelPx - uiBot) / 2 : uiTop + labelPx + contentPx / 2 - innerHeight / 2;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  home.target.set(0, 0, 0).addScaledVector(right, cx).addScaledVector(up, cy + offPx * upp);
  home.target.addScaledVector(fwd, -home.target.y / fwd.y);
  home.zoom = 1;
  cam.left = -viewH * aspect / 2; cam.right = viewH * aspect / 2; cam.top = viewH / 2; cam.bottom = -viewH / 2;
  cam.updateProjectionMatrix();
}

function camBasis() {
  cam.updateMatrixWorld();
  const e = cam.matrixWorld.elements;
  return { right: new THREE.Vector3(e[0], e[1], e[2]), up: new THREE.Vector3(e[4], e[5], e[6]) };
}
// world target that shows `p` at a given pixel offset from screen center
function targetFor(p, zoom, offPx = { x: 0, y: 0 }) {
  const { right, up } = camBasis();
  const upp = viewH / zoom / innerHeight;
  const t = p.clone().addScaledVector(right, -offPx.x * upp).addScaledVector(up, -offPx.y * upp);
  // keep target on ground plane along view direction
  const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
  return t.addScaledVector(fwd, -t.y / fwd.y);
}
function flyTo(target, zoom, dur = 1.1) {
  killTweens('cam');
  const t0 = controls.target.clone(), z0 = cam.zoom;
  const p0 = cam.position.clone().sub(t0);
  return tween(dur, k => {
    controls.target.lerpVectors(t0, target, k);
    cam.position.copy(controls.target).add(p0);
    cam.zoom = z0 + (zoom - z0) * k; cam.updateProjectionMatrix();
  }, { tag: 'cam' });
}
function flyHome(dur = 1.1) {
  killTweens('az');
  // ease azimuth back to base
  const sph = new THREE.Spherical().setFromVector3(cam.position.clone().sub(controls.target));
  const a0 = sph.theta;
  tween(dur, k => {
    const s = new THREE.Spherical(CAM_DIST, POLAR, a0 + (BASE_AZ - a0) * k);
    cam.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
  }, { tag: 'az' });
  return flyTo(home.target, home.zoom, dur);
}

/* =====================================================================
   panel
   ===================================================================== */
const panel = $('#panel');
let selected = null, hovered = null;
function openPanel(id) {
  const s = pick(STATIONS[id], lang);
  track('station-' + id);
  $('#panelIcon').innerHTML = ICONS[id];
  $('#panelTag').innerHTML = `<em>${STATIONS[id].no}</em><span>${s.tag}</span>`;
  $('#panelTitle').textContent = s.title;
  $('#panelDesc').textContent = s.desc || '';
  $('#panelStats').innerHTML = (s.stats || []).map(x => `<div class="stat"><b><bdi dir="ltr">${x.v}</bdi>${x.u ? `<small>${x.u}</small>` : ''}</b><span>${x.l}</span></div>`).join('');
  $('#panelPoints').innerHTML = (s.points || []).map(p => `<li>${p}</li>`).join('');
  $('#panelChips').innerHTML = (s.chips || []).map(c => `<span>${c}</span>`).join('');
  const u = UI[lang]; let cta = '';
  if (CONFIG.whatsapp) {
    const msg = encodeURIComponent(({ ar: 'مرحباً، أودّ الاستفسار عن خدمة: ', en: 'Hello, I would like to inquire about: ', ku: 'سڵاو، دەمەوێت پرسیار بکەم دەربارەی: ' }[lang]) + s.title);
    cta += `<a class="btn btn-wa" href="https://wa.me/${CONFIG.whatsapp}?text=${msg}" target="_blank" rel="noopener">${ICONS.whatsapp}<span>${u.whatsapp}</span></a>`;
  }
  const OS = { office: 'logo', print: 'flex,uv', workshop: 'letters,cnc', install: 'letters,box' }[id] || '';
  cta = `<a class="btn btn-gold" href="order/${OS ? '?s=' + OS : ''}">${u.orderFull}</a>` + cta;
  cta += `<button class="btn" data-act="contact">${u.contactBtn}</button>`;
  $('#panelCta').innerHTML = cta;
  panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('panel-open');
  panel.querySelector('.panel-inner').scrollTop = 0;
}
function closePanel(goHome = true) {
  if (!selected) return;
  panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('panel-open');
  labelEls[selected]?.classList.remove('on');
  selected = null;
  if (goHome) flyHome(.9);
}
$('#panelClose').addEventListener('click', () => closePanel());
$('#panelCta').addEventListener('click', e => { if (e.target.closest('[data-act=contact]')) openModal('contact'); });

function select(id) {
  if (mode !== 'network' || journey.active) return;
  hideHint();
  if (id === 'gallery') { enterGallery(); return; }
  if (selected === id) return;
  if (selected) labelEls[selected].classList.remove('on');
  selected = id; labelEls[id].classList.add('on');
  openPanel(id);
  const st = stations[id];
  const zoom = isSmall() ? (id === 'office' ? 1.9 : 2.3) : (id === 'office' ? 1.7 : 2.0);
  const pw = Math.min(400, innerWidth - 48) + 24;
  let off;
  if (isSmall()) off = { x: 0, y: innerHeight * .29 };
  else off = { x: (isRTL() ? -1 : 1) * pw / 2, y: 10 };
  const focus = st.pos.clone(); focus.y = 1.4;
  flyTo(targetFor(focus, zoom, off), zoom, 1.1);
}

/* =====================================================================
   picking
   ===================================================================== */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pickAt(ev) {
  const r = canvasEl.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  const hit = ray.intersectObjects(pickables, false)[0];
  return hit ? hit.object.userData.station : null;
}
let down = null;
canvasEl.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvasEl.addEventListener('pointermove', e => {
  if (mode !== 'network' || isTouch || e.buttons) return;
  hovered = pickAt(e);
});
canvasEl.addEventListener('pointerleave', () => { hovered = null; });
canvasEl.addEventListener('pointerup', e => {
  if (!down || mode !== 'network') return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const dt = performance.now() - down.t; down = null;
  if (moved > 7 || dt > 600) return;
  const id = pickAt(e);
  if (id) select(id);
  else if (selected) closePanel();
});
let hintHidden = false;
function hideHint() { if (!hintHidden) { hintHidden = true; $('#hint').classList.add('hide'); } }
controls.addEventListener('start', () => { killTweens('cam'); killTweens('az'); });

/* =====================================================================
   order journey
   ===================================================================== */
const journey = { active: false, token: 0, follow: false };
let packet, trail = [];
function buildPacket() {
  packet = new THREE.Group();
  const pm = glowMat(COL.gold, 3);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.28, 0), pm);
  packet.add(core);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.48, .03, 8, 40), pm); halo.rotation.x = Math.PI / 2; packet.add(halo);
  packet.userData = { core, halo };
  packet.visible = false; world.add(packet);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(.12 * (1 - i / 12), 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.gold).multiplyScalar(2), transparent: true, opacity: .5 * (1 - i / 10), toneMapped: false, depthWrite: false }));
    m.visible = false; world.add(m); trail.push(m);
  }
}
const trailHist = [];
const PY = 1.1;
const ROUTE = [
  [[0, 0]],
  [[0, 0], [0, -R]],
  [[0, -R], [-R, -R], [-R, 0]],
  [[-R, 0], [-R, R], [0, R]],
  [[0, R], [R, R], [R, 0]],
];
const pad2 = n => String(n).padStart(2, '0');
function fmtDate(d) {
  if (!d) return '';
  const loc = { ar: 'ar-IQ-u-nu-latn', en: 'en-GB', ku: 'ckb-IQ-u-nu-latn' }[lang];
  try { return new Date(d).toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; }
}
function setJourneyUI(i) {
  const u = UI[lang], tx = pick(JOURNEY[i], lang);
  $('#jStep').textContent = `${u.step} ${pad2(i + 1)} ${u.of} ${pad2(JOURNEY.length)}`;
  $('#jTitle').textContent = tx[0]; $('#jText').textContent = tx[1];
  $('#jDots').innerHTML = JOURNEY.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('');
  $('#jEnd').classList.remove('show');
  $('#journey').classList.remove('order');
}
function journeyZoom() { return isSmall() ? 1.55 : 1.75; }
function journeyOffset() {
  if (journey.order && journey.done) return isSmall() ? { x: 0, y: innerHeight * .27 } : { x: 0, y: innerHeight * .2 };
  return isSmall() ? { x: 0, y: innerHeight * .14 } : { x: 0, y: innerHeight * .08 };
}

function renderOrder(o) {
  const u = UI[lang], skip = new Set(o.skip || []);
  const st = Math.max(1, Math.min(6, +o.s || 1));
  $('#journey').classList.add('order');
  $('#jStep').innerHTML = `${u.orderNo} <bdi dir="ltr">${prettyCode(o.code)}</bdi>`;
  $('#jTitle').textContent = pick(o.t, lang) || u.order;
  $('#jText').textContent = st >= 6 ? u.orderComplete : `${u.orderCurrent}: ${pick(JOURNEY[st - 1], lang)[0]}`;
  $('#jDots').innerHTML = '';
  const tl = JOURNEY.map((j, k) => {
    const n = k + 1;
    const cls = skip.has(j.id) ? 'skip' : (st > n ? 'done' : st === n ? 'now' : 'next');
    const lbl = { skip: u.stSkip, done: u.stDone, now: u.stNow, next: u.stNext }[cls];
    const d = o.d?.[n] ? ' · ' + fmtDate(o.d[n]) : '';
    return `<li class="${cls}"><i></i><b>${pick(j, lang)[0]}</b><span>${lbl}${cls === 'skip' ? '' : d}</span></li>`;
  }).join('');
  const note = pick(o.n, lang);
  let btns = '';
  if (CONFIG.whatsapp) {
    const msg = encodeURIComponent(({ ar: 'مرحباً، أودّ الاستفسار عن الطلب رقم ', en: 'Hello, I would like to ask about order ', ku: 'سڵاو، دەمەوێت پرسیار بکەم دەربارەی داواکاری ژمارە ' }[lang]) + prettyCode(o.code));
    btns += `<a class="btn btn-wa" href="https://wa.me/${CONFIG.whatsapp}?text=${msg}" target="_blank" rel="noopener">${ICONS.whatsapp}<span>${u.askOrder}</span></a>`;
  }
  btns += `<button class="btn" data-act="close">${u.close}</button>`;
  $('#jEnd').innerHTML = `<ol class="tl">${tl}</ol>${note ? `<p class="tl-note">${note.replace(/</g, '&lt;')}</p>` : ''}${o.u ? `<p class="tl-upd">${u.lastUpdate}: ${fmtDate(o.u)}</p>` : ''}<div class="tl-btns">${btns}</div>`;
  $('#jEnd').classList.add('show');
  $('#jSkip').textContent = u.close;
}

async function runJourney(order = null) {
  if (mode !== 'network') return;
  if (journey.active) endJourney();
  closePanel(false); closeModal(); hideHint();
  const tok = ++journey.token; journey.active = true; journey.order = order; journey.done = false;
  document.body.classList.add('in-journey');
  $('#journey').classList.add('open'); $('#journey').setAttribute('aria-hidden', 'false');
  $('#jSkip').textContent = UI[lang].skip;
  packet.visible = true; trail.forEach(t => t.visible = true); trailHist.length = 0;
  packet.position.set(0, PY + 2.5, 0);
  journey.follow = true;
  const alive = () => journey.token === tok;
  const skip = new Set(order?.skip || []);
  const st = order ? Math.max(1, Math.min(6, +order.s || 1)) : 6;
  const last = Math.min(st, 5) - 1;
  for (let i = 0; i <= last; i++) {
    if (!alive()) return;
    const id = JOURNEY[i].id;
    const passing = order && i < last;
    if (!skip.has(id)) setJourneyUI(i);
    for (const k in labelEls) labelEls[k].classList.toggle('on', k === id && !skip.has(id));
    const pts = ROUTE[i].map(p => new THREE.Vector3(p[0], PY, p[1]));
    if (pts.length > 1) {
      const path = { segs: [], len: 0 };
      for (let j = 0; j < pts.length - 1; j++) { const l = pts[j].distanceTo(pts[j + 1]); path.segs.push({ a: pts[j], b: pts[j + 1], l, start: path.len }); path.len += l; }
      await tween(path.len / (passing ? 11 : 7.5), k => { if (alive()) pointOnPath(path, k * path.len, packet.position); }, { e: ease.inOutSine, tag: 'journey' });
    } else {
      await tween(.9, k => { if (alive()) packet.position.y = PY + 2.5 * (1 - k); }, { e: ease.out, tag: 'journey' });
    }
    if (!alive()) return;
    if (skip.has(id)) continue;
    journey.current = id;
    tween(.5, k => { if (alive()) packet.position.y = PY + Math.sin(k * Math.PI) * .9; }, { tag: 'journey' });
    if (order) { if (passing) await wait(.75); continue; }
    const dur = i === JOURNEY.length - 1 ? 2.4 : 2.8;
    $('#jDots').style.setProperty('--dur', dur + 's');
    await wait(dur);
  }
  if (!alive()) return;
  if (order) {
    journey.done = true;
    renderOrder(order);
    if (st >= 6) { journey.follow = false; flyHome(1.4); }
    return;
  }
  const u = UI[lang];
  $('#jStep').textContent = '';
  $('#jTitle').textContent = u.doneTitle; $('#jText').textContent = u.doneText;
  $('#jDots').innerHTML = JOURNEY.map(() => '<i class="done"></i>').join('');
  let end = `<a class="btn btn-gold" href="order/">${u.orderFull}</a><button class="btn" data-act="gallery">${u.seeWork}</button><button class="btn" data-act="replay">${u.replay}</button>`;
  if (CONFIG.whatsapp) end = `<a class="btn btn-wa" href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">${ICONS.whatsapp}<span>${u.contact}</span></a>` + end;
  $('#jEnd').innerHTML = end; $('#jEnd').classList.add('show');
  $('#jSkip').textContent = u.close;
  journey.follow = false;
  flyHome(1.4);
}
function endJourney() {
  journey.token++; journey.active = false; journey.follow = false; journey.current = null; journey.order = null; journey.done = false;
  killTweens('journey');
  packet.visible = false; trail.forEach(t => t.visible = false);
  $('#journey').classList.remove('open', 'order'); $('#journey').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('in-journey');
  for (const k in labelEls) labelEls[k].classList.remove('on');
  $('#jSkip').textContent = UI[lang].skip;
}
$('#jSkip').addEventListener('click', () => { endJourney(); flyHome(); });
$('#jEnd').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'replay') { runJourney(); }
  if (b.dataset.act === 'gallery') { endJourney(); enterGallery(); }
  if (b.dataset.act === 'close') { endJourney(); flyHome(); }
});
$('#btnJourney').addEventListener('click', () => openModal('track'));

/* =====================================================================
   modals: track + contact
   ===================================================================== */
let openModalId = null;
function openModal(id) {
  if (mode !== 'network' && id !== 'contact') return;
  closePanel(false);
  closeModal();
  openModalId = id;
  const m = $('#m-' + id); m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
  if (id === 'track') { $('#trackErr').textContent = ''; setTimeout(() => $('#trackInput').focus(), 80); track('track-open'); }
  if (id === 'contact') track('contact-open');
}
function closeModal() {
  if (!openModalId) return;
  const m = $('#m-' + openModalId); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
  openModalId = null;
}
document.querySelectorAll('.mc').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }));
$('#btnContact').addEventListener('click', () => openModal('contact'));
$('#trackTour').addEventListener('click', () => { closeModal(); track('tour'); runJourney(); });
$('#trackForm').addEventListener('submit', async e => {
  e.preventDefault();
  const code = $('#trackInput').value;
  const u = UI[lang], btn = $('#trackGo');
  if (normCode(code).length !== 8) { $('#trackErr').textContent = u.trackNotFound; return; }
  btn.disabled = true; btn.textContent = u.trackChecking; $('#trackErr').textContent = '';
  track('track-search');
  let o = null;
  try { o = await lookupOrder(code); } catch (err) {}
  btn.disabled = false; btn.textContent = u.trackGo;
  if (!o) { $('#trackErr').textContent = u.trackNotFound; return; }
  track('track-found');
  closeModal();
  runJourney(o);
});

function renderContact() {
  const u = UI[lang];
  const map = CONFIG.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapQuery)}`;
  const row = (ic, label, val, extra = '') => `<div class="ct-row"><span class="ct-ic">${ic}</span><div><small>${label}</small><b>${val}</b>${extra}</div></div>`;
  const I = {
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    ig: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/></svg>',
    tt: '<svg viewBox="0 0 24 24"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.3 4.4 5 4.8"/></svg>',
  };
  $('#contactBody').innerHTML = `
    ${row(I.pin, u.cAddress, pick(CONFIG.address, lang), `<a class="ct-link" href="${map}" target="_blank" rel="noopener">${u.cMap} ↗</a>`)}
    ${row(I.clock, u.cHours, pick(CONFIG.hours, lang))}
    ${row(I.phone, u.cPhone, `<bdi dir="ltr">${CONFIG.phoneDisplay}</bdi>`)}
    <div class="ct-actions">
      ${CONFIG.whatsapp ? `<a class="btn btn-wa" href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">${ICONS.whatsapp}<span>${u.whatsapp}</span></a>` : ''}
      ${CONFIG.phone ? `<a class="btn" href="tel:${CONFIG.phone}">${I.phone}<span>${u.cCall}</span></a>` : ''}
    </div>
    <div class="ct-follow"><small>${u.cFollow}</small>
      ${CONFIG.instagram ? `<a href="https://www.instagram.com/${CONFIG.instagram}/" target="_blank" rel="noopener">${I.ig}<bdi dir="ltr">@${CONFIG.instagram}</bdi></a>` : ''}
      ${CONFIG.tiktok ? `<a href="https://www.tiktok.com/@${CONFIG.tiktok}" target="_blank" rel="noopener">${I.tt}<bdi dir="ltr">@${CONFIG.tiktok}</bdi></a>` : ''}
    </div>`;
}


/* =====================================================================
   gallery mode
   ===================================================================== */
let mode = 'network';
let gallery = null;
const fade = $('#fade');
async function enterGallery() {
  if (mode !== 'network') return;
  mode = 'transition';
  closeModal();
  if (journey.active) endJourney();
  closePanel(false);
  hovered = null; stations.gallery.target = 1;
  const p = stations.gallery.pos.clone(); p.y = T + 1.8;
  flyTo(targetFor(p, 4.2), 4.2, 1.3);
  await wait(.8);
  fade.classList.add('on');
  await wait(.65);
  if (!gallery) { gallery = new Gallery(renderer, { lang, isTouch, markImg, onExit: exitGallery, data: galleryData, isOwner }); await gallery.init(); }
  track('gallery-enter');
  gallery.setLang(lang);
  gallery.resize();
  gallery.enter();
  mode = 'gallery'; controls.enabled = false;
  document.body.classList.add('mode-gallery');
  $('#galleryUI').setAttribute('aria-hidden', 'false');
  await wait(.15);
  fade.classList.remove('on');
}
async function exitGallery() {
  if (mode !== 'gallery') return;
  mode = 'transition';
  fade.classList.add('on');
  await wait(.65);
  gallery.leave();
  document.body.classList.remove('mode-gallery');
  $('#galleryUI').setAttribute('aria-hidden', 'true');
  // reset camera to home instantly, then fade in
  killTweens('cam'); killTweens('az');
  controls.target.copy(home.target);
  cam.position.copy(home.target).add(new THREE.Vector3().setFromSphericalCoords(CAM_DIST, POLAR, BASE_AZ));
  cam.zoom = home.zoom; cam.updateProjectionMatrix();
  mode = 'network'; controls.enabled = true;
  await wait(.1);
  fade.classList.remove('on');
}
$('#btnGallery').addEventListener('click', enterGallery);
$('#gBack').addEventListener('click', exitGallery);

/* =====================================================================
   language
   ===================================================================== */
function applyLang() {
  const u = UI[lang], L = LANGS.find(x => x.id === lang);
  document.documentElement.lang = L.html;
  document.documentElement.dir = L.dir;
  document.querySelectorAll('[data-i18n]').forEach(el => { const v = u[el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { const v = u[el.dataset.i18nPh]; if (typeof v === 'string') el.placeholder = v; });
  $('#tagline').innerHTML = u.tagline.map(t => `<span>${t}</span>`).join('<i></i>');
  $('#langCur').textContent = L.short;
  document.querySelectorAll('#langMenu button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
  refreshLabelText();
  renderContact();
  renderClients();
  renderClassic($('#classic'), { lang, data: galleryData, onLang: setLangTo, hasGL: true });
  if (selected) openPanel(selected);
  if (journey.active) {
    if (journey.order && journey.done) renderOrder(journey.order);
    else if (journey.current) { const i = JOURNEY.findIndex(j => j.id === journey.current); if (i >= 0) setJourneyUI(i); }
  }
  gallery?.setLang(lang);
}
$('#btnLang').addEventListener('click', e => { e.stopPropagation(); $('#langMenu').classList.toggle('open'); });
addEventListener('click', () => $('#langMenu').classList.remove('open'));
function setLangTo(l) {
  if (!LANGS.some(x => x.id === l)) return;
  lang = l;
  try { localStorage.setItem('alsanad-lang', lang); } catch (e) {}
  track('lang-' + lang);
  applyLang();
}
$('#langMenu').addEventListener('click', e => { const b = e.target.closest('button[data-l]'); if (b) setLangTo(b.dataset.l); });

/* clients strip */
function renderClients() {
  const list = (galleryData.clients || []).filter(c => c.logo);
  const el = $('#clients');
  document.body.classList.toggle('has-clients', list.length >= 3);
  if (list.length < 3) { el.innerHTML = ''; return; }
  const items = list.map(c => `<span class="cl"><img src="${c.logo}" alt="${(c.name || '').replace(/"/g, '&quot;')}" loading="lazy"></span>`).join('');
  el.innerHTML = `<b>${UI[lang].clients}</b><div class="cl-track"><div class="cl-row">${items}${items}</div></div>`;
}

/* classic (simple) view */
function setClassic(on, auto = false) {
  document.body.classList.toggle('classic', on);
  try { if (!auto) localStorage.setItem('alsanad-view', on ? 'classic' : '3d'); } catch (e) {}
  if (on) { closePanel(false); closeModal(); if (journey.active) endJourney(); track('classic-view'); }
  else onResize();
}
$('#btnLite').addEventListener('click', () => setClassic(true));
document.addEventListener('click', e => { if (e.target.closest('[data-act=full-view]')) setClassic(false); });

/* owner shortcuts */
if (isOwner) document.body.classList.add('owner');
(() => {
  let t; const logo = $('.brand');
  logo.addEventListener('pointerdown', () => { t = setTimeout(() => { location.href = 'admin.html'; }, 1200); });
  ['pointerup', 'pointerleave'].forEach(ev => logo.addEventListener(ev, () => clearTimeout(t)));
  logo.addEventListener('click', e => e.preventDefault());
})();
if (location.hash === '#admin') location.replace('admin.html');

/* whatsapp click tracking */
document.addEventListener('click', e => { if (e.target.closest('a[href*="wa.me"]')) track('whatsapp-click'); });

/* analytics loader */
if (CONFIG.goatcounter) {
  const sc = document.createElement('script'); sc.async = true; sc.src = 'https://gc.zgo.at/count.js';
  sc.dataset.goatcounter = `https://${CONFIG.goatcounter}.goatcounter.com/count`; document.head.appendChild(sc);
}

/* =====================================================================
   loop
   ===================================================================== */
let groundMat;
const clock = new THREE.Clock();
const _t = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), .05);
  const t = clock.elapsedTime;
  updateTweens(performance.now());
  if (document.body.classList.contains('classic')) { requestAnimationFrame(frame); return; }
  adaptQuality(dt, t);
  if (mode === 'gallery') { gallery.update(dt, t); requestAnimationFrame(frame); return; }

  groundMat.uniforms.uTime.value = t;
  for (const id in stations) {
    const st = stations[id];
    st.target = (id === hovered || id === selected || id === journey.current) ? 1 : .3;
    st.act = damp(st.act, st.target, 4, dt);
    const liftT = (id === hovered || id === selected) ? .18 : 0;
    st.lift = damp(st.lift, liftT, 8, dt);
    st.group.position.y = st.lift;
    st.update(dt, t, st.act);
    if (labelEls[id] && mode === 'network' && !journey.active) labelEls[id].classList.toggle('on', id === hovered || id === selected);
  }
  document.body.classList.toggle('hovering', !!hovered);
  // pulses
  for (const p of pulses) {
    const d = ((t * p.speed / p.path.len + p.off) % 1) * p.path.len;
    const s = pointOnPath(p.path, d, p.mesh.position);
    p.mesh.rotation.set(0, -Math.atan2(s.b.z - s.a.z, s.b.x - s.a.x), Math.PI / 2);
    p.mesh.position.y = .09;
  }
  // packet
  if (packet.visible) {
    packet.userData.core.rotation.y += dt * 3; packet.userData.core.rotation.x += dt * 1.3;
    packet.userData.halo.scale.setScalar(1 + Math.sin(t * 6) * .12);
    trailHist.unshift(packet.position.clone()); if (trailHist.length > 40) trailHist.pop();
    trail.forEach((m, i) => { const h = trailHist[Math.min(trailHist.length - 1, i * 3)]; if (h) m.position.copy(h); });
    if (journey.follow) {
      const tgt = targetFor(_t.copy(packet.position).setY(1), journeyZoom(), journeyOffset());
      controls.target.x = damp(controls.target.x, tgt.x, 3, dt);
      controls.target.y = damp(controls.target.y, tgt.y, 3, dt);
      controls.target.z = damp(controls.target.z, tgt.z, 3, dt);
      const off = cam.position.clone().sub(controls.target);
      cam.zoom = damp(cam.zoom, journeyZoom(), 2.5, dt); cam.updateProjectionMatrix();
    }
  }
  // keep panning sane
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -22, 16);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -22, 16);
  controls.update();
  placeLabels();
  composer.render();
  requestAnimationFrame(frame);
}

/* adaptive quality: drop pixel ratio / bloom / shadows on slow devices */
const perf = { t0: 0, frames: 0, level: 0, checks: 0 };
function adaptQuality(dt, t) {
  if (t < 3.5 || perf.checks >= 2) return;
  if (!perf.t0) { perf.t0 = t; perf.frames = 0; return; }
  perf.frames++;
  if (t - perf.t0 < 3) return;
  const fps = perf.frames / (t - perf.t0);
  perf.t0 = 0; perf.checks++;
  if (fps < 28 && perf.level === 0) {
    perf.level = 1;
    renderer.setPixelRatio(1); composer.setPixelRatio?.(1); composer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    bloom.resolution.set(innerWidth / 3, innerHeight / 3);
    gallery?.lowQuality?.();
  } else if (fps < 20 && perf.level === 1) {
    perf.level = 2;
    bloom.enabled = false;
    gallery?.lowQuality?.(true);
    const n = $('#liteNote'); n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 9000);
  }
}

function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth / 2, innerHeight / 2);
  const zt = controls.target.clone();
  computeFrame();
  if (mode === 'network' && !selected && !journey.active) {
    controls.target.copy(home.target);
    cam.position.copy(home.target).add(new THREE.Vector3().setFromSphericalCoords(CAM_DIST, POLAR, BASE_AZ));
    cam.zoom = home.zoom; cam.updateProjectionMatrix();
  } else controls.target.copy(zt);
  gallery?.resize();
}
addEventListener('resize', onResize);

/* =====================================================================
   boot
   ===================================================================== */
async function boot() {
  setProgress(.1);
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 40px "Baloo Bhaijaan 2"'), document.fonts.load('800 40px Montserrat')]),
      wait(2.5),
    ]);
  } catch (e) {}
  setProgress(.3);
  [markImg, markTex, logoTex] = await Promise.all([
    loadImage('assets/mark-white.png'), loadTex('assets/mark-white.png'), loadTex('assets/logo-secondary-white.png'),
  ]);
  try {
    const r = await fetch('works/gallery.json', { cache: 'no-store' });
    if (r.ok) { const j = await r.json(); if (j && Array.isArray(j.categories)) galleryData = { categories: j.categories, works: j.works || [], clients: j.clients || [] }; }
  } catch (e) {}
  // portal thumbnails: first real project images, else brand posters
  const thumbs = [];
  for (const w of galleryData.works.filter(w => !w.sample).slice(0, 5)) { const t = await loadTex(w.img); if (t) thumbs.push(t); }
  galleryThumbs = thumbs;
  setProgress(.55);
  // poster textures
  for (let v = 0; v < 5; v++) {
    const [c, x] = canvas(512, 512); drawDesign(x, 0, 0, 512, 512, v, markImg); designTex.push(canvasTex(c));
  }
  { const [c, x] = canvas(512, 1024); for (let i = 0; i < 4; i++) drawDesign(x, 0, i * 256, 512, 256, [0, 3, 1, 2][i], markImg);
    designTex.long = canvasTex(c); }
  setProgress(.7);
  groundMat = buildGround();
  buildNetwork();
  buildOffice(); buildPrint(); buildWorkshop(); buildDelivery(); buildInstall();
  buildPortal([...galleryThumbs, designTex[0], designTex[3], designTex[1], designTex[2], designTex[4]].slice(0, 5));
  buildPacket();
  buildLabels();
  applyLang();
  computeFrame();
  controls.target.copy(home.target);
  cam.position.copy(home.target).add(new THREE.Vector3().setFromSphericalCoords(CAM_DIST, POLAR, BASE_AZ));
  // intro: start zoomed-in and pull out
  cam.zoom = 1.9; cam.updateProjectionMatrix();
  setProgress(1);
  renderer.compile(scene, cam);
  requestAnimationFrame(frame);
  await wait(.35);
  $('#loader').classList.add('done');
  tween(2.2, k => { cam.zoom = 1.9 + (home.zoom - 1.9) * k; cam.updateProjectionMatrix(); }, { e: ease.out, tag: 'cam' });
  if (location.hash === '#gallery') setTimeout(enterGallery, 600);
  const m = location.hash.match(/^#track-([A-Za-z0-9-]+)$/);
  if (m) setTimeout(() => { openModal('track'); $('#trackInput').value = prettyCode(m[1]); $('#trackForm').requestSubmit(); }, 1400);
}
let viewPref = null; try { viewPref = localStorage.getItem('alsanad-view'); } catch (e) {}
if (viewPref === 'classic') setClassic(true, true);
boot();

// debugging hook (used for screenshots)
window.__alsanad = { select, runJourney, enterGallery, exitGallery, stations, get gallery() { return gallery; }, closePanel };
