import gsap from 'gsap';
import { profile } from '../content.js';

// 빈 선택자에 대한 GSAP 경고를 피한다
const has = (t) => t && (t.length === undefined || t.length > 0);
const set = (t, v) => has(t) && gsap.set(t, v);

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');

const lines = (arr, cls = '') => arr.map((l) => `<span class="line ${cls}"><span>${esc(l)}</span></span>`).join('');

function kicker(scene, i) {
  return `<p class="kicker" data-r><span class="kicker-no">SC ${pad(i)}</span><span class="kicker-txt">${esc(scene.kicker)}</span></p>`;
}

function items(list = []) {
  if (!list.length) return '';
  return `<ol class="items">${list
    .map(
      (it) => `<li class="item" data-r>
        <span class="item-year">${esc(it.year)}</span>
        <div class="item-body">
          <h3>${esc(it.title)}${it.badge ? ` <em class="badge">${esc(it.badge)}</em>` : ''}</h3>
          <p>${esc(it.text)}</p>
          ${it.tags ? `<ul class="tags">${it.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        </div>
      </li>`
    )
    .join('')}</ol>`;
}

function stats(list = []) {
  if (!list.length) return '';
  return `<dl class="stats" data-r>${list
    .map((s) => `<div class="stat"><dt>${esc(s.label)}</dt><dd><b data-count="${esc(s.value)}">${esc(s.value)}</b>${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</dd></div>`)
    .join('')}</dl>`;
}

function mediaRail(scene, side) {
  if (!scene.media?.length) return '';
  return `<div class="media-rail rail-${side}" data-r>
    <span class="rail-label">FOOTAGE · 실제 기록</span>
    <div class="rail-strip">${scene.media
      .map(
        (m, i) => `<button type="button" class="thumb${m.type === 'video' ? ' is-video' : ''}" data-media="${i}" aria-label="${esc(m.caption)} 크게 보기">
          <img src="${esc(m.poster || m.src)}" alt="${esc(m.caption)}" loading="lazy" decoding="async" />
          <span class="thumb-no">${pad(i + 1)}</span>
          ${m.type === 'video' ? '<span class="thumb-play" aria-hidden="true">▶</span>' : ''}
          <span class="thumb-cap">${esc(m.caption)}</span>
        </button>`
      )
      .join('')}</div>
  </div>`;
}

function render(scene, i) {
  const L = scene.layout;
  if (L === 'hero') {
    return `<div class="hero">
      <p class="kicker" data-r><span class="kicker-txt">${esc(scene.kicker)}</span></p>
      <h1 class="hero-title" aria-label="${esc(scene.title.join(' '))}">${scene.title
        .map((w, j) => `<span class="line${j === 1 ? ' accent' : ''}"><span>${[...w].map((c) => `<i>${esc(c)}</i>`).join('')}</span></span>`)
        .join('')}</h1>
      <div class="hero-foot">
        <div class="hero-id" data-r>
          <p class="hero-name">${esc(scene.name)}</p>
          <p class="hero-lead">${esc(scene.lead)}</p>
        </div>
        <ul class="hero-tags" data-r>${scene.tags.map((t, j) => `<li><span>${pad(j + 1)}</span>${esc(t)}</li>`).join('')}</ul>
      </div>
    </div>`;
  }
  if (L === 'loop') {
    return `<div class="loop">
      <div class="loop-head panel-content">
        ${kicker(scene, i)}
        <h2 class="title title-loop">${lines(scene.title)}</h2>
        <p class="lead" data-r>${esc(scene.lead)}</p>
      </div>
      <div class="loop-grid panel-content">
        ${scene.loop
          .map(
            (c, j) => `<section class="loop-col" data-r>
              <header><span class="loop-no">${pad(j + 1)}</span><h3>${esc(c.key)}</h3><span class="loop-ko">${esc(c.ko)}</span></header>
              <ul>${c.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </section>`
          )
          .join('<span class="loop-arrow" aria-hidden="true" data-r>→</span>')}
      </div>
      <ul class="tool-chips panel-content" data-r>${scene.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>`;
  }
  if (L === 'finale') {
    return `<div class="finale">
      <div class="credits" aria-label="엔딩 크레딧">
        <div class="credits-roll">
          <p class="credits-kicker">${esc(scene.kicker)}</p>
          <p class="credits-title">PHYSICAL AI<br /><span>a portfolio film</span></p>
          ${scene.credits.map(([r, n]) => `<div class="credit"><span>${esc(r)}</span><b>${esc(n)}</b></div>`).join('')}
          <p class="credits-thanks">감사합니다</p>
        </div>
        <button type="button" class="skip" id="skip-credits">SKIP ▸</button>
      </div>
      <div class="endcard panel-content">
        <p class="endcard-kicker" data-r>THE END — 그리고 다음 장면</p>
        <h2 class="title title-end">${lines(scene.end)}</h2>
        <p class="endcard-en" data-r>${esc(scene.endEn)}</p>
        <ul class="contact" data-r>${profile.links
          .map(
            (l) => `<li><a href="${esc(l.url)}" ${l.url.startsWith('mailto') ? '' : 'target="_blank" rel="noopener"'}><span>${esc(l.label)}</span><b>${esc(l.value)}</b><i aria-hidden="true">↗</i></a></li>`
          )
          .join('')}</ul>
        <div class="endcard-actions" data-r>
          <button type="button" class="btn-replay" id="btn-replay"><span aria-hidden="true">↺</span> 처음부터 다시 보기</button>
          <span class="sig">${esc(profile.name)} · ${esc(profile.en)} — ${esc(profile.role)}</span>
        </div>
      </div>
    </div>`;
  }
  // split-left / split-right
  const side = L === 'split-left' ? 'right' : 'left';
  let body = '';
  if (scene.subtitle) body += `<p class="subtitle" data-r>${esc(scene.subtitle)}</p>`;
  if (scene.lead) body += `<p class="lead" data-r>${esc(scene.lead)}</p>`;
  if (scene.pillars)
    body += `<div class="pillars">${scene.pillars
      .map((p) => `<article class="pillar" data-r><span class="pillar-no">${esc(p.no)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`)
      .join('')}</div>`;
  if (scene.facts) body += `<ul class="facts" data-r>${scene.facts.map(([k, v]) => `<li><span>${esc(k)}</span>${esc(v)}</li>`).join('')}</ul>`;
  body += stats(scene.stats);
  if (scene.counters)
    body += `<dl class="counters" data-r>${scene.counters
      .map((c) => `<div><dd><b data-count="${c.value}">${c.value}</b></dd><dt>${esc(c.label)}</dt></div>`)
      .join('')}</dl>`;
  if (scene.highlights)
    body += `<ol class="highlights">${scene.highlights
      .map((h) => `<li data-r><span class="hl-year">${esc(h.year)}</span><span class="hl-title">${esc(h.title)}</span><em>${esc(h.grade)}</em></li>`)
      .join('')}</ol>`;
  if (scene.timeline)
    body += `<ol class="mini-timeline" data-r>${scene.timeline.map(([y, t]) => `<li><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}</ol>`;
  body += items(scene.items);
  return `<div class="split">
    <div class="col panel-content">
      ${kicker(scene, i)}
      <h2 class="title${scene.titleKo ? ' title-ko' : ''}">${lines(scene.title)}</h2>
      ${body}
    </div>
    ${mediaRail(scene, side)}
  </div>`;
}

export function createPanels(root, scenes, { onMedia, onReplay, reducedMotion }) {
  const panels = scenes.map((scene, i) => {
    const el = document.createElement('section');
    el.className = `panel layout-${scene.layout}`;
    el.dataset.scene = scene.id;
    el.setAttribute('aria-label', `${pad(i)} ${scene.label}`);
    el.innerHTML = render(scene, i);
    el.hidden = true;
    el.inert = true;
    root.appendChild(el);
    el.querySelectorAll('[data-media]').forEach((b) => b.addEventListener('click', () => onMedia(scene, +b.dataset.media, b)));
    return el;
  });

  let current = -1;
  let creditsTl = null;
  const D = reducedMotion ? 0.01 : 1;

  function countUp(el) {
    el.querySelectorAll('[data-count]').forEach((b) => {
      const raw = b.dataset.count;
      const target = parseFloat(raw);
      if (!/^[\d.]+$/.test(raw) || Number.isNaN(target)) return;
      const dec = raw.includes('.') ? raw.split('.')[1].length : 0;
      const o = { v: 0 };
      gsap.to(o, {
        v: target,
        duration: 1.6 * D,
        ease: 'power3.out',
        onUpdate: () => (b.textContent = o.v.toFixed(dec)),
        onComplete: () => (b.textContent = raw),
      });
    });
  }

  function hide(i) {
    const el = panels[i];
    if (!el) return;
    el.inert = true;
    gsap.killTweensOf(el);
    gsap.to(el, {
      autoAlpha: 0,
      y: -18,
      filter: 'blur(8px)',
      duration: 0.55 * D,
      ease: 'power2.in',
      onComplete: () => {
        el.hidden = true;
        gsap.set(el, { y: 0, filter: 'none' });
      },
    });
    if (creditsTl && panels[i].dataset.scene === 'finale') {
      creditsTl.kill();
      creditsTl = null;
    }
  }

  function show(i, delay = 0) {
    const el = panels[i];
    el.hidden = false;
    el.inert = false;
    gsap.killTweensOf(el);
    gsap.set(el, { autoAlpha: 1, y: 0, filter: 'none' });
    const tl = gsap.timeline({ delay: delay * D });
    // 엔딩 카드는 크레딧이 끝난 뒤 따로 등장한다
    const own = (sel) => [...el.querySelectorAll(sel)].filter((n) => !n.closest('.endcard'));
    const titleSpans = own('.title .line > span, .hero-title .line > span');
    const heroChars = own('.hero-title i');
    const reveal = own('[data-r]');
    set(reveal, { autoAlpha: 0, y: 22 });
    if (heroChars.length) {
      set(heroChars, { yPercent: 115, rotate: 6 });
      tl.to(heroChars, { yPercent: 0, rotate: 0, duration: 1.3 * D, ease: 'expo.out', stagger: 0.045 * D }, 0.1);
    } else {
      set(titleSpans, { yPercent: 112 });
      if (has(titleSpans)) tl.to(titleSpans, { yPercent: 0, duration: 1.1 * D, ease: 'expo.out', stagger: 0.09 * D }, 0);
    }
    if (has(reveal)) tl.to(reveal, { autoAlpha: 1, y: 0, duration: 0.8 * D, ease: 'power3.out', stagger: 0.055 * D }, heroChars.length ? 0.6 : 0.25);
    tl.add(() => countUp(el), 0.4);
    const col = el.querySelector('.col');
    if (col) col.scrollTop = 0;

    if (el.dataset.scene === 'finale') runCredits(el, delay);
  }

  function runCredits(el, delay) {
    const roll = el.querySelector('.credits-roll');
    const credits = el.querySelector('.credits');
    const card = el.querySelector('.endcard');
    const skip = el.querySelector('#skip-credits');
    gsap.set(card, { autoAlpha: 0 });
    gsap.set(credits, { autoAlpha: 1 });
    gsap.set(card.querySelectorAll('.title .line > span'), { yPercent: 112 });
    gsap.set(card.querySelectorAll('[data-r]'), { autoAlpha: 0, y: 22 });
    const showCard = () => {
      if (!creditsTl) return;
      creditsTl.kill();
      creditsTl = gsap.timeline();
      creditsTl
        .to(credits, { autoAlpha: 0, duration: 0.6 })
        .set(card, { autoAlpha: 1 })
        .to(card.querySelectorAll('.title .line > span'), { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12 })
        .to(card.querySelectorAll('[data-r]'), { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, '-=0.8');
    };
    creditsTl = gsap.timeline({ delay: delay * D });
    if (reducedMotion) {
      creditsTl.add(showCard, 0.5);
    } else {
      creditsTl.fromTo(roll, { yPercent: 0, y: () => credits.clientHeight }, { yPercent: -100, y: 0, duration: 16, ease: 'none' }).add(showCard);
    }
    skip.onclick = showCard;
  }

  panels.forEach((el) => el.querySelector('#btn-replay')?.addEventListener('click', onReplay));

  return {
    panels,
    go(i, prev, duration) {
      if (prev >= 0) hide(prev);
      current = i;
      const delay = prev < 0 ? 0.9 : Math.max(0.5, duration * 0.62);
      show(i, delay);
    },
    get current() {
      return panels[current];
    },
  };
}
