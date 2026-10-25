// ── 화면 넘김 덱: 스크롤 없이 한 화면씩(발표 자료 /present) ──
// 내용은 쪽(data-sec) → 묶음(data-grp) → 블록으로 적어 두고, 지금 화면 크기에서 블록 높이를 재어 화면마다 넘치지 않게 나눠 담는다.
// - 'cols' 묶음은 넓은 화면에서 두 단(높이를 고르게), 좁은 화면에서는 한 단
// - 목록 블록(data-split)은 줄 단위로 다음 단 · 다음 화면에 이어지고, 이어진 쪽 위에 data-cont 한 줄을 단다
// - 그래도 한 블록이 화면보다 크면(아주 낮은 화면) 그 화면만 살짝 줄여 담는다 — 어느 화면에서도 잘리지 않는다
// 넘기기: 끌기(손가락 · 마우스를 그대로 따라온다 — 옆으로, 위아래로) · 휠 · ← → · 쪽 탭 · 아래 진행 막대.
// 화면 크기가 바뀌면 다시 나눠 담고 보던 자리를 지킨다.
import gsap from 'gsap';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = (n) => String(n).padStart(2, '0');
const hOf = (n) => n.getBoundingClientRect().height;
const el = (tag, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};

export function createPager(root, { reducedMotion = false, start = '' } = {}) {
  const view = root.querySelector('.jr-view');
  const track = root.querySelector('.jr-track');
  const live = root.querySelector('.jr-live');
  const countEl = root.querySelector('.jr-count');
  const progEl = root.querySelector('.jr-prog');
  const barLine = root.querySelector('.pg-progress');
  const tabBtns = [...root.querySelectorAll('[data-go]')];
  const navBtns = [...root.querySelectorAll('.jr-nav')];
  const srcEl = root.querySelector('.jr-src');
  const fullBtn = root.querySelector('[data-full]');

  const SECS = [...srcEl.querySelectorAll('[data-sec]')].map((s) => ({ id: s.dataset.sec, no: s.dataset.no || '', title: s.dataset.title || '', short: s.dataset.short || s.dataset.title || '' }));
  const GROUPS = [...srcEl.querySelectorAll('[data-grp]')].map((g) => ({
    id: g.dataset.grp,
    sec: SECS.find((s) => s.id === g.closest('[data-sec]').dataset.sec),
    title: g.dataset.title || '',
    cols: g.dataset.layout === 'cols',
    anchors: (g.dataset.anchor || '').split(/\s+/).filter(Boolean),
    stage: g.dataset.stage || '',
    q: g.dataset.q || '',
    head: g.querySelector(':scope > [data-head]'),
    blocks: [...g.children].filter((b) => !b.hasAttribute('data-head')),
  }));
  srcEl.remove();

  const state = { x: 0 };
  let slides = [];
  let segs = [];
  let index = 0;
  let W = 1;
  let near = new Set();
  let alive = true;
  let jumping = false;

  // 화면 한 장의 뼈대: 위 한 줄(쪽 · 묶음 · 몇째 화면) + 가운데 본문
  function shell(g) {
    const s = el('section', 'jr-slide');
    s.dataset.sec = g.sec.id;
    if (g.stage) s.dataset.stage = g.stage;
    if (g.q) s.dataset.q = g.q;
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', '화면');
    s.innerHTML = '<div class="jr-in"><p class="jr-eye"><b></b><span class="jr-eye-s"></span><span class="jr-eye-g"></span><em></em></p><div class="jr-body"><div class="jr-fit"></div></div></div>';
    s.querySelector('.jr-eye b').textContent = g.sec.no;
    s.querySelector('.jr-eye-s').textContent = g.sec.title;
    s.querySelector('.jr-eye-g').textContent = g.title;
    return s;
  }

  // 재는 자리: 화면 한 장과 같은 크기 · 같은 폭(한 단 · 두 단)
  const meas = (() => {
    const s = shell(GROUPS[0]);
    s.classList.add('is-measure');
    s.setAttribute('aria-hidden', 'true');
    s.inert = true;
    const body = s.querySelector('.jr-body');
    const box = el('div', 'jr-mbox');
    box.innerHTML = '<div class="jr-mfull"></div><div class="jr-cols"><div class="jr-col"></div><div class="jr-col"></div></div>';
    body.append(box);
    view.append(s);
    return { body, full: box.querySelector('.jr-mfull'), col: box.querySelector('.jr-col') };
  })();

  // 목록 블록의 줄(위끝이 같은 아이들)
  function rowsOf(b) {
    const box = b.getBoundingClientRect();
    const rows = [];
    for (const k of b.children) {
      if (k.classList.contains('jr-cont')) continue;
      const r = k.getBoundingClientRect();
      const last = rows[rows.length - 1];
      if (last && Math.abs(r.top - last.top) < 3) {
        last.kids.push(k);
        last.bottom = Math.max(last.bottom, r.bottom);
      } else rows.push({ top: r.top, bottom: r.bottom, kids: [k] });
    }
    const tail = rows.length ? box.bottom - Math.max(...rows.map((x) => x.bottom)) : 0;
    return { rows, top: box.top, tail };
  }

  // 남은 높이(room)에 몇 줄이 들어가는지(블록은 건드리지 않는다)
  function planCut(b, room, fresh) {
    if (!b.hasAttribute('data-split')) return null;
    const info = rowsOf(b);
    const { rows, top, tail } = info;
    if (rows.length < 2) return null;
    // 빈 단이 아니면 적어도 두 줄은 함께(한 줄만 덩그러니 남지 않게)
    const least = fresh ? 1 : Math.min(2, rows.length - 1);
    let r = 0;
    for (let k = rows.length - 1; k >= least; k--) {
      if (rows[k - 1].bottom - top + tail <= room) {
        r = k;
        break;
      }
    }
    if (!r) return null;
    // 다음 쪽에 한 줄만 넘어가지 않게(세 줄 이상이면 한 줄 덜 남긴다)
    if (rows.length >= 3 && rows.length - r === 1 && r - 1 >= least) r--;
    return { ...info, r };
  }
  // 계획대로 나누기: 앞 줄은 이 블록에 남기고, 나머지 줄은 새 블록(이어서 한 줄 + 나머지)으로
  function doCut(b, pl, host) {
    const rest = b.cloneNode(false);
    rest.classList.add('is-rest');
    b._orig = b._orig || b;
    rest._orig = b._orig;
    if (b.dataset.cont) {
      const c = el('p', 'jr-cont');
      c.textContent = b.dataset.cont;
      rest.append(c);
    }
    pl.rows.slice(pl.r).forEach((row) => rest.append(...row.kids));
    host.append(rest);
    return { part: b, partH: hOf(b), rest, restH: hOf(rest) };
  }
  const cut = (b, room, fresh, host) => {
    const pl = planCut(b, room, fresh);
    return pl && doCut(b, pl, host);
  };

  // 두 단의 높이를 고르게(순서는 그대로, 왼쪽 단 → 오른쪽 단)
  function balance(p, hs, gap, host) {
    let items = p.cols.flat();
    // 목록 하나만 남은 화면: 두 단에 반씩
    if (items.length === 1 && items[0].hasAttribute('data-split')) {
      const c = cut(items[0], hs.get(items[0]) * 0.56, true, host);
      if (c && c.restH <= p.cap) {
        hs.set(c.part, c.partH);
        hs.set(c.rest, c.restH);
        p.cols = [[c.part], [c.rest]];
      }
      return;
    }
    if (items.length < 2) return;
    const sum = (arr) => arr.reduce((s, b, k) => s + hs.get(b) + (k ? gap : 0), 0);
    let best = null;
    for (let k = 1; k < items.length; k++) {
      const a = sum(items.slice(0, k));
      const b = sum(items.slice(k));
      if (a > p.cap || b > p.cap) continue;
      const m = Math.max(a, b);
      if (!best || m < best.m - 0.5) best = { k, m };
    }
    if (best) p.cols = [items.slice(0, best.k), items.slice(best.k)];
  }

  // 같은 단에 이어 붙은 조각은 하나로, 같은 화면의 옆 단으로 이어진 목록은 '이어서' 줄 없이
  function tidy(p) {
    p.cols = p.cols.map((col) =>
      col.reduce((acc, b) => {
        const prev = acc[acc.length - 1];
        if (prev && b._orig && prev._orig === b._orig) {
          [...b.children].forEach((k) => !k.classList.contains('jr-cont') && prev.append(k));
          return acc;
        }
        acc.push(b);
        return acc;
      }, [])
    );
    const all = p.cols.flat();
    all.forEach((b) => {
      if (b.classList.contains('is-rest') && all.some((x) => x !== b && x._orig === b._orig && all.indexOf(x) < all.indexOf(b))) b.querySelector(':scope > .jr-cont')?.remove();
    });
  }

  function packGroup(g, avail, gap, two, out) {
    const ncol = g.cols && two ? 2 : 1;
    const host = ncol === 2 ? meas.col : meas.full;
    const head = g.head ? g.head.cloneNode(true) : null;
    if (head) meas.full.append(head);
    const queue = g.blocks.map((b) => b.cloneNode(true));
    host.append(...queue);
    const headH = head ? hOf(head) : 0;
    const hs = new Map(queue.map((b) => [b, hOf(b)]));
    const pages = [];
    let cur;
    let ci = 0;
    let used = 0;
    const open = (withHead) => {
      cur = { head: withHead ? head : null, cols: Array.from({ length: ncol }, () => []), cap: avail - (withHead && head ? headH + gap : 0) };
      pages.push(cur);
      ci = 0;
      used = 0;
    };
    const next = () => {
      if (ci + 1 < ncol) {
        ci++;
        used = 0;
      } else open(false);
    };
    open(true);
    let i = 0;
    while (i < queue.length) {
      const b = queue[i];
      const h = hs.get(b);
      const lead = used ? gap : 0;
      if (used + lead + h <= cur.cap) {
        cur.cols[ci].push(b);
        used += lead + h;
        i++;
        continue;
      }
      // 옆 단에 통째로 들어가면 쪼개지 않고 옆 단으로
      if (used && ci + 1 < ncol && h <= cur.cap) {
        next();
        continue;
      }
      // 묶음의 마지막 블록이 조금(8% 이내) 넘치면 새 화면 대신 이 화면을 살짝 줄여 담는다
      if (used && i === queue.length - 1 && used + lead + h <= cur.cap * 1.08) {
        cur.cols[ci].push(b);
        used += lead + h;
        i++;
        continue;
      }
      const pl = planCut(b, cur.cap - used - lead, used === 0);
      // 한 단 묶음의 마지막 목록에서 한 줄만 다음 화면으로 넘어가게 되면 → 통째로 다음 화면에(거기에 다 들어갈 때)
      if (pl && used && ncol === 1 && i === queue.length - 1 && pl.rows.length - pl.r === 1 && h <= avail) {
        next();
        continue;
      }
      const c = pl && doCut(b, pl, host);
      if (c) {
        cur.cols[ci].push(c.part);
        hs.set(c.part, c.partH);
        queue[i] = c.rest;
        hs.set(c.rest, c.restH);
        next();
        continue;
      }
      if (used === 0) {
        // 빈 단에도 안 들어가는 블록: 머리와 함께인 첫 화면에서 조금 넘치면 그 화면을 줄이고, 많이 넘치면 다음 화면(머리 없이 넓게)으로
        if (cur.head && pages.length === 1 && ci === 0 && (h <= avail || b.hasAttribute('data-split')) && h > cur.cap * 1.22) {
          open(false);
          continue;
        }
        cur.cols[ci].push(b);
        used = h;
        i++;
        continue;
      }
      next();
    }
    while (pages.length > 1 && !pages[pages.length - 1].cols.some((c) => c.length)) pages.pop();
    if (ncol === 2) pages.forEach((p, k) => (k === pages.length - 1 || !p.cols[1].length) && balance(p, hs, gap, host));
    pages.forEach(tidy);
    pages.forEach((p, k) => out.push({ g, ncol, part: k, parts: pages.length, head: p.head, cols: p.cols }));
  }

  function pack() {
    meas.full.textContent = '';
    meas.col.textContent = '';
    const avail = meas.body.clientHeight;
    const gap = parseFloat(getComputedStyle(meas.full).rowGap) || 0;
    const two = meas.col.getBoundingClientRect().width < meas.full.getBoundingClientRect().width * 0.75;
    const out = [];
    GROUPS.forEach((g) => packGroup(g, avail, gap, two, out));
    return out;
  }

  // 넘치는 화면(아주 낮은 화면)만 줄여 담는다 — 위끝을 기준으로 줄이고 줄어든 만큼 자리도 줄여 가운데에 선다
  function fitSlide(s) {
    const body = s.fit.parentElement;
    s.fit.style.transform = '';
    s.fit.style.marginBottom = '';
    const h = s.fit.offsetHeight;
    const room = body.clientHeight;
    if (h <= room + 1) return;
    const k = Math.max(0.55, room / h);
    s.fit.style.transform = `scale(${k.toFixed(4)})`;
    s.fit.style.marginBottom = `${(-h * (1 - k)).toFixed(1)}px`;
    s.el.classList.add('is-scaled');
  }

  function render(list) {
    track.textContent = '';
    near = new Set();
    slides = list.map((s, k) => {
      const node = shell(s.g);
      const fit = node.querySelector('.jr-fit');
      if (s.head) fit.append(s.head);
      if (s.ncol === 2) {
        const cols = el('div', 'jr-cols');
        s.cols.forEach((c) => {
          const col = el('div', 'jr-col');
          col.append(...c);
          cols.append(col);
        });
        fit.append(cols);
      } else fit.append(...s.cols[0]);
      node.querySelector('.jr-eye em').textContent = s.parts > 1 ? `${s.part + 1} / ${s.parts}` : '';
      node.setAttribute('aria-label', `${k + 1} / ${list.length} — ${[s.g.sec.title, s.g.title].filter(Boolean).join(' · ')}${s.parts > 1 ? ` (${s.part + 1}/${s.parts})` : ''}`);
      track.append(node);
      return { ...s, el: node, in: node.querySelector('.jr-in'), fit };
    });
    meas.full.textContent = '';
    meas.col.textContent = '';
    slides.forEach(fitSlide);
    buildProgress();
  }

  // 아래 진행 막대: 쪽마다 한 칸(화면 수만큼 넓게) — 지금 쪽은 읽은 만큼 찬다, 누르면 그 쪽 처음으로
  function buildProgress() {
    segs = SECS.map((s) => ({ s, from: slides.findIndex((x) => x.g.sec === s), n: slides.filter((x) => x.g.sec === s).length })).filter((x) => x.n);
    progEl.textContent = '';
    segs.forEach((x) => {
      const li = el('li');
      li.style.flex = `${x.n} 1 0`;
      const b = el('button');
      b.type = 'button';
      b.dataset.seg = x.s.id;
      b.setAttribute('aria-label', `${x.s.title} — ${x.n}화면`);
      const i = el('i');
      const t = el('span');
      t.textContent = x.s.short;
      b.append(i, t);
      li.append(b);
      progEl.append(li);
    });
  }

  function sync() {
    const s = slides[index];
    if (!s) return;
    countEl.querySelector('b').textContent = pad(index + 1);
    countEl.querySelector('span').textContent = pad(slides.length);
    navBtns.forEach((b) => (b.disabled = +b.dataset.dir < 0 ? index === 0 : index === slides.length - 1));
    tabBtns.forEach((b) => b.setAttribute('aria-current', String(b.dataset.go === s.g.sec.id)));
    segs.forEach((x, k) => {
      const li = progEl.children[k];
      li.style.setProperty('--p', index < x.from ? '0' : index >= x.from + x.n ? '1' : ((index - x.from + 1) / x.n).toFixed(3));
      li.classList.toggle('is-on', s.g.sec === x.s);
    });
    barLine?.style.setProperty('--sp', slides.length > 1 ? (index / (slides.length - 1)).toFixed(4) : '1');
    live.textContent = s.el.getAttribute('aria-label');
  }

  // 지금 화면과 양옆만 그린다(나머지는 칠하지 않는다)
  function setNear(list) {
    const want = new Set(list.filter((k) => k >= 0 && k < slides.length));
    near.forEach((k) => {
      if (want.has(k) || !slides[k]) return;
      slides[k].el.classList.remove('is-near');
      slides[k].in.style.transform = '';
      slides[k].in.style.opacity = '';
    });
    want.forEach((k) => slides[k].el.classList.add('is-near'));
    near = want;
  }

  // 사진은 지금 화면과 가까운 화면 것만 받는다
  function warm() {
    for (let k = index - 1; k <= index + 2; k++) {
      slides[k]?.el.querySelectorAll('img[data-src]').forEach((im) => {
        if (im.dataset.srcset) im.srcset = im.dataset.srcset;
        im.src = im.dataset.src;
        im.removeAttribute('data-src');
        im.removeAttribute('data-srcset');
        const done = () => im.classList.add('is-loaded');
        if (im.complete && im.naturalWidth) done();
        else im.addEventListener('load', done, { once: true });
      });
    }
  }

  // 주소의 #는 지금 화면의 묶음 자리(#y2024 · #swot-w …) — 표지는 # 없이
  function hash() {
    const a = slides[index].g.anchors[0] || '';
    const url = `${location.pathname}${location.search}${a ? `#${a}` : ''}`;
    if (url !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(history.state, '', url);
  }

  function settle() {
    if (!alive || !slides.length) return;
    slides.forEach((s, k) => {
      const on = k === index;
      s.el.inert = !on;
      s.el.setAttribute('aria-hidden', String(!on));
    });
    setNear([index - 1, index, index + 1]);
    paint(state.x);
    warm();
    hash();
    // 보던 화면이 숨겨지면 포커스를 덱으로(사라진 링크에 남지 않게)
    if (document.activeElement && !document.activeElement.isConnected) view.focus({ preventScroll: true });
    else if (document.activeElement?.closest?.('.jr-slide[aria-hidden="true"]')) view.focus({ preventScroll: true });
  }

  // 깊이: 가운데에서 멀어지는 화면의 글은 조금 덜 움직이고(시차) 작아지며 흐려진다
  function paint(px) {
    track.style.transform = `translate3d(${px.toFixed(2)}px, 0, 0)`;
    if (reducedMotion) return;
    near.forEach((k) => {
      const s = slides[k];
      if (!s) return;
      const off = clamp((k * W + px) / W, -1, 1);
      const a = Math.abs(off);
      if (a < 0.001) {
        s.in.style.transform = '';
        s.in.style.opacity = '';
        return;
      }
      s.in.style.transform = `translate3d(${(-off * W * 0.08).toFixed(1)}px, 0, 0) scale(${(1 - a * 0.04).toFixed(4)})`;
      s.in.style.opacity = (1 - a * 0.6).toFixed(3);
    });
  }

  // 옆 화면으로: 트랙이 미끄러진다(끌던 자리에서 그대로 이어서)
  function slideTo(k) {
    k = clamp(k, 0, slides.length - 1);
    const from = index;
    index = k;
    gsap.killTweensOf(state);
    setNear([...near, from - 1, from, from + 1, k - 1, k, k + 1]);
    sync();
    if (reducedMotion) {
      state.x = -k * W;
      settle();
      return;
    }
    const dist = Math.abs(state.x + k * W) / W;
    gsap.to(state, { x: -k * W, duration: clamp(0.45 + dist * 0.3, 0.45, 0.8), ease: 'expo.out', onUpdate: () => paint(state.x), onComplete: settle });
  }

  // 멀리(탭 · 목차) 또는 위아래로 넘길 때: 지금 화면이 물러나고, 새 화면의 블록이 차례로 들어선다
  function jumpTo(k, dir = 0) {
    k = clamp(k, 0, slides.length - 1);
    if (k === index) return;
    const out = slides[index];
    index = k;
    gsap.killTweensOf(state);
    sync();
    const land = () => {
      gsap.set(out.in, { clearProps: 'all' });
      state.x = -k * W;
      setNear([k - 1, k, k + 1]);
      paint(state.x);
      settle();
      jumping = false;
      if (!reducedMotion) enter(slides[k], dir);
    };
    if (reducedMotion) return land();
    jumping = true;
    gsap.killTweensOf(out.in);
    gsap.to(out.in, { opacity: 0, y: dir ? -dir * 46 : 0, scale: dir ? 1 : 0.97, duration: 0.24, ease: 'power2.in', onComplete: land });
  }

  function enter(s, dir) {
    const parts = [...s.fit.children].flatMap((c) => (c.classList.contains('jr-cols') ? [...c.querySelectorAll(':scope > .jr-col > *')] : [c]));
    gsap.fromTo(parts, { opacity: 0, y: dir < 0 ? -24 : 24 }, { opacity: 1, y: 0, duration: 0.62, ease: 'power3.out', stagger: 0.055, clearProps: 'opacity,transform' });
  }

  function go(k, { instant = false, dir = 0 } = {}) {
    if (!slides.length) return;
    k = clamp(k, 0, slides.length - 1);
    if (instant) {
      gsap.killTweensOf(state);
      index = k;
      state.x = -k * W;
      setNear([k - 1, k, k + 1]);
      settle();
      sync();
      return;
    }
    if (k === index) return;
    if (dir || Math.abs(k - index) > 1) jumpTo(k, dir);
    else slideTo(k);
  }

  function find(id) {
    if (!id) return 0;
    let k = slides.findIndex((s) => s.part === 0 && s.g.anchors.includes(id));
    if (k < 0) k = slides.findIndex((s) => s.g.sec.id === id);
    if (k < 0) {
      try {
        k = slides.findIndex((s) => s.el.querySelector(`#${CSS.escape(id)}`));
      } catch {
        k = -1;
      }
    }
    return k;
  }
  const goAnchor = (id, opts) => {
    const k = find(id);
    if (k >= 0) go(k, opts);
    return k >= 0;
  };

  // 다시 나눠 담기(처음 · 화면 크기가 바뀔 때 · 글꼴이 늦게 왔을 때) — 보던 묶음의 같은 화면으로
  let lastW = 0;
  let lastH = 0;
  function relayout(first = false) {
    if (!alive) return;
    const keep = slides[index] ? { g: slides[index].g, part: slides[index].part } : null;
    lastW = view.clientWidth;
    lastH = view.clientHeight;
    W = lastW || 1;
    gsap.killTweensOf(state);
    render(pack());
    let k = 0;
    if (first) k = Math.max(0, find(start));
    else if (keep) {
      const same = slides.map((s, i) => [s, i]).filter(([s]) => s.g === keep.g);
      if (same.length) k = same[Math.min(keep.part, same.length - 1)][1];
    }
    go(k, { instant: true });
  }

  // ── 끌기: 옆으로는 손가락을 그대로 따라오고(끝에서는 고무줄), 위아래로는 지금 화면이 살짝 밀린다 ──
  let drag = null;
  let mute = 0; // 끌고 난 직후의 클릭은 무시
  function onDown(e) {
    if (!slides.length || jumping || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('input, textarea, select')) return;
    gsap.killTweensOf(state);
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: state.x, from: clamp(Math.round(-state.x / W), 0, slides.length - 1), axis: '', pts: [[e.timeStamp, e.clientX, e.clientY]] };
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    if (!drag.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      drag.axis = Math.abs(dx) >= Math.abs(dy) * 0.9 ? 'x' : 'y';
      try {
        view.setPointerCapture(e.pointerId);
      } catch {
        /* 이미 놓은 포인터 */
      }
      view.classList.add('is-drag');
      index = drag.from;
      setNear([index - 1, index, index + 1]);
      if (drag.axis === 'y') gsap.killTweensOf(slides[index].in);
    }
    drag.pts.push([e.timeStamp, e.clientX, e.clientY]);
    if (drag.pts.length > 6) drag.pts.shift();
    if (drag.axis === 'x') {
      let x = drag.base + dx;
      const min = -(slides.length - 1) * W;
      if (x > 0) x *= 0.3;
      else if (x < min) x = min + (x - min) * 0.3;
      state.x = x;
      paint(x);
    } else {
      const s = slides[index];
      const edge = (dy < 0 && index === slides.length - 1) || (dy > 0 && index === 0);
      const d = dy * (edge ? 0.16 : 0.42);
      s.in.style.transform = `translate3d(0, ${d.toFixed(1)}px, 0)`;
      s.in.style.opacity = (1 - Math.min(0.5, Math.abs(d) / 360)).toFixed(3);
    }
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    view.classList.remove('is-drag');
    if (!d.axis) {
      // 그냥 누름 — 링크 · 버튼은 그대로(넘어가던 중에 잡았다면 그 화면에 마저 선다)
      if (Math.abs(state.x + index * W) > 0.5) slideTo(clamp(Math.round(-state.x / W), 0, slides.length - 1));
      return;
    }
    mute = performance.now() + 450;
    const [t0, x0, y0] = d.pts[0];
    const [t1, x1, y1] = d.pts[d.pts.length - 1];
    const dt = Math.max(1, t1 - t0);
    const vx = (x1 - x0) / dt;
    const vy = (y1 - y0) / dt;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    const cancel = e.type === 'pointercancel';
    if (d.axis === 'x') {
      let k = clamp(Math.round(-state.x / W), 0, slides.length - 1);
      if (!cancel && (dx < -W * 0.16 || (vx < -0.35 && dx < -20))) k = d.from + 1;
      else if (!cancel && (dx > W * 0.16 || (vx > 0.35 && dx > 20))) k = d.from - 1;
      slideTo(k);
      return;
    }
    const s = slides[index];
    let k = index;
    if (!cancel && (dy < -70 || (vy < -0.4 && dy < -24))) k = index + 1;
    else if (!cancel && (dy > 70 || (vy > 0.4 && dy > 24))) k = index - 1;
    if (k !== index && k >= 0 && k < slides.length) jumpTo(k, k > index ? 1 : -1);
    else gsap.to(s.in, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity' });
  }
  view.addEventListener('pointerdown', onDown);
  view.addEventListener('pointermove', onMove);
  view.addEventListener('pointerup', onUp);
  view.addEventListener('pointercancel', onUp);
  view.addEventListener('dragstart', (e) => e.preventDefault());
  view.addEventListener(
    'click',
    (e) => {
      if (performance.now() < mute) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // 휠: 한 번 굴릴 때마다 한 화면(트랙패드의 관성은 끝날 때까지 한 번으로) — 위아래 휠은 위아래로 넘기는 연출
  let wAcc = 0;
  let wLast = 0;
  let wLock = 0;
  view.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (!slides.length || drag) return;
      const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const d = (horiz ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 400 : 1);
      const now = performance.now();
      const gapT = now - wLast;
      wLast = now;
      if (wLock) {
        if (gapT < 220 && now - wLock < 1500) return;
        wLock = 0;
        wAcc = 0;
      }
      if (gapT > 280) wAcc = 0;
      wAcc += d;
      if (Math.abs(wAcc) < 46) return;
      const dir = Math.sign(wAcc);
      wAcc = 0;
      wLock = now;
      const k = index + dir;
      if (k < 0 || k >= slides.length || jumping) return;
      if (horiz) slideTo(k);
      else jumpTo(k, dir);
    },
    { passive: false }
  );

  // 발표: F 전체 화면 · B(또는 .) 화면 가리기 · 전체 화면에서 마우스를 멈추면 커서를 숨긴다
  const canFull = !!document.fullscreenEnabled;
  if (fullBtn && !canFull) fullBtn.hidden = true;
  const toggleFull = () => {
    if (!canFull) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const onFull = () => {
    fullBtn?.setAttribute('aria-pressed', String(!!document.fullscreenElement));
    root.classList.toggle('is-full', !!document.fullscreenElement);
  };
  document.addEventListener('fullscreenchange', onFull);
  let idleT = 0;
  const wake = () => {
    root.classList.remove('is-idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => document.fullscreenElement && root.classList.add('is-idle'), 2600);
  };
  root.addEventListener('pointermove', wake);
  const black = (on = !root.classList.contains('is-black')) => root.classList.toggle('is-black', on);

  // 탭 · 진행 막대 · 이전/다음 · 화면 안의 이동 링크(학년 → 그 해, 목차 → 쪽, SWOT 칸 → 그 칸)
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-jr-go], [data-go], [data-seg], .jr-nav, [data-full]');
    if (!t || !root.contains(t)) return;
    e.preventDefault();
    if (t.hasAttribute('data-full')) return toggleFull();
    if (t.classList.contains('jr-nav')) return go(index + +t.dataset.dir);
    goAnchor(t.dataset.jrGo || t.dataset.go || t.dataset.seg);
  });

  function key(e) {
    if (e.altKey || e.ctrlKey || e.metaKey || !slides.length) return false;
    // 가린 화면: 아무 키나 누르면 다시(Esc로 페이지가 닫히지 않게)
    if (root.classList.contains('is-black')) {
      e.preventDefault();
      black(false);
      return true;
    }
    if (e.key === 'f' || e.key === 'F') return toggleFull(), true;
    if (e.key === 'b' || e.key === 'B' || e.key === '.') return black(true), true;
    if (e.key === 'Home') return go(0), true;
    if (e.key === 'End') return go(slides.length - 1), true;
    if (e.key === ' ' && e.target.closest?.('button, a')) return false; // 버튼 · 링크의 Space는 그 동작
    const d = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (!d) return false;
    e.preventDefault();
    const k = index + d;
    if (k < 0 || k >= slides.length) return true;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp') jumpTo(k, d);
    else slideTo(k);
    return true;
  }

  // 화면 크기가 바뀌면 다시 나눠 담는다(휴대폰 회전 · 창 크기 · 주소 막대)
  let rt = 0;
  const ro = new ResizeObserver(() => {
    const w = view.clientWidth;
    const h = view.clientHeight;
    if (!w || !h || (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2)) return;
    clearTimeout(rt);
    rt = setTimeout(() => relayout(!slides.length), slides.length ? 140 : 0);
  });
  ro.observe(view);
  if (view.clientWidth && view.clientHeight) relayout(true);
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => alive && slides.length && relayout());

  // 처음 들어온 표지에서 한 번: 다음 화면을 살짝 들춰 옆으로 넘길 수 있다는 걸 보여 준다
  if (!reducedMotion && index === 0) {
    let seen = false;
    try {
      seen = sessionStorage.getItem('jr-peek') === '1';
      sessionStorage.setItem('jr-peek', '1');
    } catch {
      /* 저장소를 못 쓰면 매번 */
    }
    if (!seen)
      gsap.to(state, {
        x: () => -Math.min(64, W * 0.1),
        duration: 0.55,
        delay: 1.3,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: 1,
        onStart: () => setNear([0, 1]),
        onUpdate: () => paint(state.x),
        onComplete: settle,
      });
  }

  return {
    go,
    goAnchor,
    key,
    get index() {
      return index;
    },
    get count() {
      return slides.length;
    },
    destroy() {
      alive = false;
      document.removeEventListener('fullscreenchange', onFull);
      clearTimeout(idleT);
      if (document.fullscreenElement) document.exitFullscreen?.();
      ro.disconnect();
      clearTimeout(rt);
      gsap.killTweensOf(state);
    },
  };
}
