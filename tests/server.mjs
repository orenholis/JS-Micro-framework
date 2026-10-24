import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openKioskDatabase } from '../server/database.mjs';
import { createKioskServer } from '../server/http.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'kiosk-server-'));
const databasePath = join(temporaryDirectory, 'kiosk.sqlite');
let passed = 0;

async function test(name, run) {
	await run();
	passed += 1;
	console.log(`✓ ${name}`);
}

await test('databáze vytvoří schéma a deterministická mock data', async () => {
	const database = await openKioskDatabase(databasePath);

	assert.equal(database.prepare('SELECT COUNT(*) AS count FROM categories').get().count, 4);
	assert.equal(database.prepare('SELECT COUNT(*) AS count FROM menu_items').get().count, 9);
	assert.deepEqual(
		database
			.prepare(
				`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name IN ('orders', 'order_items')
      ORDER BY name
    `,
			)
			.all()
			.map((row) => row.name),
		['order_items', 'orders'],
	);
	database.close();

	const reopened = await openKioskDatabase(databasePath);
	assert.equal(
		reopened.prepare('SELECT COUNT(*) AS count FROM menu_items').get().count,
		9,
		'Opakované spuštění nesmí duplikovat mock data.',
	);
	reopened.close();
});

const server = await createKioskServer({ root, databasePath });
await new Promise((resolve, reject) => {
	server.once('error', reject);
	server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
	await test('health endpoint potvrdí dostupnost serveru', async () => {
		const response = await fetch(`${baseUrl}/api/health`);
		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), { status: 'ok' });
	});

	await test('API vrátí kategorie ve správném pořadí', async () => {
		const response = await fetch(`${baseUrl}/api/categories`);
		const categories = await response.json();

		assert.equal(response.status, 200);
		assert.deepEqual(
			categories.map((category) => category.id),
			['popular', 'burgers', 'bowls', 'drinks'],
		);
	});

	await test('API vrátí úplný katalog', async () => {
		const response = await fetch(`${baseUrl}/api/menu-items`);
		const items = await response.json();

		assert.equal(response.status, 200);
		assert.equal(items.length, 9);
		assert.deepEqual(
			items.slice(0, 3).map((item) => item.id),
			[1, 2, 3],
		);
	});

	await test('API filtruje položky podle kategorie', async () => {
		const response = await fetch(`${baseUrl}/api/menu-items?category=drinks`);
		const items = await response.json();

		assert.equal(response.status, 200);
		assert.deepEqual(
			items.map((item) => item.name),
			['Espresso', 'Perlivá voda'],
		);
	});

	await test('API vrátí detail existující položky', async () => {
		const response = await fetch(`${baseUrl}/api/menu-items/1`);
		const item = await response.json();

		assert.equal(response.status, 200);
		assert.equal(item.name, 'Kuřecí burger');
		assert.equal(item.category, 'popular');
	});

	await test('API oznámí neexistující položku', async () => {
		const response = await fetch(`${baseUrl}/api/menu-items/999`);

		assert.equal(response.status, 404);
		assert.deepEqual(await response.json(), { error: 'Menu item not found' });
	});

	await test('server nadále poskytuje kioskovou aplikaci', async () => {
		const response = await fetch(`${baseUrl}/demo/`);
		const html = await response.text();

		assert.equal(response.status, 200);
		assert.match(html, /Constrained UI/);
	});

	await test('server nezpřístupní databázi jako statický soubor', async () => {
		const response = await fetch(`${baseUrl}/.data/kiosk.sqlite`);

		assert.equal(response.status, 404);
	});
} finally {
	await new Promise((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
	await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`\n${passed} testů serveru a databáze prošlo.`);
