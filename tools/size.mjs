import { existsSync, readFileSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const coreFiles = [
	'state.js',
	'dom.js',
	'core.js',
	'collections.js',
	'html.js',
	'template.js',
	'index.js',
];
const optionalFiles = ['svg.js'];

function report(label, files) {
	const source = Buffer.concat(
		files.map((file) => readFileSync(new URL(`../src/${file}`, import.meta.url))),
	);
	console.log(`${label}:`);
	console.log(`  source: ${source.length} B`);
	console.log(`  gzip:   ${gzipSync(source, { level: 9 }).length} B`);
	console.log(`  brotli: ${brotliCompressSync(source).length} B`);
}

report('Core + collections (unminified modules)', coreFiles);
report('Optional SVG module (unminified)', optionalFiles);

const metadataUrl = new URL('../dist/meta.json', import.meta.url);

if (!existsSync(metadataUrl)) {
	console.log('\nRun npm run build to measure the minified V0 distribution.');
	process.exit(0);
}

const metadata = JSON.parse(readFileSync(metadataUrl, 'utf8'));
const root = new URL('../', import.meta.url);

function collect(entryPoint) {
	const entry = Object.entries(metadata.outputs).find(
		([, output]) => output.entryPoint === entryPoint,
	);

	if (!entry) throw new Error(`Missing distribution entry: ${entryPoint}`);

	const files = new Set();
	const visit = (name) => {
		if (files.has(name)) return;
		files.add(name);
		for (const imported of metadata.outputs[name].imports) {
			if (metadata.outputs[imported.path]) visit(imported.path);
		}
	};

	visit(entry[0]);
	return [...files];
}

function reportDistribution(label, files) {
	const content = Buffer.concat(files.map((file) => readFileSync(new URL(file, root))));

	console.log(`\n${label}:`);
	console.log(`  files:      ${files.join(', ')}`);
	console.log(`  minified:   ${content.length} B`);
	console.log(`  gzip:       ${gzipSync(content, { level: 9 }).length} B`);
	console.log(`  brotli:     ${brotliCompressSync(content).length} B`);
}

const core = collect('src/index.js');
const svg = collect('src/svg.js');
reportDistribution('V0 core distribution', core);
reportDistribution(
	'V0 optional SVG addition',
	svg.filter((file) => !core.includes(file)),
);
