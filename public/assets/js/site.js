// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════

// NAV — transparent over hero, solid white after scroll past it
// ═══════════════════════════════════════════════════════════════════
(function () {
  const hero = document.querySelector('.hero');
  const navEl = document.querySelector('nav');
  const body = document.body;
  if (!hero) return;
  function syncNav() {
    const navH = navEl ? navEl.getBoundingClientRect().height : 84;
    const heroBottom = hero.getBoundingClientRect().bottom;
    // Toggle the moment the hero's bottom edge crosses the nav's bottom edge.
    const overHero = heroBottom > navH;
    body.classList.toggle('nav-over-hero', overHero);
    body.classList.toggle('nav-solid', !overHero && window.scrollY > 4);
  }
  syncNav();
  window.addEventListener('scroll', syncNav, { passive: true });
  window.addEventListener('resize', syncNav);
})();

// SCROLL PARALLAX & REVEAL
// ═══════════════════════════════════════════════════════════════════

window.addEventListener('scroll', () => {
  document.documentElement.style.setProperty('--scroll-y', window.scrollY);
}, { passive: true });

const observerOptions = { threshold: 0.15, rootMargin: '0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const premiumTextTargets = [
  { selector: '.hero-left h1', classes: 'text-motion text-motion--hero' },
  { selector: '.hero-left .eyebrow', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.hero-right h2', classes: 'text-motion' },
  { selector: '.proof-strip .eyebrow', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.proof-strip h2', classes: 'text-motion' },
  { selector: '.tp-band h3', classes: 'text-motion' },
  { selector: '.tp-intro .eyebrow', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.day-header .eyebrow', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.day-header h2', classes: 'text-motion' },
  { selector: '.day-schedule-label', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.gallery-header h2', classes: 'text-motion' },
  { selector: '.gallery-caption', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.gallery-counter', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.cur-header .eyebrow', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.cur-header h2', classes: 'text-motion' },
  { selector: '.cur-header-note', classes: 'text-motion' },
  { selector: '.cur-kicker', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.cur-title', classes: 'text-motion' },
  { selector: '.cur-quote', classes: 'text-motion' },
  { selector: '.cur-method-label', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.cur-method-text', classes: 'text-motion' },
  { selector: '.admissions h2', classes: 'text-motion' },
  { selector: '.footer-col h3', classes: 'text-motion text-motion--eyebrow' },
  { selector: '.footer-bottom span', classes: 'text-motion text-motion--eyebrow' }
];

function splitPremiumText(root) {
  if (!root || root.dataset.premiumSplit === 'true') return;
  const nodes = Array.from(root.childNodes);
  const frag = document.createDocumentFragment();
  let order = 0;

  const tokenise = (text) => {
    const tokens = text.match(/\s+|\S+/g) || [];
    tokens.forEach(token => {
      if (/^\s+$/.test(token)) {
        frag.appendChild(document.createTextNode(token));
      } else {
        const span = document.createElement('span');
        span.className = 'premium-word';
        span.style.setProperty('--premium-order', order++);
        span.textContent = token;
        frag.appendChild(span);
      }
    });
  };

  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      tokenise(node.nodeValue || '');
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'BR') {
        frag.appendChild(node);
      } else {
        splitPremiumText(node);
        frag.appendChild(node);
      }
    }
  });

  root.textContent = '';
  root.appendChild(frag);
  root.dataset.premiumSplit = 'true';
}

function splitPremiumTargets(scope = document) {
  premiumTextTargets.forEach(({ selector, classes }) => {
    scope.querySelectorAll(selector).forEach(el => {
      el.classList.add(...classes.split(' '));
      splitPremiumText(el);
    });
  });
}

function refreshPremiumText(el, classes = '') {
  if (!el) return;
  if (classes) el.classList.add(...classes.split(' '));
  el.querySelectorAll('.premium-word').forEach(span => {
    const parent = span.parentNode;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });
  delete el.dataset.premiumSplit;
  splitPremiumText(el);
}

splitPremiumTargets();

// ═══════════════════════════════════════════════════════════════════
// A DAY AT HADAR — hover-driven image preview
// ═══════════════════════════════════════════════════════════════════

const dayHeroImage = document.getElementById('dayHeroImage');
const dayPlateTime = document.getElementById('dayPlateTime');
const dayPlateTitle = document.getElementById('dayPlateTitle');
const dayScheduleItems = Array.from(document.querySelectorAll('.day-schedule-item'));
let dayImageTimer = null;

function setDayImage(el) {
  if (!el || !dayHeroImage) return;
  dayScheduleItems.forEach(item => {
    const isActive = item === el;
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  if (dayPlateTime && dayPlateTitle) {
    const t = el.querySelector('.day-time');
    const a = el.querySelector('.day-activity');
    dayPlateTime.textContent = (t && t.textContent.trim()) || 'Fri';
    dayPlateTitle.textContent = (a && a.textContent.trim()) || '';
  }

  window.clearTimeout(dayImageTimer);
  dayHeroImage.classList.add('is-switching');

  dayImageTimer = window.setTimeout(() => {
    if (el.dataset.dayImage) dayHeroImage.style.backgroundImage = `url('${el.dataset.dayImage}')`;
    window.setTimeout(() => {
      dayHeroImage.classList.remove('is-switching');
    }, 420);
  }, 180);
}

dayScheduleItems.forEach((item, index) => {
  item.setAttribute('role', 'button');
  item.setAttribute('aria-selected', item.classList.contains('is-active') ? 'true' : 'false');
  item.style.setProperty('--day-row-order', index);
  item.addEventListener('mouseenter', () => setDayImage(item));
  item.addEventListener('focus', () => setDayImage(item));
  item.addEventListener('click', () => setDayImage(item));
  item.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setDayImage(item);
    }
  });
});


// ═══════════════════════════════════════════════════════════════════
// READING CULTURE
// ═══════════════════════════════════════════════════════════════════

const READING_VOLUMES = [
  {
num: 'I.',
title: 'The Snow Queen',
subtitle: 'Hans Christian Andersen · Fantasy · Transformation',
category: 'Reading culture',
image: 'assets/Books/Book1_SnowQueen.webp',
accent: '#8C1C2B',
quote: 'A tale of magic, innocence, and the power of pure love.'
  },
  {
num: 'II.',
title: 'Charlotte\'s Web',
subtitle: 'E.B. White · Friendship · Wisdom',
category: 'Reading culture',
image: 'assets/Books/Book2_CharlotteWeb.webp',
accent: '#2B4D7A',
quote: 'How does one ever find time to write of everything there is to describe?'
  },
  {
num: 'III.',
title: 'The Complete Grimm\'s Fairy Tales',
subtitle: 'Jacob & Wilhelm Grimm · Tradition · Narrative',
category: 'Reading culture',
image: 'assets/Books/Book3_GrimmFairyTales.webp',
accent: '#4A3728',
quote: 'In fairy tales, the impossible becomes instruction.'
  },
  {
num: 'IV.',
title: 'Gawain and the Green Knight',
subtitle: 'Arthurian Legend · Chivalry · Trial',
category: 'Reading culture',
image: 'assets/Books/Book4_GreenKnight.webp',
accent: '#1F3A6E',
quote: 'A knight is tested not by the strength of his sword, but the virtue of his heart.'
  },
  {
num: 'V.',
title: 'The Book of Virtues',
subtitle: 'William J. Bennett · Character · Moral Instruction',
category: 'Reading culture',
image: 'assets/Books/Book5_BookVirtues.webp',
accent: '#3D2914',
quote: 'Virtue is not learned from books alone, but through stories that shape the soul.'
  },
  {
num: 'VI.',
title: 'Guns for General Washington',
subtitle: 'Seymour Reit · American History · Courage',
category: 'Reading culture',
image: 'assets/Books/Book6_GunsWashigton.webp',
accent: '#8C1C2B',
quote: 'History lives in the choices made by ordinary people in extraordinary times.'
  }
];

const CURRICULUM_SUBJECTS = [
{ num: 'I.',    title: 'Math',              image: 'assets/Curriculum/Math.webp',               quote: 'No shortcuts. No fluff. Fluency through repetition.',                method: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.' },
{ num: 'II.',   title: 'History & Civics',  image: 'assets/Curriculum/History_Civs.webp',       quote: 'The future is judged by the past.',                                  method: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.' },
{ num: 'III.',  title: 'Literature / ELA',  image: 'assets/Curriculum/Literature.webp',         quote: 'Books are encountered as books, not excerpts.',                      method: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.' },
{ num: 'IV.',   title: 'Hebrew',            image: 'assets/Curriculum/Hebrew.webp',             quote: 'The language is lived before it is explained.',                      method: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud.' },
{ num: 'V.',    title: 'Latin',             image: 'assets/Curriculum/Latin.webp',              quote: 'To read in the original is a luxury of the mind.',                   method: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud.' },
{ num: 'VI.',   title: 'Religious Studies', image: 'assets/Curriculum/Religious Studies.webp',  quote: 'Prayer is not a pause from learning; it is part of the formation.',  method: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.' },
{ num: 'VII.',  title: 'Moral Development', image: 'assets/Curriculum/Moral Development.webp',  quote: 'Character is built by habit, not slogan.',                           method: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.' }
  ];



const appState = {
  gallery: { activeSlide: 0 }
};




function renderCurriculum() {
const tablist = document.getElementById('curTablist');
if (!tablist) return;
tablist.innerHTML = '';
CURRICULUM_SUBJECTS.forEach((subject, idx) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cur-tab';
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
  btn.setAttribute('aria-controls', 'curDossier');
  btn.id = 'curTab-' + idx;
  btn.tabIndex = idx === 0 ? 0 : -1;
  btn.dataset.index = String(idx);
  btn.innerHTML = '<span class="cur-tab-num">' + subject.num + '</span><span class="cur-tab-title">' + subject.title + '</span>';
  btn.addEventListener('click', () => setCurriculumActive(idx));
  btn.addEventListener('keydown', onCurriculumTabKeydown);
  tablist.appendChild(btn);
});
const dossier = document.getElementById('curDossier');
if (dossier) dossier.setAttribute('aria-labelledby', 'curTab-0');
CURRICULUM_SUBJECTS.forEach(sb => { if (sb.image) { const i = new Image(); i.src = sb.image; } });
setCurriculumActive(0, { skipTransition: true });
  }

  let curActiveIndex = -1;
  let curSwitchTimer = null;

  function onCurriculumTabKeydown(e) {
const tabs = Array.from(document.querySelectorAll('#curTablist .cur-tab'));
const currentIdx = tabs.indexOf(e.currentTarget);
if (currentIdx === -1) return;
let nextIdx = null;
switch (e.key) {
  case 'ArrowRight':
  case 'ArrowDown': nextIdx = (currentIdx + 1) % tabs.length; break;
  case 'ArrowLeft':
  case 'ArrowUp':   nextIdx = (currentIdx - 1 + tabs.length) % tabs.length; break;
  case 'Home':      nextIdx = 0; break;
  case 'End':       nextIdx = tabs.length - 1; break;
  case 'Enter':
  case ' ':         setCurriculumActive(currentIdx); e.preventDefault(); return;
  default: return;
}
e.preventDefault();
setCurriculumActive(nextIdx);
tabs[nextIdx].focus();
  }

  function setCurriculumActive(index, opts) {
opts = opts || {};
const i = Math.max(0, Math.min(index, CURRICULUM_SUBJECTS.length - 1));
if (i === curActiveIndex) return;
curActiveIndex = i;
const subject = CURRICULUM_SUBJECTS[i];

const tabs = document.querySelectorAll('#curTablist .cur-tab');
tabs.forEach((tab, idx) => {
  const isActive = idx === i;
  tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  tab.tabIndex = isActive ? 0 : -1;
});
const dossier = document.getElementById('curDossier');
if (dossier) dossier.setAttribute('aria-labelledby', 'curTab-' + i);

const section = document.querySelector('.cur');
const apply = () => {
  const img = document.getElementById('curPlateImg');
  if (img) { img.src = subject.image; img.alt = subject.title + ' — curriculum cover'; }
  const title = document.getElementById('curTitle');
  if (title) title.textContent = subject.title;
  const quote = document.getElementById('curQuote');
  if (quote) quote.textContent = '\u201C' + subject.quote + '\u201D';
  const method = document.getElementById('curMethod');
  if (method) method.textContent = subject.method;
  if (typeof refreshPremiumText === 'function') {
    refreshPremiumText(title, 'text-motion');
    refreshPremiumText(quote, 'text-motion');
    refreshPremiumText(method, 'text-motion');
  }
};

const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (opts.skipTransition || reduce || !section) {
  apply();
  if (section) section.classList.remove('is-switching');
  return;
}
window.clearTimeout(curSwitchTimer);
section.classList.add('is-switching');
curSwitchTimer = window.setTimeout(() => {
  apply();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => section.classList.remove('is-switching'));
  });
}, 260);
  }
renderCurriculum();

const GALLERY_SIDE_NOTE_DEFAULT = 'Photographed across a single academic year. Hover the strip below to preview, tap to advance.';
const GALLERY_SLIDES = [
  { src: 'assets/GalleryNew/hadar.academy..101.2025.jpg', cat: 'community', label: 'Teaching', caption: 'Harmony in learning and song.', title: 'Harmony in learning and song.', note: 'Voices and texts intertwine — the day begins in shared melody, drawing the cohort into one rhythm of study.' },
  { src: 'assets/GalleryNew/hadar.academy..333.2025.jpg', cat: 'civics', label: 'Civics', caption: 'Honoring our nation and values.', title: 'A republic, if you can keep it.', note: 'Civic ritual is treated as serious practice — flag, oath, and obligation are formed long before they are debated.' },
  { src: 'assets/GalleryNew/1._DSC7587.2025.jpg', cat: 'community', label: 'Community', caption: 'Rooted in community and place.', title: 'Rooted in community and place.', note: 'Hadar is built around the table — meals, mentors, and the steady company of peers who know your name and your work.' },
  { src: 'assets/GalleryNew/hadar.academy..66.2025.jpg', cat: 'dialogue', label: 'Dialogue', caption: 'The classic art of dialogue.', title: 'The classic art of dialogue.', note: 'Students learn to argue without contempt — Socratic exchange returned to the room where ideas are tested face to face.' },
  { src: 'assets/GalleryNew/hadar.academy..71.2025.jpg', cat: 'learning', label: 'Learning', caption: 'A lesson from a mentor\'s heart.', title: 'A lesson from a mentor\u2019s heart.', note: 'Faculty teach close — the seminar gives way to the one-to-one, where character is shaped as much as intellect.' },
  { src: 'assets/GalleryNew/hadar.academy..271.2025.jpg', cat: 'study', label: 'Study', caption: 'The discipline of focused study.', title: 'The discipline of focused study.', note: 'Sustained attention is a Hadar habit — long blocks of unbroken reading, writing, and thinking with the phone away.' },
  { src: 'assets/GalleryNew/hadar.academy..56.2025.jpg', cat: 'nature', label: 'Nature', caption: 'Learning walks through nature.', title: 'Learning walks through nature.', note: 'Class moves outside. The walking seminar is part syllabus, part recovery — the body in motion while the argument unfolds.' },
  { src: 'assets/GalleryNew/hadar.academy..194.2025.jpg', cat: 'sports', label: 'Sports', caption: 'Excellence on the field.', title: 'Excellence on the field.', note: 'Athletics are non-negotiable. Strength, stamina, and team craft sit alongside the classics as core curriculum.' },
  { src: 'assets/GalleryNew/hadar.academy..292.2025.jpg', cat: 'heritage', label: 'Heritage', caption: 'Bridging two noble traditions.', title: 'Bridging two noble traditions.', note: 'Athens and Jerusalem under one roof — students read each tradition on its own terms, then in conversation with the other.' },
  { src: 'assets/GalleryNew/hadar.academy..15.2025.jpg', cat: 'friendship', label: 'Friendship', caption: 'Strength through partnership.', title: 'Strength through partnership.', note: 'The chevruta partnership: two students, one text, mutual accountability. Friendship as a serious intellectual instrument.' },
  { src: 'assets/GalleryNew/hadar.academy..28.2025.jpg', cat: 'joy', label: 'Joy', caption: 'Friendship forged through play.', title: 'Friendship forged through play.', note: 'Play is not a break from the work — it is where the cohort actually becomes a cohort, and where character shows up unguarded.' }
];
let galleryRaf = null;

const gallerySideCat = document.getElementById('gallerySideCat');
const gallerySideTitle = document.getElementById('gallerySideTitle');
const gallerySideNote = document.getElementById('gallerySideNote');

function setGalleryActive(index) {
  const slides = [...galleryTrack.querySelectorAll('.gallery-slide')];
  const dots = [...galleryDots.querySelectorAll('.gallery-dot')];
  const max = slides.length - 1;
  appState.gallery.activeSlide = Math.max(0, Math.min(index, max));
  dots.forEach((dot, idx) => {
    const isActive = idx === appState.gallery.activeSlide;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  slides.forEach((s, idx) => s.classList.toggle('is-active', idx === appState.gallery.activeSlide));
  const slide = GALLERY_SLIDES[appState.gallery.activeSlide];
  galleryCounter.textContent = `${String(appState.gallery.activeSlide + 1).padStart(2, '0')} / ${String(GALLERY_SLIDES.length).padStart(2, '0')}`;
  galleryCaption.textContent = slide.caption;
  if (gallerySideCat) gallerySideCat.textContent = slide.label;
  if (gallerySideTitle) gallerySideTitle.textContent = slide.title || slide.caption;
  if (gallerySideNote) gallerySideNote.textContent = slide.note || GALLERY_SIDE_NOTE_DEFAULT;
  // Scroll active thumbnail into view *within the filmstrip only*.
  // Previously used activeDot.scrollIntoView(), but on initial render
  // the dot sits far below the fold and the browser scrolls the
  // whole page down to the gallery to reveal it — landing visitors
  // on the gallery section instead of the hero. Scroll the dots
  // container's own scrollLeft so the page is never affected.
  const activeDot = dots[appState.gallery.activeSlide];
  if (activeDot && galleryDots) {
    try {
      const dotRect = activeDot.getBoundingClientRect();
      const stripRect = galleryDots.getBoundingClientRect();
      const dotCenter = (dotRect.left - stripRect.left) + galleryDots.scrollLeft + (dotRect.width / 2);
      const target = dotCenter - (galleryDots.clientWidth / 2);
      galleryDots.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    } catch (e) {}
  }
  refreshPremiumText(galleryCaption, 'text-motion text-motion--eyebrow');
  refreshPremiumText(galleryCounter, 'text-motion text-motion--eyebrow');
}

GALLERY_SLIDES.forEach((slide, idx) => {
  const el = document.createElement('figure');
  el.className = 'gallery-slide';
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Slide ${idx + 1}: ${slide.label} — click for next`);
  el.innerHTML = `
    <img src="${slide.src}" alt="${slide.label}">
    <span class="gallery-slide-index">${String(idx + 1).padStart(2, '0')} / ${String(GALLERY_SLIDES.length).padStart(2, '0')}</span>
    <span class="gallery-slide-label">${slide.label}</span>
  `;
  const advance = () => {
    const nextIndex = (idx + 1) % GALLERY_SLIDES.length;
    galleryTrack.scrollTo({ left: nextIndex * galleryTrack.clientWidth, behavior: 'smooth' });
    setGalleryActive(nextIndex);
  };
  el.addEventListener('click', advance);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
  });
  galleryTrack.appendChild(el);

  const dot = document.createElement('button');
  dot.className = 'gallery-dot';
  dot.type = 'button';
  dot.setAttribute('aria-label', `Go to slide ${idx + 1}: ${slide.label}`);
  dot.setAttribute('role', 'tab');
  dot.style.backgroundImage = `url('${slide.src}')`;
  dot.innerHTML = `<span class="gallery-dot-num">${String(idx + 1).padStart(2, '0')}</span>`;
  dot.addEventListener('click', () => {
    galleryTrack.scrollTo({ left: idx * galleryTrack.clientWidth, behavior: 'smooth' });
    setGalleryActive(idx);
  });
  galleryDots.appendChild(dot);
});

const galleryPrev = document.querySelector('.gallery-nav.prev');
const galleryNext = document.querySelector('.gallery-nav.next');

galleryPrev.addEventListener('click', () => {
  const nextIndex = (appState.gallery.activeSlide - 1 + GALLERY_SLIDES.length) % GALLERY_SLIDES.length;
  galleryTrack.scrollTo({ left: nextIndex * galleryTrack.clientWidth, behavior: 'smooth' });
  setGalleryActive(nextIndex);
});

galleryNext.addEventListener('click', () => {
  const nextIndex = (appState.gallery.activeSlide + 1) % GALLERY_SLIDES.length;
  galleryTrack.scrollTo({ left: nextIndex * galleryTrack.clientWidth, behavior: 'smooth' });
  setGalleryActive(nextIndex);
});

galleryTrack.addEventListener('scroll', () => {
  if (galleryRaf) return;
  galleryRaf = requestAnimationFrame(() => {
    const idx = Math.round(galleryTrack.scrollLeft / galleryTrack.clientWidth);
    setGalleryActive(idx);
    galleryRaf = null;
  });
});

setGalleryActive(0);

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION SMOOTH SCROLL
// ═══════════════════════════════════════════════════════════════════

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ACTIVE NAV SECTION (Elegance pass) — IntersectionObserver
// Marks the nav link for the currently most-visible section with
// .is-active, which draws the hairline rule under the label.
// ═══════════════════════════════════════════════════════════════════
(function () {
  const navLinks = Array.from(document.querySelectorAll('nav .nav-links a[data-nav-target]'));
  if (!navLinks.length) return;

  const sectionMap = new Map();
  // Map: section id → array of nav-link elements pointing at it
  navLinks.forEach(a => {
    const id = a.dataset.navTarget;
    const sec = document.getElementById(id);
    if (!sec) return;
    if (!sectionMap.has(sec)) sectionMap.set(sec, []);
    sectionMap.get(sec).push(a);
  });

  const visibility = new Map();
  const setActive = (sec) => {
    navLinks.forEach(a => a.classList.remove('is-active'));
    if (!sec) return;
    (sectionMap.get(sec) || []).forEach(a => a.classList.add('is-active'));
  };

  const onChange = () => {
    let best = null;
    let bestRatio = 0;
    visibility.forEach((ratio, sec) => {
      if (ratio > bestRatio) { bestRatio = ratio; best = sec; }
    });
    if (bestRatio > 0.05) setActive(best);
    else setActive(null);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => visibility.set(e.target, e.intersectionRatio));
    onChange();
  }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], rootMargin: '-84px 0px -40% 0px' });

  sectionMap.forEach((_, sec) => io.observe(sec));
})();

// ═══════════════════════════════════════════════════════════════════
// REVEAL — mark elements already in the initial viewport as visible
// on load so they don't animate in. Tighter scroll reveals only kick
// in for off-screen content. Also stages the hero crest entrance.
// ═══════════════════════════════════════════════════════════════════
(function () {
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return r.top < vh * 0.92 && r.bottom > 0;
  };
  document.querySelectorAll('.reveal').forEach(el => {
    if (inView(el)) {
      el.classList.add('is-in-initial-viewport');
      el.classList.add('visible');
    }
  });
  // Hero crest: graceful fade once content is committed.
  requestAnimationFrame(() => {
    document.body.classList.add('hero-crest-ready');
  });
})();

// ═══════════════════════════════════════════════════════════════════
// MOBILE NAV HAMBURGER — surface-only affordance.
// The actual menu panel is the responsibility of Task #4. Here we
// just toggle aria-expanded so the surface is ready and behaves
// correctly under touch / keyboard. If a #mobileNav panel exists
// (added by Task #4) we also toggle it.
// ═══════════════════════════════════════════════════════════════════
(function () {
  const burger = document.querySelector('nav .nav-hamburger');
  if (!burger) return;
  burger.addEventListener('click', () => {
    const expanded = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    const panel = document.getElementById('mobileNav');
    if (panel) panel.classList.toggle('is-open', !expanded);
  });
})();

// ═══════════════════════════════════════════════════════════════════
// READING LIST — rebuilt
// ═══════════════════════════════════════════════════════════════════
(function initReadingList() {
  const list = document.getElementById('rlList');
  const book = document.getElementById('rlBook');
  const coverImg = document.getElementById('rlCoverImg');
  const spineTitle = document.getElementById('rlSpineTitle');
  const spineNum = document.getElementById('rlSpineNum');
  const plate = document.getElementById('rlPlate');
  const numEl = document.getElementById('rlNum');
  const catEl = document.getElementById('rlCat');
  const titleEl = document.getElementById('rlTitle');
  const subEl = document.getElementById('rlSub');
  const quoteEl = document.getElementById('rlQuote');
  const countEl = document.getElementById('rlCount');
  const stage = book ? book.closest('.rl-stage') : null;
  if (!list || !book || typeof READING_VOLUMES === 'undefined') return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const volumes = READING_VOLUMES;
  let active = -1;
  let swapTimer = null;
  let openMidTimer = null;
  let openEndTimer = null;

  // Preload covers so swaps are instant.
  volumes.forEach(v => { if (v.image) { const i = new Image(); i.src = v.image; } });

  // Build rail.
  list.innerHTML = '';
  volumes.forEach((v, idx) => {
    const li = document.createElement('li');
    li.className = 'rl-entry';
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '-1');
    li.dataset.index = String(idx);
    // Intentionally NOT setting --rl-accent on the rail entry. Each
    // book has its own accent (e.g. crimson for Snow Queen, navy for
    // Charlotte's Web) that drives the book cover + plate, but the
    // rail itself stays in the brown/gold palette of the reading-list
    // section so the hover gold and the active state never disagree
    // (otherwise the active row inherits the book's color and the
    // hover row stays gold → inconsistent).
    li.innerHTML =
      '<span class="rl-entry-num">' + escapeHtml(v.num || '') + '</span>' +
      '<span class="rl-entry-text">' +
        '<span class="rl-entry-title">' + escapeHtml(v.title || '') + '</span>' +
        (v.subtitle ? '<span class="rl-entry-sub">' + escapeHtml(v.subtitle) + '</span>' : '') +
      '</span>';
    li.addEventListener('click', () => selectVolume(idx));
    list.appendChild(li);
  });
  if (countEl) countEl.textContent = pad2(volumes.length) + ' volumes';

  // Keyboard nav on the list.
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      selectVolume((active + 1) % volumes.length);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      selectVolume((active - 1 + volumes.length) % volumes.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectVolume(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectVolume(volumes.length - 1);
    }
  });

  function selectVolume(index, opts) {
    index = Math.max(0, Math.min(index, volumes.length - 1));
    if (index === active) return;
    active = index;
    const v = volumes[index];
    const openFlip = !!(opts && opts.openFlip);

    // Update rail selection state.
    Array.from(list.children).forEach((li, i) => {
      const on = i === index;
      li.classList.toggle('is-active', on);
      li.setAttribute('aria-selected', on ? 'true' : 'false');
      li.setAttribute('tabindex', on ? '0' : '-1');
    });

    // Cancel any in-flight swap or flip animations.
    if (swapTimer) { clearTimeout(swapTimer); swapTimer = null; }
    if (openMidTimer) { clearTimeout(openMidTimer); openMidTimer = null; }
    if (openEndTimer) { clearTimeout(openEndTimer); openEndTimer = null; }
    book.classList.remove('is-switching');
    if (stage) stage.classList.remove('is-switching');
    book.classList.remove('is-opening');

    const accent = v.accent || 'rgba(184, 132, 42, 0.9)';
    book.style.setProperty('--rl-accent', accent);
    if (plate) plate.style.setProperty('--rl-accent-plate', accent);

    const apply = () => {
      if (coverImg) {
        coverImg.src = v.image || '';
        coverImg.alt = v.title ? v.title + ' — cover' : '';
      }
      if (spineTitle) spineTitle.textContent = v.title || '';
      if (spineNum) spineNum.textContent = v.num || '';
      if (numEl) numEl.textContent = v.num || '';
      if (catEl) catEl.textContent = v.category || '';
      if (titleEl) titleEl.textContent = v.title || '';
      if (subEl) subEl.textContent = v.subtitle || '';
      if (quoteEl) quoteEl.textContent = v.quote ? '“' + v.quote + '”' : '';
    };

    if (prefersReduced) {
      apply();
      return;
    }

    if (openFlip) {
      // Cover-flip path: open the front cover, swap content past the
      // half-way point (cover facing away), then settle closed.
      if (stage) stage.classList.add('is-switching');
      // Next frame so the transition runs from the closed state.
      requestAnimationFrame(() => {
        book.classList.add('is-opening');
      });
      openMidTimer = setTimeout(() => {
        apply();
        openMidTimer = null;
      }, 440);
      openEndTimer = setTimeout(() => {
        book.classList.remove('is-opening');
        if (stage) stage.classList.remove('is-switching');
        openEndTimer = null;
      }, 820);
      return;
    }

    book.classList.add('is-switching');
    if (stage) stage.classList.add('is-switching');
    swapTimer = setTimeout(() => {
      apply();
      book.classList.remove('is-switching');
      if (stage) stage.classList.remove('is-switching');
      swapTimer = null;
    }, 220);
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Cursor-tracked 3D tilt + sheen on hover (desktop only).
  //
  // Tracking listens on the whole reading-list section (not just the
  // book) so the tilt follows the cursor smoothly across the section
  // — no snap when the cursor crosses the book's bounding box.
  // Tilt magnitude is shaped by a Gaussian falloff on the cursor's
  // distance from the book center (measured in book-half units), so
  // distant cursors produce gentler tilts and the tilt eases back to
  // rest as the cursor leaves the section. The lift/pop "on-hover"
  // state is toggled independently by pointerenter/leave on the
  // book itself, so the cover still pops when the cursor is actually
  // over it without disturbing the tilt follow.
  const supportsHover = window.matchMedia('(hover: hover)').matches;
  const trackZone = book.closest('.reading-list') || book.closest('.rl-container');
  if (!prefersReduced && supportsHover && trackZone) {
    const MAX_RX = 12; // degrees
    const MAX_RY = 16;
    const FALLOFF_K = 2.2; // larger = tilt persists further from the book
    let rafId = null;
    let pending = null;
    // Tracked so the spring-return knows where to start easing from.
    let curRx = 0, curRy = 0;
    let springId = null;

    function setVars(rx, ry, sx, sy) {
      curRx = rx; curRy = ry;
      book.style.setProperty('--rl-rx', rx.toFixed(2) + 'deg');
      book.style.setProperty('--rl-ry', ry.toFixed(2) + 'deg');
      if (sx != null) book.style.setProperty('--rl-sheen-x', sx.toFixed(1) + '%');
      if (sy != null) book.style.setProperty('--rl-sheen-y', sy.toFixed(1) + '%');
    }
    function flush() {
      rafId = null;
      if (!pending) return;
      const { rx, ry, sx, sy } = pending;
      pending = null;
      setVars(rx, ry, sx, sy);
    }
    function schedule(data) {
      pending = data;
      if (!rafId) rafId = requestAnimationFrame(flush);
    }
    function cancelSpring() {
      if (springId) { cancelAnimationFrame(springId); springId = null; }
      book.classList.remove('is-springing');
    }
    // Underdamped spring back to (0,0) — gives a subtle settle/overshoot
    // instead of the prior 180ms linear glide.
    function springToRest() {
      cancelSpring();
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      pending = null;
      if (Math.abs(curRx) < 0.05 && Math.abs(curRy) < 0.05) {
        setVars(0, 0, 50, 50);
        return;
      }
      book.classList.add('is-springing');
      let rx = curRx, ry = curRy;
      let vx = 0, vy = 0;
      const stiffness = 150;
      const damping = 13; // <2*sqrt(stiffness) → slight overshoot
      let lastT = performance.now();
      const tick = (t) => {
        const dt = Math.min(0.05, (t - lastT) / 1000);
        lastT = t;
        // Semi-implicit Euler.
        vx += ((-stiffness * rx) - (damping * vx)) * dt;
        vy += ((-stiffness * ry) - (damping * vy)) * dt;
        rx += vx * dt;
        ry += vy * dt;
        setVars(rx, ry);
        if (Math.abs(rx) < 0.03 && Math.abs(ry) < 0.03 &&
            Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) {
          setVars(0, 0, 50, 50);
          springId = null;
          book.classList.remove('is-springing');
          return;
        }
        springId = requestAnimationFrame(tick);
      };
      springId = requestAnimationFrame(tick);
    }
    function onMove(e) {
      if (springId) cancelSpring();
      const rect = book.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const bcx = rect.left + rect.width / 2;
      const bcy = rect.top + rect.height / 2;
      // Cursor offset from the book center, in book-half units.
      const nx = (e.clientX - bcx) / (rect.width / 2);
      const ny = (e.clientY - bcy) / (rect.height / 2);
      // Gaussian falloff: 1 at center, smoothly decays with distance.
      const d2 = nx * nx + ny * ny;
      const fall = Math.exp(-d2 / (FALLOFF_K * FALLOFF_K));
      // Sheen tracks cursor relative to the book; clamp to 0..100%
      // so it stays sensible when the cursor is outside the book.
      const sx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100;
      const sy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) * 100;
      schedule({
        ry: nx * MAX_RY * fall,   // cursor right → tilt right
        rx: -ny * MAX_RX * fall,  // cursor up    → tilt up
        sx,
        sy,
      });
    }
    function onZoneLeave() {
      // Cursor left the whole section — settle back with a spring so
      // the book feels like it physically returns to rest instead of
      // gliding linearly.
      springToRest();
    }
    function onBookEnter() { book.classList.add('is-hover'); }
    function onBookLeave() { book.classList.remove('is-hover'); }

    trackZone.addEventListener('pointermove', onMove);
    trackZone.addEventListener('pointerleave', onZoneLeave);
    book.addEventListener('pointerenter', onBookEnter);
    book.addEventListener('pointerleave', onBookLeave);
  }

  // Click the book to advance to the next volume. On hover-capable,
  // motion-allowed devices this plays the cover-flip animation; on
  // touch or reduced-motion contexts it falls back to the instant
  // swap path used by the rail.
  book.addEventListener('click', () => {
    if (!volumes.length) return;
    const next = (active + 1) % volumes.length;
    const canFlip = !prefersReduced && supportsHover;
    selectVolume(next, canFlip ? { openFlip: true } : undefined);
  });

  // Initial state.
  selectVolume(0);
})();

