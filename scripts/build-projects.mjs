#!/usr/bin/env node
// 수집 워크플로 결과(journal.jsonl 또는 결과 JSON 배열)를 src/data/projects.json으로 정리하고 검증한다.
//   node scripts/build-projects.mjs <journal.jsonl | results.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/build-projects.mjs <journal.jsonl | results.json>');
  process.exit(1);
}

let results = [];
if (input.endsWith('.jsonl')) {
  const labels = new Map();
  const harvest = new Map();
  const verify = new Map();
  for (const line of fs.readFileSync(input, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    if (j.type === 'started') labels.set(j.key, j.label);
    if (j.type === 'result' && j.result && typeof j.result === 'object') {
      const label = labels.get(j.key) || '';
      if (label.startsWith('verify:')) verify.set(j.result.id, j.result);
      else if (label.startsWith('harvest:')) harvest.set(j.result.id, j.result);
    }
  }
  for (const [id, r] of harvest) results.push(verify.get(id) || { ...r, _unverified: true });
} else {
  results = JSON.parse(fs.readFileSync(input, 'utf8'));
}

const exists = (f) => f && fs.existsSync(path.join(ROOT, 'public', f));
const problems = [];
const out = results.map((r) => {
  const images = (r.images || []).filter((im) => {
    if (exists(im.file)) return true;
    problems.push(`${r.id}: missing image ${im.file}`);
    return false;
  });
  const files = new Set(images.map((im) => im.file));
  const cover = files.has(r.cover) ? r.cover : images[0]?.file || '';
  if (r.cover && !files.has(r.cover)) problems.push(`${r.id}: cover ${r.cover} not in images → ${cover || 'none'}`);
  const story = (r.story || []).map((s) => {
    if (s.image && !files.has(s.image)) {
      problems.push(`${r.id}: story image ${s.image} missing`);
      return { ...s, image: '' };
    }
    return s;
  });
  if (r._unverified) problems.push(`${r.id}: UNVERIFIED (no verify result)`);
  const { changes, sourcesUsed, notes, _unverified, ...rest } = r;
  return { ...rest, images, cover, story };
});

// 다른 프로젝트 폴더의 이미지 파일 중 결과에 참조되지 않은 파일 보고
for (const r of out) {
  const dir = path.join(ROOT, 'public', 'media', 'projects', r.id);
  if (!fs.existsSync(dir)) continue;
  const used = new Set(r.images.map((im) => path.basename(im.file)));
  for (const f of fs.readdirSync(dir)) {
    if (/^\d\d\.webp$/.test(f) && !used.has(f)) problems.push(`${r.id}: orphan file ${f}`);
  }
}

out.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'projects.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${out.length} projects, ${out.reduce((s, r) => s + r.images.length, 0)} images`);
if (problems.length) console.log('PROBLEMS:\n' + problems.join('\n'));
