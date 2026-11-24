import { CONFIG, LANGS, pick, field } from './data.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------------ text */
const T = {
  ar: {
    introTag: 'نحن السند لمشروعك',
    navAbout: 'من نحن', navServices: 'خدماتنا', navWork: 'أعمالنا', navTour: 'جولة تفاعلية', navContact: 'تواصل معنا', navOrder: 'تقديم طلب',
    heroA: 'نحن السند', heroB: 'لمشروعك',
    heroP: 'تصميم، طباعة، تصنيع وتركيب — كل ما تحتاجه من خدمات الطباعة والإعلان في مكان واحد، في الموصل وجميع محافظات العراق.',
    ctaOrder: 'ابدأ طلبك', ctaWork: 'شاهد أعمالنا', ctaTour: 'جولة ثلاثية الأبعاد',
    statement: 'من الفكرة إلى <em>التركيب</em>، نُنفّذ مشروعك بكامل مراحله داخل منشآتنا — دون وسطاء، وبجودة تراها في كل تفصيل.',
    aboutH: 'منظومة إنتاج متكاملة تحت سقف واحد',
    aboutP: 'السند للدعاية والإعلان مطبعة ومنظومة إعلانية في الموصل، نخدم المحلات والشركات والعلامات التجارية في جميع أنحاء العراق. نصمّم ونطبع ونصنّع الحروف البارزة واللوحات الضوئية، ثم نوصل ونركّب العمل في موقعك جاهزاً للتشغيل.',
    stWorks: 'مشروع منفّذ', stClients: 'عميل وشريك', stCities: 'مدن',
    why: [['إنتاج داخلي متكامل', 'تصميم وطباعة وتصنيع وتركيب دون وسطاء.'], ['جودة وألوان ثابتة', 'خامات معتمدة وضمان على الطباعة حتى سنتين.'],
      ['سرعة في التنفيذ', 'مواعيد تسليم واضحة ومتابعة لكل مرحلة.'], ['تصاميم احترافية', 'فريق تصميم يعتمد معك الشكل قبل التنفيذ.'],
      ['توصيل وتركيب', 'في جميع محافظات العراق، والعمل يُسلَّم جاهزاً.'], ['تتبّع طلبك أونلاين', 'رمز خاص لكل طلب تتابع به مراحل التنفيذ.']],
    servH: 'خدماتنا', servP: 'حلول متكاملة للواجهات والمحلات والحملات الإعلانية — اختر الخدمة لتشاهد أعمالنا فيها.',
    works1: 'عمل', worksN: 'أعمال',
    workH: 'أعمالنا حسب كل خدمة', workP: 'مشاريع حقيقية نفّذناها لعملائنا — مرّر أو اضغط على أي عمل لعرضه.',
    allProjects: 'جميع المشاريع والعملاء', viewProject: 'عرض المشروع', askSimilar: 'اطلب عملاً مشابهاً',
    clientsH: 'شركاء النجاح',
    tourH: 'تجوّل داخل منظومة السند', tourP: 'جولة تفاعلية ثلاثية الأبعاد بين المكتب والطباعة والمعمل والتوصيل والتركيب، مع معرض الأعمال وتتبّع الطلبات.',
    tourBtn: 'ابدأ الجولة', trackBtn: 'تتبّع طلبك',
    contactH: 'تواصلوا معنا', contactP: 'يسعدنا استقبال استفساراتكم ومشاريعكم.',
    cWa: 'واتساب والطلبات', cPhone: 'الاستفسارات', cAddr: 'العنوان', cHours: 'أوقات الدوام', cSocial: 'تابعونا', openMap: 'فتح في الخرائط',
    rights: 'السند للدعاية والإعلان. جميع الحقوق محفوظة.',
    waMsg: 'مرحباً، أودّ الاستفسار عن عمل مشابه لـ: ',
  },
  en: {
    introTag: 'Your project’s backbone',
    navAbout: 'About', navServices: 'Services', navWork: 'Work', navTour: 'Interactive tour', navContact: 'Contact', navOrder: 'Place an order',
    heroA: 'We are the backbone', heroB: 'of your project',
    heroP: 'Design, print, fabrication and installation — every printing and advertising service you need, in one place. Mosul and all of Iraq.',
    ctaOrder: 'Start your order', ctaWork: 'See our work', ctaTour: '3D tour',
    statement: 'From concept to <em>installation</em>, we deliver every stage in-house — no middlemen, and quality you can see in every detail.',
    aboutH: 'An integrated production system under one roof',
    aboutP: 'Al-Sanad Advertising is a print and signage house in Mosul serving shops, companies and brands across Iraq. We design, print and fabricate 3D letters and light boxes, then deliver and install them ready to switch on.',
    stWorks: 'Delivered projects', stClients: 'Clients & partners', stCities: 'Cities',
    why: [['Fully in-house', 'Design, print, fabrication and installation — no middlemen.'], ['Consistent quality', 'Certified materials and up to 2 years print warranty.'],
      ['Fast delivery', 'Clear deadlines and follow-up at every stage.'], ['Professional design', 'Our designers approve the look with you first.'],
      ['Delivery & installation', 'Across all of Iraq, handed over ready.'], ['Track your order online', 'A private code to follow every production stage.']],
    servH: 'Our services', servP: 'Complete solutions for storefronts, shops and campaigns — pick a service to see our work in it.',
    works1: 'work', worksN: 'works',
    workH: 'Our work, by service', workP: 'Real projects delivered for our clients — hover or tap any piece to view it.',
    allProjects: 'All projects & clients', viewProject: 'View project', askSimilar: 'Ask for something similar',
    clientsH: 'Trusted by',
    tourH: 'Walk through the Al-Sanad system', tourP: 'An interactive 3D tour of our office, print floor, workshop, delivery and installation — plus the portfolio and order tracking.',
    tourBtn: 'Start the tour', trackBtn: 'Track your order',
    contactH: 'Get in touch', contactP: 'We’d be glad to hear about your project.',
    cWa: 'WhatsApp & orders', cPhone: 'Enquiries', cAddr: 'Address', cHours: 'Working hours', cSocial: 'Follow us', openMap: 'Open in Maps',
    rights: 'Al-Sanad Advertising. All rights reserved.',
    waMsg: 'Hello, I’d like to ask about work similar to: ',
  },
  ku: {
    introTag: 'ئێمە پاڵپشتی پڕۆژەکەتین',
    navAbout: 'دەربارەی ئێمە', navServices: 'خزمەتگوزارییەکان', navWork: 'کارەکانمان', navTour: 'گەشتی کارلێک', navContact: 'پەیوەندی', navOrder: 'ناردنی داواکاری',
    heroA: 'ئێمە پاڵپشتی', heroB: 'پڕۆژەکەتین',
    heroP: 'دیزاین، چاپ، دروستکردن و دامەزراندن — هەموو خزمەتگوزارییەکانی چاپ و ڕیکلام لە یەک شوێندا، لە موسڵ و هەموو پارێزگاکانی عێراق.',
    ctaOrder: 'داواکارییەکەت دەست پێبکە', ctaWork: 'کارەکانمان ببینە', ctaTour: 'گەشتی سێ ڕەهەندی',
    statement: 'لە بیرۆکەوە تا <em>دامەزراندن</em>، هەموو قۆناغەکانی پڕۆژەکەت لە ناو دامەزراوەکانماندا جێبەجێ دەکەین — بێ ناوەندگیر.',
    aboutH: 'سیستەمێکی بەرهەمهێنانی تەواو لە ژێر یەک سەقفدا',
    aboutP: 'سەنەد بۆ ڕیکلام و ڕاگەیاندن چاپخانە و سیستەمێکی ڕیکلامییە لە موسڵ، خزمەتی دوکان و کۆمپانیا و مارکە بازرگانییەکان دەکەین لە سەرانسەری عێراق. دیزاین و چاپ و دروستکردنی پیتی بەرجەستە و تابلۆی ڕووناک دەکەین، پاشان دەیگەیەنین و لە شوێنەکەت دایدەمەزرێنین.',
    stWorks: 'پڕۆژەی جێبەجێکراو', stClients: 'کڕیار و هاوبەش', stCities: 'شار',
    why: [['بەرهەمهێنانی ناوخۆیی', 'دیزاین و چاپ و دروستکردن و دامەزراندن بێ ناوەندگیر.'], ['کوالیتی و ڕەنگی جێگیر', 'کەرەستەی پەسەندکراو و گەرەنتی چاپ تا دوو ساڵ.'],
      ['خێرایی لە جێبەجێکردن', 'کاتی ڕادەستکردنی ڕوون و بەدواداچوون بۆ هەموو قۆناغێک.'], ['دیزاینی پرۆفیشناڵ', 'تیمی دیزاین شێوەکە لەگەڵت پەسەند دەکات.'],
      ['گەیاندن و دامەزراندن', 'لە هەموو پارێزگاکانی عێراق، ئامادە ڕادەست دەکرێت.'], ['بەدواداچوونی داواکاری', 'کۆدێکی تایبەت بۆ بەدواداچوونی قۆناغەکان.']],
    servH: 'خزمەتگوزارییەکانمان', servP: 'چارەسەری تەواو بۆ ڕووکار و دوکان و هەڵمەتە ڕیکلامییەکان — خزمەتێک هەڵبژێرە بۆ بینینی کارەکانمان.',
    works1: 'کار', worksN: 'کار',
    workH: 'کارەکانمان بەپێی خزمەتگوزاری', workP: 'پڕۆژەی ڕاستەقینە کە بۆ کڕیارەکانمان جێبەجێمان کردووە — کرتە لە هەر کارێک بکە بۆ بینینی.',
    allProjects: 'هەموو پڕۆژە و کڕیارەکان', viewProject: 'بینینی پڕۆژە', askSimilar: 'داوای کارێکی هاوشێوە بکە',
    clientsH: 'هاوبەشانی سەرکەوتن',
    tourH: 'گەشت لە ناو سیستەمی سەنەد', tourP: 'گەشتێکی سێ ڕەهەندی کارلێک لە نێوان نووسینگە و چاپ و کارگە و گەیاندن و دامەزراندن، لەگەڵ پێشانگای کارەکان و بەدواداچوونی داواکاری.',
    tourBtn: 'دەستپێکردنی گەشت', trackBtn: 'بەدواداچوونی داواکاری',
    contactH: 'پەیوەندیمان پێوە بکەن', contactP: 'خۆشحاڵ دەبین بە پرسیار و پڕۆژەکانتان.',
    cWa: 'واتساپ و داواکاری', cPhone: 'پرسیارەکان', cAddr: 'ناونیشان', cHours: 'کاتی دەوام', cSocial: 'فۆڵۆمان بکەن', openMap: 'کردنەوە لە نەخشە',
    rights: 'سەنەد بۆ ڕیکلام و ڕاگەیاندن. هەموو مافەکان پارێزراون.',
    waMsg: 'سڵاو، دەمەوێت پرسیار بکەم دەربارەی کارێکی هاوشێوەی: ',
  },
};

/* category copy + icons (works themselves come from works/gallery.json) */
const CAT = {
  'flex': { ar: 'واجهات فلكس مطبوعة بألوان زاهية تمتد على عرض المحل وتعرض هويتك ومنتجاتك بوضوح.', en: 'Vivid printed flex fascias spanning the full storefront to show your brand and products.', ku: 'ڕووکاری فلێکسی چاپکراو بە ڕەنگی گەش بە درێژایی دوکانەکە.', ic: '<rect x="2" y="5" width="20" height="9" rx="1"/><path d="M5 14v6M19 14v6M6 9h7"/>' },
  'lit-letters': { ar: 'حروف بارزة مضيئة بإضاءة LED، من الأكريليك والفوم، تمنح واجهتك حضوراً لافتاً ليلاً ونهاراً.', en: 'LED-lit 3D letters in acrylic and foam that give your storefront presence day and night.', ku: 'پیتی بەرجەستەی ڕووناک بە LED لە ئەکریلیک و فۆم، ڕووکارەکەت شەو و ڕۆژ دیار دەکات.', ic: '<path d="M4 20V5l6 15V5"/><path d="M14 5h6M17 5v15"/><circle cx="7" cy="2.5" r=".6"/>' },
  'raised-signs': { ar: 'لوحات بارزة من الأكريليك والفوم للمداخل والجدران الداخلية والهويات المؤسسية.', en: 'Raised acrylic and foam signs for entrances, interior walls and corporate identity.', ku: 'تابلۆی بەرجەستە لە ئەکریلیک و فۆم بۆ دەروازە و دیواری ناوەوە.', ic: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M7 10h6M7 14h10"/>' },
  'sticker': { ar: 'ستيكر وميش مطبوع وملصوق للواجهات والزجاج والسيارات، بجودة عالية ومتانة ممتازة.', en: 'Printed and applied sticker and mesh for storefronts, glass and vehicles — durable and sharp.', ku: 'ستیکەر و میش بۆ ڕووکار و شووشە و ئۆتۆمبێل، بە کوالیتی و بەرگەگرتنی بەرز.', ic: '<path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4"/><path d="M8 14l3-3 5 5"/>' },
  'uv': { ar: 'طباعة UV مباشرة على الألواح والبلاستيك والفوم بألوان دقيقة وثابتة.', en: 'Direct UV printing on boards, plastic and foam with precise, lasting colour.', ku: 'چاپی UV ڕاستەوخۆ لەسەر تەختە و پلاستیک و فۆم بە ڕەنگی ورد.', ic: '<rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 9V4h10v5M7 17v3h10v-3"/>' },
  'lightbox': { ar: 'بوكسات ولوحات ضوئية للمحلات بإضاءة متجانسة — علوية، دائرية وجدارية.', en: 'Evenly lit light boxes and signs for shops — fascia, round and wall-mounted.', ku: 'بۆکس و تابلۆی ڕووناک بۆ دوکانەکان — سەرەوە، بازنەیی و دیواری.', ic: '<rect x="3" y="5" width="18" height="11" rx="1.5"/><path d="M8 20h8M12 16v4"/><path d="M7 9h10"/>' },
  'rollup': { ar: 'رول أب وستاندات عرض للمعارض والفروع والمنتجات، سهلة النقل والتركيب.', en: 'Roll-ups and display stands for exhibitions, branches and products — easy to carry and set up.', ku: 'ڕۆڵ ئەپ و ستاندی نمایش بۆ پێشانگا و لق و بەرهەمەکان.', ic: '<rect x="7" y="3" width="10" height="15" rx="1"/><path d="M5 21h14M12 18v3"/>' },
  'billboards': { ar: 'لوحات طرقية وواجهات أبنية بالمقاسات الكبيرة للحملات الإعلانية.', en: 'Large-format billboards and building wraps for advertising campaigns.', ku: 'بیلبۆرد و ڕووکاری باڵەخانە بە قەبارەی گەورە بۆ هەڵمەتە ڕیکلامییەکان.', ic: '<rect x="2" y="4" width="20" height="10" rx="1"/><path d="M8 14v7M16 14v7"/>' },
  'flags': { ar: 'أعلام شراعية ومنضدية ورئاسية بطباعة واضحة تتحمّل الظروف الخارجية.', en: 'Feather, table and ceremonial flags with crisp print built for outdoors.', ku: 'ئاڵای شەراعی و مێز بە چاپی ڕوون بۆ دەرەوە.', ic: '<path d="M6 21V3"/><path d="M6 4c6-2 9 3 13 1v9c-4 2-7-3-13-1"/>' },
  'wayfinding': { ar: 'لوحات إرشادية وسلامة للمكاتب والمباني، بتصميم واضح ومتّسق مع هويتك.', en: 'Wayfinding and safety signs for offices and buildings, clear and on-brand.', ku: 'تابلۆی ڕێنمایی و سەلامەتی بۆ ئۆفیس و باڵەخانەکان.', ic: '<path d="M12 3v18"/><path d="M5 6h11l3 3-3 3H5z"/>' },
  'print': { ar: 'كارتات، وصولات، منيوات، أغلفة وبروشورات بطباعة دقيقة تناسب كل الأعمال.', en: 'Business cards, receipt books, menus, folders and brochures printed with precision.', ku: 'کارت، وەسڵ، مینیو و بڕۆشوور بە چاپی ورد.', ic: '<path d="M7 3h10v18H7z"/><path d="M10 7h4M10 11h4M10 15h2"/>' },
  'business-cards': { ar: 'بطاقات أعمال بوجهين بتصميم عصري وطباعة دقيقة تعرّف بنشاطك وتسهّل التواصل معك.', en: 'Two-sided business cards with a modern design and precise printing that introduce your business and make you easy to reach.', ku: 'کارتی کار بە دوو ڕوو بە دیزاینی مۆدێرن و چاپی ورد بۆ ناساندنی کارەکەت و ئاسانکردنی پەیوەندی.', ic: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><circle cx="8" cy="11" r="1.8"/><path d="M13 9.5h5M13 13h5M6 16h4"/>' },
  'identity': { ar: 'هويات بصرية وشعارات وتصاميم تطبع حضور علامتك في ذهن عملائك.', en: 'Visual identities, logos and designs that make your brand memorable.', ku: 'ناسنامەی بینراو و لۆگۆ و دیزاین بۆ مارکەکەت.', ic: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>' },
};
const IC = {
  chain: '<path d="M4 12h16M12 4v16"/><circle cx="12" cy="12" r="8"/>', drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>', pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>', track: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  wa: '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M8.5 8.5c.3 2.6 2.4 4.7 5 5l1.2-1.2 2 .9-.4 1.6c-3.8.2-8-4-7.8-7.8l1.6-.4.9 2z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  hours: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9"/>',
};
const svg = (p, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}">${p}</svg>`;

/* ------------------------------------------------------------------ state */
let lang = 'ar';
try { const l = new URLSearchParams(location.search).get('lang') || localStorage.getItem('alsanad-lang'); if (T[l]) lang = l; } catch (e) {}
let D = { categories: [], works: [], clients: [] };
const t = k => T[lang][k] ?? T.ar[k] ?? '';
const catsOf = w => (w.cats && w.cats.length ? w.cats : (w.cat ? [w.cat] : []));
const imgsOf = w => [w.img, ...(w.images || [])].filter(Boolean);
const clientOf = w => D.clients.find(c => c.id === w.client);
const cName = c => c ? field(c, 'name', lang) : '';
let LB = { list: [], i: 0 };

/* ------------------------------------------------------------------ intro */
const intro = $('#intro');
let seen = false; try { seen = sessionStorage.getItem('alsanad-intro') === '1'; } catch (e) {}
if (seen) intro.classList.add('fast');
document.body.classList.add('locked');
const bar = $('.intro-line i');
let introDone = false;
function endIntro() {
  if (introDone) return; introDone = true;
  bar.style.width = '100%';
  setTimeout(() => { intro.classList.add('out'); document.body.classList.remove('locked'); }, seen ? 150 : 450);
  try { sessionStorage.setItem('alsanad-intro', '1'); } catch (e) {}
}
intro.addEventListener('click', endIntro);
setTimeout(() => { if (!introDone) bar.style.width = '35%'; }, 200);

/* ------------------------------------------------------------------ render */
function applyLang() {
  const L = LANGS.find(l => l.id === lang) || LANGS[0];
  document.documentElement.lang = L.html; document.documentElement.dir = L.dir;
  document.querySelectorAll('[data-t]').forEach(el => { const v = t(el.dataset.t); if (el.dataset.t === 'statement') el.innerHTML = v; else el.textContent = v; });
  $('#langs').innerHTML = LANGS.map(l => `<button data-l="${l.id}" class="${l.id === lang ? 'on' : ''}">${l.short}</button>`).join('');
  $('#drawer').innerHTML = [...document.querySelectorAll('#links a')].map(a => `<a href="${a.getAttribute('href')}">${a.textContent}</a>`).join('') + `<a class="btn gold" href="order/">${t('navOrder')}</a>`;
  $('#yr').textContent = new Date().getFullYear();
  renderAll();
}

function renderHero() {
  const imgs = D.works.flatMap(w => imgsOf(w).slice(0, 2));
  if (!imgs.length) return;
  const cols = innerWidth < 600 ? 3 : 5;
  const per = Math.max(4, Math.ceil(imgs.length / cols));
  let html = '';
  for (let c = 0; c < cols; c++) {
    const set = []; for (let i = 0; i < per; i++) set.push(imgs[(c * per + i * 3 + c) % imgs.length]);
    const cells = set.map(s => `<img src="${esc(s)}" alt="" loading="${c < 2 ? 'eager' : 'lazy'}">`).join('');
    html += `<div class="hero-col ${c % 2 ? 'down' : ''}" style="--dur:${55 + c * 9}s">${cells}${cells}</div>`;
  }
  $('#heroCols').innerHTML = html;
}

function renderAbout() {
  const cities = new Set(D.works.map(w => w.area_ar).filter(Boolean));
  const st = [[D.works.length, t('stWorks')], [D.clients.length, t('stClients')], [cities.size, t('stCities')]].filter(([n]) => n > 0);
  $('#stats').innerHTML = st.map(([n, l]) => `<div class="stat"><b data-count="${n}">${n}</b><span>${esc(l)}</span></div>`).join('');
  const icons = ['chain', 'drop', 'clock', 'pen', 'truck', 'track'];
  $('#why').innerHTML = t('why').map(([h, p], i) => `<div class="why-item">${svg(IC[icons[i]])}<h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('');
}

const usedCats = () => D.categories.filter(c => D.works.some(w => catsOf(w).includes(c.id)));
const countLabel = n => `${n} <span>${n === 1 ? t('works1') : t('worksN')}</span>`;

function renderServices() {
  $('#svcGrid').innerHTML = usedCats().map(c => {
    const n = D.works.filter(w => catsOf(w).includes(c.id)).length;
    return `<a class="svc reveal" href="#cat-${esc(c.id)}">${svg((CAT[c.id] || CAT.identity).ic)}<h3>${esc(pick(c, lang))}</h3><div class="n">${countLabel(n)}</div></a>`;
  }).join('');
}

function cardHTML(it, idx) {
  return `<div class="card" data-i="${idx}"><img src="${esc(it.src)}" alt="${esc(it.title)}" loading="lazy">
    ${it.cat ? `<span class="tag">${esc(it.cat)}</span>` : ''}
    <div class="cap"><small>${esc(it.client)}</small><b>${esc(it.title)}</b></div></div>`;
}

function renderCats() {
  LB.all = [];
  let html = '';
  usedCats().forEach((c, k) => {
    const ws = D.works.filter(w => catsOf(w).includes(c.id));
    const items = ws.flatMap(w => imgsOf(w).map(src => ({ src, w, title: field(w, 'title', lang), client: cName(clientOf(w)), area: field(w, 'area', lang), cat: pick(c, lang) })));
    const start = LB.all.length; LB.all.push(...items);
    // repeat so the strip is always wider than the screen, then duplicate for a seamless loop
    const few = items.length < 4;  // small sets: show them still instead of repeating the same photos
    let row = items.map((it, j) => [it, start + j]);
    if (!few) while (row.length < 8) row = row.concat(items.map((it, j) => [it, start + j]));
    const cards = row.map(([it, i]) => cardHTML(it, i)).join('');
    const dur = Math.max(30, row.length * 6);
    html += `<div class="cat" id="cat-${esc(c.id)}">
      <div class="wrap cat-head reveal">
        <div style="display:flex;gap:20px;align-items:flex-end"><span class="num">${String(k + 1).padStart(2, '0')}</span>
        <div><h3>${esc(pick(c, lang))}</h3><p>${esc((CAT[c.id] || {})[lang] || (CAT[c.id] || {}).ar || '')}</p></div></div>
        <div class="cat-meta"><span class="cat-count">${countLabel(ws.length)}</span></div>
      </div>
      <div class="track-wrap ${few ? 'static' : ''}"><div class="track ${few ? 'static' : (k % 2 ? 'rev' : '')}" style="--dur:${dur}s">${few ? cards : cards + cards}</div></div>
    </div>`;
  });
  $('#catSections').innerHTML = html;
}

function renderClients() {
  const list = D.clients.filter(c => c.logo);
  if (!list.length) { $('#clients').hidden = true; return; }
  let row = []; while (row.length < 10) row = row.concat(list);
  const items = row.map(c => `<a href="projects/#c-${encodeURIComponent(c.id)}" title="${esc(cName(c))}"><img src="${esc(c.logo)}" alt="${esc(cName(c))}" loading="lazy"></a>`).join('');
  $('#lmTrack').innerHTML = items + items;
}

function renderContact() {
  const C = CONFIG;
  const item = (ic, label, val, href, en) => `<${href ? `a href="${href}" target="_blank" rel="noopener"` : 'div'} class="c-item"><span class="ic">${svg(IC[ic])}</span><span><small>${esc(label)}</small><b class="${en ? 'en' : ''}">${val}</b></span></${href ? 'a' : 'div'}>`;
  $('#cGrid').innerHTML = [
    item('wa', t('cWa'), esc(C.phoneDisplay), `https://wa.me/${C.whatsapp}`, true),
    item('phone', t('cPhone'), esc(C.phone2Display), `tel:${C.phone2}`, true),
    item('pin', t('cAddr'), esc(pick(C.address, lang)), C.mapLink),
    item('hours', t('cHours'), esc(pick(C.hours, lang))),
    item('ig', t('cSocial'), '@' + esc(C.instagram) + ' <small style="display:inline;font-weight:600">Instagram · TikTok</small>', `https://www.instagram.com/${C.instagram}/`, true),
  ].join('');
}

function renderAll() {
  renderHero(); renderAbout(); renderServices(); renderCats(); renderClients(); renderContact();
  observe();
}

/* ------------------------------------------------------------------ lightbox */
function openLB(i) {
  LB.i = i; const it = LB.all[i]; if (!it) return;
  $('#lbImg').src = it.src; $('#lbImg').alt = it.title;
  const wa = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(t('waMsg') + it.title)}`;
  $('#lbCap').innerHTML = `<small>${esc(it.client)}${it.area ? ' · ' + esc(it.area) : ''}</small><b>${esc(it.title)}</b>
    <div class="row"><a class="btn ghost sm" href="projects/#p-${encodeURIComponent(it.w.id)}">${esc(t('viewProject'))}</a><a class="btn gold sm" href="${wa}" target="_blank" rel="noopener">${esc(t('askSimilar'))}</a></div>`;
  $('#lb').classList.add('open'); $('#lb').setAttribute('aria-hidden', 'false'); document.body.classList.add('locked');
}
function closeLB() { $('#lb').classList.remove('open'); $('#lb').setAttribute('aria-hidden', 'true'); document.body.classList.remove('locked'); }
const stepLB = d => openLB((LB.i + d + LB.all.length) % LB.all.length);
$('#lbX').addEventListener('click', closeLB);
$('#lb').addEventListener('click', e => { if (e.target.id === 'lb') closeLB(); });
$('#lbPrev').addEventListener('click', () => stepLB(-1));
$('#lbNext').addEventListener('click', () => stepLB(1));
addEventListener('keydown', e => {
  if (!$('#lb').classList.contains('open')) return;
  if (e.key === 'Escape') closeLB();
  if (e.key === 'ArrowLeft') stepLB(1); if (e.key === 'ArrowRight') stepLB(-1);
});
document.addEventListener('click', e => {
  const c = e.target.closest('.card[data-i]'); if (c) openLB(+c.dataset.i);
  const l = e.target.closest('[data-l]'); if (l) { lang = l.dataset.l; try { localStorage.setItem('alsanad-lang', lang); } catch (er) {} applyLang(); }
  if (e.target.closest('#drawer a')) { $('#drawer').classList.remove('open'); document.body.classList.remove('locked'); }
  if (e.target.closest('a[href*="wa.me"]')) { try { window.goatcounter?.count?.({ path: 'whatsapp-click', title: 'whatsapp-click', event: true }); } catch (er) {} }
});
$('#burger').addEventListener('click', () => { const o = $('#drawer').classList.toggle('open'); document.body.classList.toggle('locked', o); });

/* touch: swipe a strip by hand */
document.addEventListener('touchstart', e => { const tr = e.target.closest('.track'); if (tr) tr.style.animationPlayState = 'paused'; }, { passive: true });
document.addEventListener('touchend', e => { const tr = e.target.closest('.track'); if (tr) setTimeout(() => tr.style.animationPlayState = '', 1500); }, { passive: true });

/* ------------------------------------------------------------------ nav + reveal */
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });
let io;
function observe() {
  io?.disconnect();
  io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
  document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
}

/* ------------------------------------------------------------------ boot */
(async function boot() {
  try {
    const r = await fetch('works/gallery.json', { cache: 'no-store' });
    if (r.ok) { const j = await r.json(); D = { categories: j.categories || [], works: (j.works || []).filter(w => !w.sample), clients: j.clients || [] }; }
  } catch (e) {}
  bar.style.width = '70%';
  applyLang();
  // wait for the first hero images (max ~1.6s) so the page opens already moving
  const first = [...document.querySelectorAll('#heroCols img')].slice(0, 6);
  await Promise.race([Promise.all(first.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; }))), new Promise(r => setTimeout(r, seen ? 300 : 1600))]);
  setTimeout(endIntro, seen ? 0 : 700);
})();
let rz, lastCols = innerWidth < 600; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const c = innerWidth < 600; if (c !== lastCols) { lastCols = c; renderHero(); } }, 300); });
