import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { findMenuItem, listCategories, listMenuItems } from './catalog.mjs';
import { openKioskDatabase } from './database.mjs';
import { createOrder, OrderValidationError } from './orders.mjs';

const contentTypes = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
};
const publicDirectories = new Set(['demo', 'dist', 'src', 'tests']);
const maximumRequestSize = 16 * 1024;

class RequestError extends Error {
	constructor(message, status) {
		super(message);
		this.status = status;
	}
}

function sendJson(response, status, body) {
	response.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Cache-Control': 'no-store',
	});
	response.end(JSON.stringify(body));
}

async function readJson(request) {
	const declaredSize = Number(request.headers['content-length'] ?? 0);

	if (declaredSize > maximumRequestSize) {
		throw new RequestError('Request body is too large', 413);
	}

	const chunks = [];
	let receivedSize = 0;

	for await (const chunk of request) {
		receivedSize += chunk.length;

		if (receivedSize > maximumRequestSize) {
			throw new RequestError('Request body is too large', 413);
		}

		chunks.push(chunk);
	}

	try {
		return JSON.parse(Buffer.concat(chunks).toString('utf8'));
	} catch {
		throw new RequestError('Request body must be valid JSON', 400);
	}
}

async function handleApi(request, response, url, database) {
	if (url.pathname === '/api/orders') {
		if (request.method !== 'POST') {
			sendJson(response, 405, { error: 'Method not allowed' });
			return;
		}

		try {
			const order = createOrder(database, await readJson(request));
			sendJson(response, 201, order);
		} catch (error) {
			if (error instanceof RequestError) {
				sendJson(response, error.status, { error: error.message });
				return;
			}

			if (error instanceof OrderValidationError) {
				sendJson(response, 400, { error: error.message });
				return;
			}

			throw error;
		}

		return;
	}

	if (request.method !== 'GET') {
		sendJson(response, 405, { error: 'Method not allowed' });
		return;
	}

	if (url.pathname === '/api/health') {
		sendJson(response, 200, { status: 'ok' });
		return;
	}

	if (url.pathname === '/api/categories') {
		sendJson(response, 200, listCategories(database));
		return;
	}

	if (url.pathname === '/api/menu-items') {
		sendJson(response, 200, listMenuItems(database, url.searchParams.get('category')));
		return;
	}

	const match = url.pathname.match(/^\/api\/menu-items\/(\d+)$/);

	if (match) {
		const item = findMenuItem(database, Number(match[1]));
		sendJson(response, item ? 200 : 404, item ?? { error: 'Menu item not found' });
		return;
	}

	sendJson(response, 404, { error: 'API endpoint not found' });
}

function sendStatic(response, url, root) {
	const requestedPath = decodeURIComponent(url.pathname);
	const resource = requestedPath === '/' ? 'demo/index.html' : requestedPath.replace(/^\/+/, '');
	const [publicDirectory] = resource.split('/');

	if (!publicDirectories.has(publicDirectory)) {
		response.writeHead(404).end('Not found');
		return;
	}

	let path = resolve(root, resource);
	const relativePath = relative(root, path);

	if (relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
		response.writeHead(403).end('Forbidden');
		return;
	}

	try {
		if (statSync(path).isDirectory()) path = resolve(path, 'index.html');
		response.writeHead(200, {
			'Content-Type': contentTypes[extname(path)] || 'application/octet-stream',
			'Cache-Control': 'no-store',
		});
		createReadStream(path).pipe(response);
	} catch {
		response.writeHead(404).end('Not found');
	}
}

export async function createKioskServer({ root, databasePath }) {
	const database = await openKioskDatabase(databasePath);
	const server = createServer(async (request, response) => {
		try {
			const url = new URL(request.url, `http://${request.headers.host}`);

			if (url.pathname.startsWith('/api/')) {
				await handleApi(request, response, url, database);
			} else {
				sendStatic(response, url, root);
			}
		} catch (error) {
			console.error(error);
			sendJson(response, 500, { error: 'Internal server error' });
		}
	});

	server.on('close', () => database.close());
	return server;
}
