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

	assert.equal(database.prepare('SELECT COUNT(*) AS count FROM categories').get().count, 6);
	assert.equal(database.prepare('SELECT COUNT(*) AS count FROM menu_items').get().count, 16);
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
		16,
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
			['popular', 'burgers', 'chicken', 'sides', 'drinks', 'desserts'],
		);
	});

	await test('API vrátí úplný katalog', async () => {
		const response = await fetch(`${baseUrl}/api/menu-items`);
		const items = await response.json();

		assert.equal(response.status, 200);
		assert.equal(items.length, 16);
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
			['Cola', 'Pomerančová limonáda'],
		);
	});

	await test('API vrátí detail existující položky', async () => {
		const response = await fetch(`${baseUrl}/api/menu-items/1`);
		const item = await response.json();

		assert.equal(response.status, 200);
		assert.equal(item.name, 'Double Smash');
		assert.equal(item.category, 'popular');
	});

	await test('API oznámí neexistující položku', async () => {
		const response = await fetch(`${baseUrl}/api/menu-items/999`);

		assert.equal(response.status, 404);
		assert.deepEqual(await response.json(), { error: 'Menu item not found' });
	});

	await test('API uloží objednávku s cenami z databáze', async () => {
		const response = await fetch(`${baseUrl}/api/orders`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				items: [
					{ menuItemId: 1, quantity: 2 },
					{ menuItemId: 3, quantity: 1 },
				],
			}),
		});
		const order = await response.json();

		assert.equal(response.status, 201);
		assert.deepEqual(
			{ id: order.id, status: order.status, count: order.count, total: order.total },
			{ id: 1, status: 'created', count: 3, total: 577 },
		);
		assert.match(order.createdAt, /^\d{4}-\d{2}-\d{2}/);

		const database = await openKioskDatabase(databasePath);
		assert.deepEqual(
			database
				.prepare(
					'SELECT menu_item_id AS menuItemId, name, unit_price AS unitPrice, quantity FROM order_items WHERE order_id = ? ORDER BY menu_item_id',
				)
				.all(order.id)
				.map((row) => ({ ...row })),
			[
				{ menuItemId: 1, name: 'Double Smash', unitPrice: 189, quantity: 2 },
				{ menuItemId: 3, name: 'BBQ Bacon', unitPrice: 199, quantity: 1 },
			],
		);
		database.close();
	});

	await test('API odmítne prázdnou a neplatnou objednávku', async () => {
		const emptyResponse = await fetch(`${baseUrl}/api/orders`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ items: [] }),
		});
		const unknownItemResponse = await fetch(`${baseUrl}/api/orders`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ items: [{ menuItemId: 999, quantity: 1 }] }),
		});
		const malformedResponse = await fetch(`${baseUrl}/api/orders`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{',
		});

		assert.equal(emptyResponse.status, 400);
		assert.equal(unknownItemResponse.status, 400);
		assert.equal(malformedResponse.status, 400);

		const database = await openKioskDatabase(databasePath);
		assert.equal(database.prepare('SELECT COUNT(*) AS count FROM orders').get().count, 1);
		database.close();
	});

	await test('server nadále poskytuje kioskovou aplikaci', async () => {
		const response = await fetch(`${baseUrl}/demo/`);
		const html = await response.text();

		assert.equal(response.status, 200);
		assert.match(html, /BITE/);
	});

	await test('kiosk lze spustit přímo ze zdrojových ES modulů', async () => {
		const applicationResponse = await fetch(`${baseUrl}/demo/app.js`);
		const frameworkResponse = await fetch(`${baseUrl}/src/index.js`);
		const application = await applicationResponse.text();
		const framework = await frameworkResponse.text();

		assert.equal(applicationResponse.status, 200);
		assert.match(applicationResponse.headers.get('content-type'), /text\/javascript/);
		assert.match(application, /from '\.\.\/src\/index\.js'/);
		assert.equal(frameworkResponse.status, 200);
		assert.match(framework, /export \{ Component, Scope, mount \}/);
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
