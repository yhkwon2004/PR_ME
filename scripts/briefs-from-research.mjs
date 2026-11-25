#!/usr/bin/env node
// 조사 결과 → src/data/briefs.json (프로젝트 요약: 문제 · 솔루션 · 팀 · 역할 · 기여 · 문제 해결 기록 · 결과 · 배운 점 · 다음)
//
//   node scripts/briefs-from-research.mjs <조사 결과.json> [--out src/data/briefs.json] [--prefer research|existing] [--replace] [--dry]
//
// 조사 결과: 프로젝트마다 { id, headline, period, teamSize, teamText, role[], problem, solution, contribution[], results[],
//   troubles[{ issue, fix, outcome }], learned, next } — 배열이거나 id를 열쇠로 한 객체. 출처 · 미확인 · 자료 차이(sources · unknowns ·
//   conflicts · *Source) 같은 조사 메모는 옮기지 않는다. 글 안에 섞인 메모도 — 출처 꼬리표('(Notion 목록)')는 걷어 내고,
//   '미확인' · '확인 필요' · '본인' · '선행작:'이 남은 글은 옮기지 않고 알린다(화면에 그대로 나가는 글이라).
// - 빈 값(null · 빈 글 · 빈 목록)은 쓰지 않는다 — 화면은 있는 항목만 보여 준다.
// - 이미 있는 briefs.json과 합친다: 기본은 조사 결과가 이긴다(--prefer research). 손으로 고친 값을 지키려면 --prefer existing,
//   조사 결과만으로 새로 쓰려면 --replace. 조사 결과에 없는 프로젝트의 기존 요약은 그대로 둔다(--replace면 지운다).
// - projects.json에 없는 id, 전화번호 · 학점처럼 보이는 글은 옮기지 않고 알린다. 기간 형식이 다르면 알린다(값은 옮긴다).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const input = args.find((a, i) => !a.startsWith('--') && !['--out', '--prefer'].includes(args[i - 1]));
if (!input) {
  console.error('사용법: node scripts/briefs-from-research.mjs <조사 결과.json> [--out src/data/briefs.json] [--prefer research|existing] [--replace] [--dry]');
  process.exit(1);
}
const OUT = resolve(ROOT, opt('--out', 'src/data/briefs.json'));
const prefer = opt('--prefer', 'research');
if (!['research', 'existing'].includes(prefer)) {
  console.error(`--prefer는 research 또는 existing — 받은 값: ${prefer}`);
  process.exit(1);
}

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const projects = read(resolve(ROOT, 'src/data/projects.json'));
const ORDER = projects.map((p) => p.id);
const raw = read(resolve(process.cwd(), input));
const list = Array.isArray(raw) ? raw : Object.entries(raw).map(([id, v]) => ({ id, ...v }));

const warn = [];
// 공개하지 않는 정보: 전화번호 · 학점(GPA)
const PRIVATE = [/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/, /\bGPA\b/i, /학점\s*[:：]?\s*\d/, /평점\s*[:：]?\s*\d\.\d/];
// 조사 메모가 글 안에 섞인 것: 출처 꼬리표('(Notion 목록)' · '(커밋 기록 기준)' · '(서비스 화면 표기)')는 걷어 내고 알린다.
// 확인되지 않았다는 표시('미확인' · '확인 필요')나 조사자의 말('본인' · '선행작:' · '보도에서 …')이 남은 글은 화면에 그대로 나가므로 옮기지 않는다
const SOURCE_TAG = /\s*\((?:[^()]*\b(?:Notion|노션)\b[^()]*|[^()]*기록 기준|[^()]*화면 표기|[^()]*기재)\)/gi;
const NOTE = [/미확인/, /확인\s*필요/, /본인/, /선행작\s*:/, /보도에서/, /\bNotion\b/i];
const text = (v, where) => {
  if (typeof v !== 'string') return '';
  let t = v.replace(/\s+/g, ' ').trim();
  if (PRIVATE.some((re) => re.test(t))) {
    warn.push(`${where}: 전화번호 · 학점으로 보이는 글이라 옮기지 않았습니다 — "${t.slice(0, 40)}…"`);
    return '';
  }
  const bare = t.replace(SOURCE_TAG, '').trim();
  if (bare !== t) {
    warn.push(`${where}: 출처 꼬리표를 걷어 냈습니다 — "${t.slice(0, 50)}…"`);
    t = bare;
  }
  const note = NOTE.find((re) => re.test(t));
  if (note) {
    warn.push(`${where}: 조사 메모로 보이는 글(${note.source})이라 옮기지 않았습니다 — 고쳐서 직접 적어 주세요: "${t.slice(0, 50)}…"`);
    return '';
  }
  return t;
};
const texts = (v, where) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []).map((x, k) => text(x, `${where}[${k}]`)).filter(Boolean);
// 기간: 'YYYY' · 'YYYY.MM' · 'YYYY.MM.DD', 범위는 ' – '(앞뒤 띄운 en dash)로
const PERIOD = /^\d{4}(\.\d{2}){0,2}( – \d{4}(\.\d{2}){0,2})?$/;
const period = (v, where) => {
  const t = text(v, where).replace(/\s*(?:~|–|—|-)\s*(?=\d{4})/g, ' – ');
  if (t && !PERIOD.test(t)) warn.push(`${where}: 기간 형식이 'YYYY.MM – YYYY.MM'이 아닙니다 — "${t}"`);
  return t;
};

function convert(r) {
  const at = r.id;
  const size = Number(r.teamSize ?? r.team?.size);
  const tt = text(r.teamText ?? r.team?.text, `${at}.teamText`);
  const team = {
    ...(Number.isFinite(size) && size > 0 ? { size: Math.round(size) } : {}),
    ...(tt ? { text: tt } : {}),
  };
  const troubles = (Array.isArray(r.troubles) ? r.troubles : [])
    .map((t, k) => {
      const o = {};
      for (const f of ['issue', 'fix', 'outcome']) {
        const v = text(t?.[f], `${at}.troubles[${k}].${f}`);
        if (v) o[f] = v;
      }
      return o;
    })
    .filter((t) => t.issue || t.fix);
  const out = {
    headline: text(r.headline, `${at}.headline`),
    period: period(r.period, `${at}.period`),
    team: Object.keys(team).length ? team : null,
    role: texts(r.role, `${at}.role`),
    problem: text(r.problem, `${at}.problem`),
    solution: text(r.solution, `${at}.solution`),
    contribution: texts(r.contribution, `${at}.contribution`),
    results: texts(r.results, `${at}.results`),
    troubles,
    learned: text(r.learned, `${at}.learned`),
    next: text(r.next, `${at}.next`),
  };
  // 빈 값은 쓰지 않는다
  return Object.fromEntries(Object.entries(out).filter(([, v]) => (Array.isArray(v) ? v.length : v)));
}

const existing = !flag('--replace') && existsSync(OUT) ? read(OUT) : {};
const merged = { ...existing };
let n = 0;
for (const r of list) {
  if (!r?.id) continue;
  if (!ORDER.includes(r.id)) {
    warn.push(`${r.id}: projects.json에 없는 프로젝트라 건너뜁니다`);
    continue;
  }
  const c = convert(r);
  const old = existing[r.id] || {};
  const next = prefer === 'existing' ? { ...c, ...old } : { ...old, ...c };
  if (Object.keys(next).length) {
    merged[r.id] = next;
    n++;
  }
}

// 프로젝트 순서대로, 필드도 정해진 순서로
// tech(기술 노트)는 조사 결과로 옮기지 않지만, 이미 손으로 적어 둔 값은 합칠 때 지우지 않도록 함께 남긴다
const FIELDS = ['headline', 'period', 'team', 'role', 'problem', 'solution', 'contribution', 'results', 'troubles', 'learned', 'next', 'tech'];
const sorted = Object.fromEntries(
  Object.keys(merged)
    .sort((a, b) => (ORDER.indexOf(a) + 1 || 1e9) - (ORDER.indexOf(b) + 1 || 1e9))
    .map((id) => [id, Object.fromEntries(FIELDS.filter((f) => merged[id][f] !== undefined).map((f) => [f, merged[id][f]]))])
);

const filled = (f) => Object.values(sorted).filter((b) => b[f] !== undefined).length;
console.log(`조사 결과 ${list.length}건 → 요약 ${n}건 옮김, briefs.json ${Object.keys(sorted).length}건`);
console.log(FIELDS.map((f) => `${f} ${filled(f)}`).join(' · '));
warn.forEach((w) => console.warn(`! ${w}`));
if (flag('--dry')) console.log('(--dry: 파일은 쓰지 않았습니다)');
else {
  writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`→ ${OUT}`);
}
