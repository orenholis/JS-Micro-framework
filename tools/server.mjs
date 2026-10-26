import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createKioskServer } from '../server/http.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const databasePath = process.env.DATABASE_PATH || join(root, '.data', 'kiosk.sqlite');
const server = await createKioskServer({ root, databasePath });

server.listen(port, '127.0.0.1', () => {
	console.log(`Demo:  http://127.0.0.1:${port}/demo/`);
	console.log(`API:   http://127.0.0.1:${port}/api/health`);
	console.log(`Tests: http://127.0.0.1:${port}/tests/`);
});
