const listCategoriesStatement = `
  SELECT id, name
  FROM categories
  ORDER BY position
`;

const listMenuItemsStatement = `
  SELECT
    id,
    category_id AS category,
    name,
    description,
    price,
    emoji
  FROM menu_items
`;

function toPlainObject(row) {
	return { ...row };
}

export function listCategories(database) {
	return database.prepare(listCategoriesStatement).all().map(toPlainObject);
}

export function listMenuItems(database, categoryId = null) {
	const statement = categoryId
		? database.prepare(`${listMenuItemsStatement} WHERE category_id = ? ORDER BY position`)
		: database.prepare(`${listMenuItemsStatement} ORDER BY position`);
	const rows = categoryId ? statement.all(categoryId) : statement.all();
	return rows.map(toPlainObject);
}

export function findMenuItem(database, itemId) {
	const row = database
		.prepare(
			`
    ${listMenuItemsStatement}
    WHERE id = ?
  `,
		)
		.get(itemId);

	return row ? toPlainObject(row) : null;
}
