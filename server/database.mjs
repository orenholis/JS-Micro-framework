import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { categories, menuItems } from '../demo/data.js';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

function seedCatalog(database) {
	const insertCategory = database.prepare(`
    INSERT INTO categories (id, name, position)
    VALUES (?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      name = excluded.name,
      position = excluded.position
  `);
	const insertMenuItem = database.prepare(`
    INSERT INTO menu_items (
      id,
      category_id,
      name,
      description,
      price,
      emoji,
      position
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      category_id = excluded.category_id,
      name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      emoji = excluded.emoji,
      position = excluded.position
  `);

	database.exec('BEGIN');

	try {
		categories.forEach((category, index) => {
			insertCategory.run(category.id, category.name, index);
		});
		menuItems.forEach((item, index) => {
			insertMenuItem.run(
				item.id,
				item.category,
				item.name,
				item.description,
				item.price,
				item.emoji,
				index,
			);
		});
		const placeholders = categories.map(() => '?').join(', ');
		database
			.prepare(`DELETE FROM categories WHERE id NOT IN (${placeholders})`)
			.run(...categories.map((category) => category.id));
		database.exec('COMMIT');
	} catch (error) {
		database.exec('ROLLBACK');
		throw error;
	}
}

export async function openKioskDatabase(path) {
	if (path !== ':memory:') await mkdir(dirname(path), { recursive: true });

	const database = new DatabaseSync(path);
	database.exec(schema);
	seedCatalog(database);
	return database;
}
