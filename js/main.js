/* Entry point: 3D experience when WebGL is available, otherwise the classic page. */
const hasGL = (() => {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
})();

if (hasGL) {
  import('./app.js').catch(err => { console.error(err); bootClassic(); });
} else bootClassic();

async function bootClassic() {
  const [{ LANGS, CATEGORIES, WORKS }, { renderClassic }] = await Promise.all([import('./data.js'), import('./classic.js')]);
  let data = { categories: CATEGORIES, works: WORKS, clients: [] };
  try { const r = await fetch('works/gallery.json', { cache: 'no-store' }); if (r.ok) data = await r.json(); } catch (e) {}
  let lang = 'ar'; try { const l = localStorage.getItem('alsanad-lang'); if (LANGS.some(x => x.id === l)) lang = l; } catch (e) {}
  const render = () => {
    const L = LANGS.find(x => x.id === lang);
    document.documentElement.lang = L.html; document.documentElement.dir = L.dir;
    renderClassic(document.getElementById('classic'), { lang, data, hasGL: false, onLang: l => { lang = l; try { localStorage.setItem('alsanad-lang', l); } catch (e) {} render(); } });
  };
  document.body.classList.add('classic', 'nogl');
  render();
  document.getElementById('loader')?.classList.add('done');
}
