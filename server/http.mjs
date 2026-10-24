import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { findMenuItem, listCategories, listMenuItems } from './catalog.mjs';
import { openKioskDatabase } from './database.mjs';

const contentTypes = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
};
const publicDirectories = new Set(['demo', 'dist', 'src', 'tests']);

function sendJson(response, status, body) {
	response.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Cache-Control': 'no-store',
	});
	response.end(JSON.stringify(body));
}

function handleApi(request, response, url, database) {
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
	const server = createServer((request, response) => {
		try {
			const url = new URL(request.url, `http://${request.headers.host}`);

			if (url.pathname.startsWith('/api/')) {
				handleApi(request, response, url, database);
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
