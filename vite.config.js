import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 배포 주소 — 링크 미리보기 이미지 · 정식 주소(canonical) · sitemap은 절대 주소여야 한다
const SITE = (process.env.SITE_URL || 'https://kwon-physical-ai.vercel.app').replace(/\/+$/, '');
const ROOT = dirname(fileURLToPath(import.meta.url));
const NAME = '권용현 Physical AI Portfolio';

const readJson = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
const attr = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 설명은 미리보기에 잘리지 않을 만큼(약 150자) — 낱말 사이에서 끊는다
const clip = (s, n = 150) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 20))}…`;
};

// index.html의 머리말을 한 페이지 것으로 — 바꿀 태그가 없으면(틀이 바뀌면) 빌드를 멈춘다
function withMeta(html, { path, title, desc, image, type = 'website' }) {
  const url = `${SITE}${path}`;
  const img = `${SITE}${image}`;
  const swaps = [
    [/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`],
    [/(<meta name="description" content=")[^"]*/, `$1${attr(desc)}`],
    [/(<link rel="canonical" href=")[^"]*/, `$1${url}`],
    [/(<meta property="og:type" content=")[^"]*/, `$1${type}`],
    [/(<meta property="og:url" content=")[^"]*/, `$1${url}`],
    [/(<meta property="og:title" content=")[^"]*/, `$1${attr(title)}`],
    [/(<meta property="og:description" content=")[^"]*/, `$1${attr(desc)}`],
    [/(<meta property="og:image" content=")[^"]*/, `$1${img}`],
    [/(<meta name="twitter:title" content=")[^"]*/, `$1${attr(title)}`],
    [/(<meta name="twitter:description" content=")[^"]*/, `$1${attr(desc)}`],
    [/(<meta name="twitter:image" content=")[^"]*/, `$1${img}`],
  ];
  return swaps.reduce((h, [re, to]) => {
    if (!re.test(h)) throw new Error(`[page-meta] index.html에서 ${re} 를 찾지 못했습니다`);
    return h.replace(re, to);
  }, html);
}

// 링크 미리보기 · 검색: 주소마다(프로필 · 아카이브 · 프로젝트 41개) 제목 · 설명 · 대표 이미지를 담은 HTML을 미리 쓴다.
// 앱은 어느 주소로 들어와도 같다(같은 스크립트) — 카카오톡 · 링크드인처럼 스크립트를 돌리지 않는 미리보기만 이 머리말을 읽는다.
// 함께 sitemap.xml · robots.txt를 쓴다. 미리보기 이미지는 scripts/og_cards.py가 public/og/에 만든다
function pageMeta() {
  let outDir = 'dist';
  let build = false;
  return {
    name: 'portfolio-page-meta',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
      build = c.command === 'build';
    },
    transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE%', SITE) },
    closeBundle() {
      if (!build) return;
      const base = readFileSync(resolve(outDir, 'index.html'), 'utf8');
      const projects = readJson('src/data/projects.json').filter((p) => !p.hidden); // 숨긴 기록은 주소 · 미리보기도 만들지 않는다
      const awards = readJson('src/data/awards.json');
      const press = readJson('src/data/press.json');
      const skills = (readFileSync(resolve(ROOT, 'src/data/skills.js'), 'utf8').match(/^\s*\{ d: '/gm) || []).length;
      const grand = awards.filter((a) => a.grade.includes('대상')).length;
      const og = (name) => (existsSync(resolve(ROOT, 'public/og', `${name}.jpg`)) ? `/og/${name}.jpg` : '/og.jpg');
      const pages = [
        {
          path: '/about',
          title: `프로필 — ${NAME}`,
          desc: `Physical AI Developer — AI·소프트웨어·하드웨어를 연결해 현장 문제를 푸는 개발자. 프로젝트 ${projects.length} · 수상 ${awards.length} · 보도 ${press.length} — 핵심 역량부터 연락처까지 한 장에(PDF 이력서 저장).`,
          image: og('about'),
          type: 'profile',
        },
        {
          path: '/growth',
          title: `성장 과정 · 가치관 — ${NAME}`,
          desc: '1학년 전공 탐색(2023) → 2학년 도전(2024) → 3학년 인턴십 · Physical AI 집중(2025 — 2026). 학년마다 한 일과 배운 것, 그리고 일하는 방식 세 가지.',
          image: og('growth'),
        },
        {
          path: '/history',
          title: `연도별 이력 — ${NAME}`,
          desc: '2023 — 2026, 해마다 한 일 — 연구실 · 동아리 · 전공 · 창업 · 수상. 항목마다 이어진 프로젝트 · 상장 · 기사로 들어갑니다.',
          image: og('history'),
        },
        {
          path: '/works',
          title: `프로젝트 ${projects.length} — ${NAME}`,
          desc: `드론 · 모빌리티 · 로봇 · AI · 임베디드 · 창업 — 권용현이 만든 프로젝트 ${projects.length}개를 분야별로 모아 봅니다.`,
          image: og('works'),
        },
        {
          path: '/awards',
          title: `수상 ${awards.length} — ${NAME}`,
          desc: `수상 ${awards.length}건(대상 ${grand}) — 연도별 수상 기록과 상장, 대회 · 등급 · 수여 기관.`,
          image: og('awards'),
        },
        {
          path: '/skills',
          title: `스킬 ${skills} — ${NAME}`,
          desc: `기술 ${skills}개 — 숙련도 점수 대신, 그 기술을 쓴 프로젝트와 수상으로 근거를 셉니다.`,
          image: og('skills'),
        },
        ...projects.map((p) => ({
          path: `/works/${p.id}`,
          title: `${p.title} — ${NAME}`,
          desc: clip([p.oneLiner, p.summary].filter(Boolean).join(' — ')),
          image: og(p.id),
          type: 'article',
        })),
      ];
      // /about → about.html · /works/<id> → works/<id>.html (vercel.json cleanUrls가 확장자 없는 주소로 내어 준다)
      for (const pg of pages) {
        const file = resolve(outDir, `.${pg.path}.html`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, withMeta(base, pg));
      }
      const day = new Date().toISOString().slice(0, 10);
      const urls = ['/', ...pages.map((p) => p.path)];
      writeFileSync(
        resolve(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${day}</lastmod></url>`)
          .join('\n')}\n</urlset>\n`
      );
      writeFileSync(resolve(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
      this.info?.(`page meta: ${pages.length} pages + sitemap.xml · robots.txt`);
    },
  };
}

export default defineConfig({
  plugins: [pageMeta()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap')) return 'gsap';
        },
      },
    },
  },
});
