import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const outfile = resolve(process.argv[2] || '/tmp/gift-api-bundle/index.ts');
await build({entryPoints:[resolve(root,'supabase/functions/gift-api/index.ts')],bundle:true,platform:'neutral',format:'esm',external:['npm:*'],outfile});
console.log(outfile);
