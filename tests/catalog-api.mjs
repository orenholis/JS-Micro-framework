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

await test('klient odešle objednávku pouze s identifikátory a množstvím', async () => {
	let request;
	const api = createCatalogApi(async (url, options) => {
		request = { url, options };
		return jsonResponse({ id: 12, status: 'created', count: 2, total: 318 }, 201);
	});
	const controller = new AbortController();
	const order = await api.createOrder(
		[{ id: 1, name: 'Cena z klienta se nesmí použít', price: 1, quantity: 2 }],
		{ signal: controller.signal },
	);

	assert.equal(request.url, '/api/orders');
	assert.equal(request.options.method, 'POST');
	assert.equal(request.options.headers.Accept, 'application/json');
	assert.equal(request.options.headers['Content-Type'], 'application/json');
	assert.equal(request.options.signal, controller.signal);
	assert.deepEqual(JSON.parse(request.options.body), {
		items: [{ menuItemId: 1, quantity: 2 }],
	});
	assert.equal(order.id, 12);
});

await test('chybná odpověď serveru vytvoří ApiError', async () => {
	const api = createCatalogApi(async () => jsonResponse({ error: 'Unavailable' }, 503));

	await assert.rejects(
		api.listCategories(),
		(error) => error instanceof ApiError && error.status === 503,
	);
});

console.log(`\n${passed} testů API klienta prošlo.`);
