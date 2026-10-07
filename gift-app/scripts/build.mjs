import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '../gift');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'assets'), { recursive: true });
await build({
  entryPoints: [resolve(root, 'src/main.tsx')],
  outdir: resolve(output, 'assets'),
  entryNames: 'app',
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  loader: { '.css': 'css' },
});
const template = await readFile(resolve(root, 'index.html'), 'utf8');
const version = async name => createHash('sha256').update(await readFile(resolve(output, 'assets', name))).digest('hex').slice(0, 12);
const cssVersion = await version('app.css');
const jsVersion = await version('app.js');
const html = template.replace('<script type="module" src="/src/main.tsx"></script>', `<link rel="stylesheet" href="/gift/assets/app.css?v=${cssVersion}"><script type="module" src="/gift/assets/app.js?v=${jsVersion}"></script>`);
if (html === template) throw new Error('Gift HTML entry point not found');
await writeFile(resolve(output, 'index.html'), html);
await copyFile(resolve(root, 'public/config.js'), resolve(output, 'config.js'));
