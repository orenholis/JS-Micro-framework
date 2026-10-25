export class OrderValidationError extends Error {}

function validateItems(items) {
	if (!Array.isArray(items) || items.length === 0) {
		throw new OrderValidationError('Order must contain at least one item.');
	}

	if (items.length > 50) {
		throw new OrderValidationError('Order contains too many distinct items.');
	}

	const itemIds = new Set();

	for (const item of items) {
		if (
			typeof item !== 'object'
			|| item === null
			|| !Number.isInteger(item.menuItemId)
			|| item.menuItemId <= 0
			|| !Number.isInteger(item.quantity)
			|| item.quantity <= 0
			|| item.quantity > 99
		) {
			throw new OrderValidationError('Order item is invalid.');
		}

		if (itemIds.has(item.menuItemId)) {
			throw new OrderValidationError('Order contains a duplicate menu item.');
		}

		itemIds.add(item.menuItemId);
	}
}

export function createOrder(database, payload) {
	validateItems(payload?.items);

	const findMenuItem = database.prepare(`
    SELECT id, name, price
    FROM menu_items
    WHERE id = ?
  `);
	const insertOrder = database.prepare(`
    INSERT INTO orders (total)
    VALUES (?)
  `);
	const insertOrderItem = database.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity)
    VALUES (?, ?, ?, ?, ?)
  `);
	const selectedItems = payload.items.map((item) => {
		const menuItem = findMenuItem.get(item.menuItemId);

		if (!menuItem) {
			throw new OrderValidationError(`Menu item ${item.menuItemId} does not exist.`);
		}

		return { ...menuItem, quantity: item.quantity };
	});
	const count = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
	const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

	database.exec('BEGIN');

	try {
		const result = insertOrder.run(total);
		const orderId = Number(result.lastInsertRowid);

		for (const item of selectedItems) {
			insertOrderItem.run(orderId, item.id, item.name, item.price, item.quantity);
		}

		const order = database
			.prepare('SELECT id, status, total, created_at AS createdAt FROM orders WHERE id = ?')
			.get(orderId);
		database.exec('COMMIT');

		return { ...order, count };
	} catch (error) {
		database.exec('ROLLBACK');
		throw error;
	}
}
