import { readFileSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const coreFiles = ['state.js', 'dom.js', 'core.js', 'collections.js', 'template.js', 'index.js'];
const optionalFiles = ['svg.js'];

function report(label, files) {
  const source = Buffer.concat(files.map((file) => readFileSync(new URL(`../src/${file}`, import.meta.url))));
  console.log(`${label}:`);
  console.log(`  source: ${source.length} B`);
  console.log(`  gzip:   ${gzipSync(source, { level: 9 }).length} B`);
  console.log(`  brotli: ${brotliCompressSync(source).length} B`);
}

report('Core + collections (unminified modules)', coreFiles);
report('Optional SVG module (unminified)', optionalFiles);
console.log('\nThe 10 kB thesis target must be evaluated on a real bundled and minified release.');
