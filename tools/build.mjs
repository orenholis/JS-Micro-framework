import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);
const source = new URL('src/', root);
const distribution = new URL('dist/', root);

await rm(distribution, { recursive: true, force: true });
await mkdir(distribution, { recursive: true });
await cp(source, new URL('modules/', distribution), { recursive: true });

const result = await build({
	absWorkingDir: root.pathname,
	entryPoints: { 'constrained-ui': 'src/index.js', svg: 'src/svg.js' },
	outdir: 'dist',
	bundle: true,
	splitting: true,
	format: 'esm',
	target: 'es2023',
	minify: true,
	sourcemap: false,
	metafile: true,
	entryNames: '[name].min',
	chunkNames: 'chunks/[name]-[hash].min',
});

await writeFile(
	new URL('meta.json', distribution),
	`${JSON.stringify(result.metafile, null, 2)}\n`,
);

console.log('V0 distribution created in dist/.');
