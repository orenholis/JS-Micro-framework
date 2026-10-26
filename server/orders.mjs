import { menuKey, priceMenu } from '../demo/menu-deal.js';

export class OrderValidationError extends Error {}

function isQuantity(value) {
	return Number.isInteger(value) && value > 0 && value <= 99;
}

function validateItems(items) {
	if (!Array.isArray(items)) {
		throw new OrderValidationError('Order items must be an array.');
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
			|| !isQuantity(item.quantity)
		) {
			throw new OrderValidationError('Order item is invalid.');
		}

		if (itemIds.has(item.menuItemId)) {
			throw new OrderValidationError('Order contains a duplicate menu item.');
		}

		itemIds.add(item.menuItemId);
	}
}

function validateMenus(menus) {
	if (!Array.isArray(menus)) {
		throw new OrderValidationError('Order menus must be an array.');
	}

	if (menus.length > 20) {
		throw new OrderValidationError('Order contains too many menus.');
	}

	const keys = new Set();

	for (const menu of menus) {
		if (typeof menu !== 'object' || menu === null || !isQuantity(menu.quantity)) {
			throw new OrderValidationError('Order menu is invalid.');
		}

		const key = menuKey(menu);
		if (keys.has(key)) {
			throw new OrderValidationError('Order contains a duplicate menu.');
		}

		keys.add(key);
	}
}

export function createOrder(database, payload) {
	const items = payload?.items ?? [];
	const menus = payload?.menus ?? [];

	validateItems(items);
	validateMenus(menus);

	if (items.length === 0 && menus.length === 0) {
		throw new OrderValidationError('Order must contain at least one item.');
	}

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
	const insertOrderMenu = database.prepare(`
    INSERT INTO order_menus (order_id, position, name, unit_price, separate_price, quantity, components)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

	const selectedItems = items.map((item) => {
		const menuItem = findMenuItem.get(item.menuItemId);

		if (!menuItem) {
			throw new OrderValidationError(`Menu item ${item.menuItemId} does not exist.`);
		}

		return { ...menuItem, quantity: item.quantity };
	});

	const selectedMenus = menus.map((menu) => {
		const priced = priceMenu(menu, (id) => findMenuItem.get(id));

		if (!priced) {
			throw new OrderValidationError('Order menu has an invalid composition.');
		}

		return { ...priced, quantity: menu.quantity };
	});

	const lines = [...selectedItems, ...selectedMenus];
	const count = lines.reduce((sum, line) => sum + line.quantity, 0);
	const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

	database.exec('BEGIN');

	try {
		const result = insertOrder.run(total);
		const orderId = Number(result.lastInsertRowid);

		for (const item of selectedItems) {
			insertOrderItem.run(orderId, item.id, item.name, item.price, item.quantity);
		}

		selectedMenus.forEach((menu, position) => {
			insertOrderMenu.run(
				orderId,
				position,
				menu.name,
				menu.price,
				menu.separatePrice,
				menu.quantity,
				JSON.stringify(menu.components),
			);
		});

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
