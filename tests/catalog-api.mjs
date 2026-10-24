import assert from 'node:assert/strict';
import { ApiError, createCatalogApi } from '../demo/api.js';

let passed = 0;

async function test(name, run) {
	await run();
	passed += 1;
	console.log(`✓ ${name}`);
}

function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

await test('klient načte kategorie z API', async () => {
	const requests = [];
	const api = createCatalogApi(async (url, options) => {
		requests.push({ url, options });
		return jsonResponse([{ id: 'popular', name: 'Oblíbené' }]);
	});
	const controller = new AbortController();
	const categories = await api.listCategories({ signal: controller.signal });

	assert.deepEqual(categories, [{ id: 'popular', name: 'Oblíbené' }]);
	assert.equal(requests[0].url, '/api/categories');
	assert.equal(requests[0].options.signal, controller.signal);
	assert.equal(requests[0].options.headers.Accept, 'application/json');
});

await test('klient bezpečně zakóduje filtr kategorie', async () => {
	let requestedUrl;
	const api = createCatalogApi(async (url) => {
		requestedUrl = url;
		return jsonResponse([]);
	});

	await api.listMenuItems('hot drinks');

	assert.equal(requestedUrl, '/api/menu-items?category=hot+drinks');
});

await test('klient načte detail zvoleného produktu', async () => {
	let requestedUrl;
	const api = createCatalogApi(async (url) => {
		requestedUrl = url;
		return jsonResponse({ id: 8, name: 'Espresso' });
	});

	const item = await api.getMenuItem(8);

	assert.equal(requestedUrl, '/api/menu-items/8');
	assert.deepEqual(item, { id: 8, name: 'Espresso' });
});

await test('chybná odpověď serveru vytvoří ApiError', async () => {
	const api = createCatalogApi(async () => jsonResponse({ error: 'Unavailable' }, 503));

	await assert.rejects(
		api.listCategories(),
		(error) => error instanceof ApiError && error.status === 503,
	);
});

console.log(`\n${passed} testy API klienta prošly.`);
