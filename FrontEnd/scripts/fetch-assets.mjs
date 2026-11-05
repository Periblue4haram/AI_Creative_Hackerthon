// Figma 에셋(SVG/PNG)을 src/assets 로 내려받는 스크립트.
//   npm run assets            → 전부 다시 받기
//   node scripts/fetch-assets.mjs --if-missing → 없는 파일만 받기 (dev/build 전에 자동 실행)
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets');
const ifMissing = process.argv.includes('--if-missing');

const manifest = JSON.parse(await readFile(path.join(root, 'scripts', 'assets.json'), 'utf8'));
await mkdir(outDir, { recursive: true });

const exists = (p) => access(p).then(() => true, () => false);
let ok = 0;
let skipped = 0;
const failed = [];

for (const [name, url] of Object.entries(manifest)) {
  if (name.startsWith('_')) continue;
  const ext = path.extname(new URL(url).pathname) || '.svg';
  const file = path.join(outDir, name + ext);
  if (ifMissing && (await exists(file))) {
    skipped += 1;
    continue;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    ok += 1;
  } catch (err) {
    failed.push(`${name}: ${err.message}`);
  }
}

console.log(`assets: ${ok} downloaded, ${skipped} already present, ${failed.length} failed`);
if (failed.length) {
  console.error(failed.join('\n'));
  console.error(
    '\nFigma 임시 URL은 7일 뒤 만료돼요. 실패했다면 scripts/assets.json 의 URL을 Figma MCP(get_design_context)로 다시 받아 갱신하세요.',
  );
  process.exit(1);
}
