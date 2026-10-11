import gsap from 'gsap';
import { projects, byId, CATEGORIES, categoryOf } from '../data/projects.js';
import { profile } from '../content.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const isExternal = (url) => /^https?:\/\//.test(url) || url.startsWith('mailto:');

function youtubeId(url) {
  try {
    const u = new URL(url);
    const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
    return /^[\w-]{11}$/.test(id || '') ? id : null;
  } catch {
    return null;
  }
}

// 화면 캡처·문서·도표나 해상도가 낮은 사진은 잘라 쓰지 않고 흐린 배경 위에 전체를 보여 준다
const fitsCover = (im) => (im.kind || 'photo') === 'photo' && (im.w || 0) >= 1200;
function media(im, opts = {}) {
  if (!im) return '';
  if (fitsCover(im) || (opts.allowSmall && (im.kind || 'photo') === 'photo')) return img(im, opts);
  return `<img class="blur-fill" src="${esc(im.thumb)}" alt="" aria-hidden="true" loading="lazy" decoding="async" />${img(im, { ...opts, cls: `${opts.cls || ''} is-contain` })}`;
}

// 이미지가 없는 프로젝트를 위한 활자 표지
function typeCover(p, cls = '') {
  const c = categoryOf(p.category);
  return `<div class="type-cover ${cls}" data-cat="${esc(p.category)}" aria-hidden="true">
    <span class="tc-cat">${esc(c.label)}</span>
    <b>${esc(p.titleEn || p.title)}</b>
    <span class="tc-year">${esc(p.year || '')}</span>
  </div>`;
}

function img(im, { cls = '', eager = false, full = false, sizes = '' } = {}) {
  if (!im) return '';
  return `<img class="${cls}" data-kind="${esc(im.kind || 'photo')}" src="${esc(full ? im.src : im.thumb)}" ${full ? '' : `srcset="${esc(im.thumb)} 720w, ${esc(im.src)} 1600w" sizes="${sizes || '(max-width: 820px) 100vw, 50vw'}"`} alt="${esc(im.caption)}" width="${im.w || ''}" height="${im.h || ''}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
}

export function projectCard(p, i, { cls = 'card' } = {}) {
  const c = categoryOf(p.category);
  return `<a class="${cls}" href="${p.path}" data-link data-cat="${esc(p.category)}">
    <figure class="card-media">${p.cover ? media(p.cover, { sizes: '(max-width: 820px) 60vw, 300px', allowSmall: true }) : typeCover(p)}<span class="card-open" aria-hidden="true">↗</span></figure>
    <div class="card-meta"><span class="card-no">${pad(i + 1)}</span><span>${[p.year, c.label].filter(Boolean).map(esc).join(' · ')}</span></div>
    <h3 class="card-title">${esc(p.title)}</h3>
  </a>`;
}

function bar(back) {
  return `<header class="pg-bar">
    <a class="pg-back" href="${back.href}" data-link>← ${esc(back.label)}</a>
    <a class="pg-brand" href="/" data-link aria-label="필름으로">KWON</a>
    <button type="button" class="pg-close" data-close aria-label="닫기"><i></i><i></i></button>
  </header>`;
}

// cat: 'all' 또는 'robotics,iot'처럼 쉼표로 이은 분야 목록
const catList = (cat) => (cat === 'all' ? null : cat.split(','));

function worksPage(cat) {
  const on = catList(cat);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, projects.filter((p) => p.category === c.id).length]));
  return `<div class="pg pg-works">
    ${bar({ href: '/', label: 'FILM' })}
    <section class="works-head">
      <p class="pg-kicker">PROJECT ARCHIVE — 권용현이 만든 것들</p>
      <h1 class="works-title">Works<sup>${pad(projects.length)}</sup></h1>
      <nav class="chips" aria-label="분야">
        <button type="button" data-cat="all" class="${cat === 'all' ? 'is-on' : ''}">All<sup>${projects.length}</sup></button>
        ${CATEGORIES.filter((c) => counts[c.id])
          .map((c) => `<button type="button" data-cat="${c.id}" class="${on?.includes(c.id) ? 'is-on' : ''}">${esc(c.label)}<sup>${counts[c.id]}</sup></button>`)
          .join('')}
      </nav>
    </section>
    <ul class="works-grid">
      ${projects
        .map(
          (p, i) => `<li class="w-item${on && !on.includes(p.category) ? ' is-out' : ''}" data-cat="${esc(p.category)}"${p.wide ? ' data-wide' : ''}>
            ${projectCard(p, i, { cls: 'w-card' })}
          </li>`
        )
        .join('')}
    </ul>
    ${footer()}
  </div>`;
}

// 넓은 카드는 줄 안에 자리가 있을 때만 두 칸을 쓴다 — 보이는 순서와 번호가 항상 일치
function layoutGrid(grid) {
  const cols = parseInt(getComputedStyle(grid).getPropertyValue('--cols'), 10) || 4;
  const items = [...grid.children].filter((li) => !li.classList.contains('is-out'));
  const narrow = new Set();
  const pass = () => {
    let col = 0;
    const wides = [];
    items.forEach((li, n) => {
      const span = li.hasAttribute('data-wide') && !narrow.has(li) && col + 2 <= cols ? 2 : 1;
      li.classList.toggle('is-wide', span === 2);
      if (span === 2) wides.push(li);
      col = (col + span) % cols;
      const no = li.querySelector('.card-no');
      if (no) no.textContent = pad(n + 1);
    });
    return { col, wides };
  };
  // 마지막 줄에 카드 한 장만 남으면 뒤쪽의 넓은 카드를 한 칸으로 줄여 다시 배치
  for (let guard = 0; guard < 8; guard++) {
    const { col, wides } = pass();
    if (cols < 3 || col !== 1 || !wides.length) break;
    narrow.add(wides[wides.length - 1]);
  }
  return cols;
}

function footer() {
  return `<footer class="pg-foot">
    <p>${esc(profile.name)} · ${esc(profile.en)} — ${esc(profile.role)}</p>
    <ul>${profile.links.map((l) => `<li><a href="${esc(l.url)}" ${l.url.startsWith('mailto') ? '' : 'target="_blank" rel="noopener"'}>${esc(l.label)}</a></li>`).join('')}</ul>
  </footer>`;
}

function detailPage(p) {
  const i = projects.indexOf(p);
  const next = projects[(i + 1) % projects.length];
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const c = categoryOf(p.category);
  const facts = [
    ['ROLE', p.role.join(' · ')],
    ['TEAM', p.team],
    ['PERIOD', p.period || p.year],
    ['TOOLS', p.tools.join(' · ')],
    ['AWARD', p.awards.join(' / ')],
  ].filter(([, v]) => v);
  const gallery = p.images;
  // 히어로 사진은 스토리에서 다시 쓰지 않고, 갤러리에는 스토리에 없던 사진만 — 같은 사진이 반복되지 않게
  const coverFile = p.cover?.file;
  const story = p.story.map((s) => (s.img && s.img.file === coverFile && p.story.length > 1 ? { ...s, img: null } : s));
  const storyImgs = new Set(story.map((s) => s.img?.file).filter(Boolean));
  const rest = gallery.map((im, k) => ({ im, k })).filter(({ im }) => !storyImgs.has(im.file) && im.file !== coverFile);
  const showGallery = rest.length > 0;
  return `<article class="pg pg-detail" data-cat="${esc(p.category)}">
    ${bar({ href: '/works', label: 'WORKS' })}
    <section class="d-hero${p.cover && p.cover.ratio >= 0.9 ? ' is-land' : ''}" style="--ar:${(p.cover?.ratio || 1).toFixed(3)}">
      <div class="d-hero-media">${p.cover ? media(p.cover, { eager: true, full: true }) : typeCover(p, 'is-hero')}</div>
      <div class="d-hero-text">
        <p class="d-cat"><span>${esc(c.label)}</span>${p.year ? `<span>${esc(p.year)}</span>` : ''}<span>${pad(i + 1)} / ${pad(projects.length)}</span></p>
        <h1 class="d-title">${esc(p.title)}</h1>
        ${p.titleEn && p.cover ? `<p class="d-en">${esc(p.titleEn)}</p>` : ''}
        <p class="d-one">${esc(p.oneLiner)}</p>
      </div>
      <span class="d-scroll" aria-hidden="true">SCROLL</span>
    </section>

    <section class="d-intro reveal">
      <p class="d-summary">${esc(p.summary)}</p>
      ${p.metrics.length ? `<dl class="d-metrics">${p.metrics.map((m) => `<div><dd>${esc(m.value)}</dd><dt>${esc(m.label)}</dt></div>`).join('')}</dl>` : ''}
      ${facts.length ? `<dl class="d-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    </section>

    ${
      story.length
        ? `<section class="d-story">${story
            .map(
              (s, k) => `<div class="st-row${s.img ? '' : ' no-img'} reveal">
                ${s.img ? `<button type="button" class="st-media" data-gallery="${gallery.indexOf(s.img)}" aria-label="${esc(s.img.caption)} 크게 보기">${img(s.img, { sizes: '(max-width: 820px) 100vw, 58vw' })}<span class="st-cap">${esc(s.img.caption)}</span></button>` : ''}
                <div class="st-text"><span class="st-label">${pad(k + 1)} — ${esc(s.label)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>
              </div>`
            )
            .join('')}</section>`
        : ''
    }

    ${
      p.videos.length
        ? `<section class="d-videos reveal"><h2 class="d-h">FILM<sup>${p.videos.length}</sup></h2>${p.videos
            .map((v) => {
              const yt = youtubeId(v.url);
              if (yt)
                return `<figure class="vid"><button type="button" class="yt" data-yt="${yt}" aria-label="${esc(v.caption || '영상')} 재생"><img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy" /><span class="yt-play" aria-hidden="true">▶</span></button><figcaption>${esc(v.caption)}</figcaption></figure>`;
              return `<figure class="vid"><video src="${esc(v.url)}" ${p.cover ? `poster="${esc(p.cover.src)}"` : ''} controls muted playsinline preload="metadata"></video><figcaption>${esc(v.caption)}</figcaption></figure>`;
            })
            .join('')}</section>`
        : ''
    }

    ${
      showGallery
        ? `<section class="d-gallery reveal"><h2 class="d-h">GALLERY<sup>${rest.length}</sup></h2>
          <div class="gal" data-n="${Math.min(rest.length, 3)}">${rest
            .map(
              ({ im, k }) => `<button type="button" class="gal-item" data-gallery="${k}" style="--ar:${Math.min(1.8, Math.max(0.6, im.ratio)).toFixed(3)}" aria-label="${esc(im.caption)} 크게 보기">${img(im, { sizes: '(max-width: 820px) 50vw, 25vw' })}<span class="gal-cap">${esc(im.caption)}</span></button>`
            )
            .join('')}</div></section>`
        : ''
    }

    ${
      p.links.length
        ? `<section class="d-links reveal"><h2 class="d-h">SOURCE</h2><ul>${p.links
            .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><i aria-hidden="true">↗</i></a></li>`)
            .join('')}</ul></section>`
        : ''
    }

    <nav class="d-next" aria-label="다른 프로젝트">
      <a class="d-prev-link" href="${prev.path}" data-link>← ${esc(prev.title)}</a>
      <a class="d-next-card" href="${next.path}" data-link>
        <div class="d-next-media">${next.cover ? media(next.cover, { sizes: '100vw' }) : typeCover(next)}</div>
        <span class="d-next-k">NEXT PROJECT — ${esc(categoryOf(next.category).label)}</span>
        <b class="d-next-t">${esc(next.title)}</b>
      </a>
    </nav>
    ${footer()}
  </article>`;
}

export function createSite({ lightbox, reducedMotion, onOpen, onClose }) {
  const page = document.getElementById('page');
  const curtain = document.getElementById('curtain');
  const curtainLabel = curtain.querySelector('.curtain-label');
  let current = null; // {name, id, cat}
  let filmEntered = false;
  let busy = false;
  let observer = null;
  let gridCols = 0;
  let backPending = false; // history.back()을 보냈고 popstate를 기다리는 중
  let pendingPop = false; // 커튼이 도는 동안 들어온 popstate
  let filmOpener = null; // 필름에서 페이지를 연 요소(닫으면 포커스를 돌려준다)

  addEventListener('resize', () => {
    const grid = page.querySelector('.works-grid');
    if (!grid) return;
    const cols = parseInt(getComputedStyle(grid).getPropertyValue('--cols'), 10);
    if (cols !== gridCols) gridCols = layoutGrid(grid);
  });

  const parse = () => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const m = path.match(/^\/works(?:\/([\w-]+))?$/);
    if (!m) return { name: 'film' };
    if (m[1]) {
      const id = m[1].toLowerCase();
      return byId(id) ? { name: 'detail', id } : { name: 'works', cat: 'all', missing: true };
    }
    const cat = new URLSearchParams(location.search).get('c');
    const valid = (cat || '').split(',').filter((c) => CATEGORIES.some((x) => x.id === c));
    return { name: 'works', cat: valid.length ? valid.join(',') : 'all' };
  };

  function sweep(label, between) {
    if (reducedMotion) {
      between();
      return Promise.resolve();
    }
    busy = true;
    curtainLabel.textContent = label || '';
    return new Promise((resolve) => {
      gsap
        .timeline({
          onComplete: () => {
            busy = false;
            resolve();
            // 전환 중에 뒤로/앞으로 가기를 눌렀다면 끝난 뒤 현재 주소로 맞춘다
            if (pendingPop) {
              pendingPop = false;
              apply(parse());
            }
          },
        })
        .set(curtain, { visibility: 'visible', yPercent: 100 })
        .to(curtain, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' })
        .fromTo(curtainLabel, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3 }, '-=0.15')
        .add(between)
        .to(curtainLabel, { autoAlpha: 0, duration: 0.2 }, '+=0.12')
        .to(curtain, { yPercent: -100, duration: 0.6, ease: 'power3.inOut' })
        .set(curtain, { visibility: 'hidden' });
    });
  }

  function mount(route) {
    if (route.name === 'works') page.innerHTML = worksPage(route.cat);
    else page.innerHTML = detailPage(byId(route.id));
    page.hidden = false;
    page.scrollTop = 0;
    document.body.classList.add('page-open');
    bind(route);
    const p = route.name === 'detail' ? byId(route.id) : null;
    document.title = p ? `${p.title} — 권용현 Physical AI Portfolio` : 'Works — 권용현 Physical AI Portfolio';
    page.focus({ preventScroll: true });
  }

  function unmount() {
    page.hidden = true;
    page.innerHTML = '';
    observer?.disconnect();
    document.body.classList.remove('page-open');
    document.title = '권용현 — Physical AI Portfolio';
  }

  function bind(route) {
    // 이미지 로드 페이드
    page.querySelectorAll('img').forEach((im) => {
      if (im.complete) im.classList.add('is-loaded');
      else im.addEventListener('load', () => im.classList.add('is-loaded'), { once: true });
    });
    // 스크롤 등장
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            observer.unobserve(e.target);
          }
        }),
      { root: page, rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    page.querySelectorAll('.reveal, .w-item').forEach((el) => observer.observe(el));

    if (route.name === 'works') {
      const grid = page.querySelector('.works-grid');
      gridCols = layoutGrid(grid);
      page.querySelector('.chips').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-cat]');
        if (!b) return;
        const cat = b.dataset.cat;
        page.querySelectorAll('.chips button').forEach((x) => x.classList.toggle('is-on', x === b));
        const items = [...page.querySelectorAll('.w-item')];
        items.forEach((li) => li.classList.toggle('is-out', cat !== 'all' && li.dataset.cat !== cat));
        gridCols = layoutGrid(grid);
        history.replaceState(history.state, '', cat === 'all' ? '/works' : `/works?c=${cat}`);
        gsap.fromTo(items.filter((li) => !li.classList.contains('is-out')), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.03, ease: 'power3.out' });
      });
      gsap.fromTo(page.querySelectorAll('.works-title, .chips button'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.04, ease: 'expo.out', delay: 0.2 });
    } else {
      const p = byId(route.id);
      const media = p.images.map((im) => ({ type: 'image', src: im.src, caption: im.caption }));
      page.querySelectorAll('[data-gallery]').forEach((b) =>
        b.addEventListener('click', () => lightbox.show({ media }, +b.dataset.gallery, b))
      );
      page.querySelectorAll('[data-yt]').forEach((b) =>
        b.addEventListener('click', () => {
          b.outerHTML = `<iframe class="yt-frame" src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
        })
      );
      const heroMedia = page.querySelectorAll('.d-hero-media > *');
      if (heroMedia.length && !reducedMotion) gsap.fromTo(heroMedia, { scale: 1.12 }, { scale: 1, duration: 2.2, ease: 'expo.out' });
      gsap.fromTo(page.querySelectorAll('.d-hero-text > *'), { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.25 });
    }
    page.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  }

  async function apply(route, { animate = true } = {}) {
    if (lightbox.open) lightbox.close();
    // 없는 프로젝트 주소는 아카이브 주소로 바로잡는다
    if (route.missing) history.replaceState(history.state, '', '/works');
    if (current && route.name === current.name && route.id === current.id && route.cat === current.cat) return;
    const prev = current;
    current = route.name === 'film' ? null : route;
    if (route.name === 'film') {
      if (!prev) return onClose?.();
      const back = () => {
        unmount();
        onClose?.();
        if (filmOpener?.isConnected) filmOpener.focus({ preventScroll: true });
        filmOpener = null;
      };
      if (animate) await sweep('', back);
      else back();
      return;
    }
    const label = route.name === 'detail' ? byId(route.id).title : 'WORKS';
    const doMount = () => {
      onOpen?.(route);
      mount(route);
    };
    if (animate) await sweep(label, doMount);
    else doMount();
  }

  function navigate(href, { replace = false } = {}) {
    if (busy) return;
    const url = new URL(href, location.origin);
    if (url.pathname + url.search === location.pathname + location.search) return;
    // depth: 필름에서 몇 단계 들어왔는지(닫기 버튼이 필름으로 바로 돌아가도록)
    const depth = url.pathname === '/' ? 0 : current ? (history.state?.app ? history.state.depth : 1) + 1 : 1;
    // fromFilm: 바로 앞 기록이 필름일 때만 닫기에서 history.back()을 쓴다
    const fromFilm = !current && url.pathname !== '/';
    if (fromFilm) filmOpener = document.activeElement;
    const state = { app: true, depth, fromFilm };
    if (replace) history.replaceState(state, '', url.pathname + url.search);
    else history.pushState(state, '', url.pathname + url.search);
    apply(parse());
  }

  function close() {
    if (busy || backPending) return; // 두 번 눌러 포트폴리오 밖으로 나가지 않게
    // 필름에서 한 단계 들어왔다면 뒤로 가기, 아니면 필름으로 새로 이동
    if (filmEntered && history.state?.fromFilm) {
      backPending = true;
      setTimeout(() => (backPending = false), 1500);
      history.back();
    } else navigate('/');
  }

  // 히어로 패럴랙스(리스너는 하나만)
  page.addEventListener(
    'scroll',
    () => {
      const media0 = page.querySelector('.d-hero-media');
      const y = page.scrollTop;
      const stacked = innerWidth <= 820 && media0?.parentElement.classList.contains('is-land');
      if (media0 && !reducedMotion && !stacked && y < innerHeight * 1.2) media0.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;
    },
    { passive: true }
  );

  // 내부 링크 가로채기
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute('href');
    if (!href || isExternal(href)) return;
    e.preventDefault();
    navigate(href);
  });
  addEventListener('popstate', () => {
    backPending = false;
    if (busy) {
      pendingPop = true;
      return;
    }
    apply(parse());
  });

  return {
    initial: parse(),
    start(route) {
      if (route.name === 'film') return;
      // 바로 들어온 페이지도 깊이 1로 기록해 두면 그 안에서 이동한 뒤 닫기가 필름으로 간다
      history.replaceState({ app: true, depth: 1, fromFilm: false }, '', location.pathname + location.search);
      apply(route, { animate: false });
    },
    markFilm() {
      filmEntered = true;
    },
    navigate,
    close,
    get open() {
      return !!current;
    },
    get busy() {
      return busy;
    },
    key(e) {
      if (!current) return busy; // 닫히는 커튼 동안에는 필름 단축키를 막는다
      if (e.key === 'Escape') {
        close();
        return true;
      }
      return true; // 페이지가 열려 있으면 필름 단축키를 막는다
    },
  };
}
