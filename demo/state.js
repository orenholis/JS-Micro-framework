/**
 * Košík je pole řádků. Řádek je buď produkt (type 'item'), nebo zvýhodněné
 * menu (type 'menu') se složkami. Řádky se rozlišují klíčem a nikdy se nemění
 * na místě; každá operace vrací nové pole.
 */

function addLine(cart, line, quantity) {
	const existingIndex = cart.findIndex((row) => row.key === line.key);

	if (existingIndex === -1) {
		return [...cart, { ...line, quantity }];
	}

	return cart.map((row, index) =>
		index === existingIndex ? { ...row, quantity: row.quantity + quantity } : row,
	);
}

export function addCartItem(cart, item, quantity = 1) {
	return addLine(cart, {
		key: `item:${item.id}`,
		type: 'item',
		id: item.id,
		name: item.name,
		price: item.price,
	}, quantity);
}

export function addCartMenu(cart, menu, selection, quantity = 1) {
	return addLine(cart, {
		key: menu.key,
		type: 'menu',
		id: menu.components[0].id,
		name: menu.name,
		price: menu.price,
		separatePrice: menu.separatePrice,
		components: menu.components,
		selection: { ...selection },
	}, quantity);
}

export function changeCartItemQuantity(cart, key, delta) {
	if (!Number.isFinite(delta) || delta === 0) return cart;

	const existingIndex = cart.findIndex((row) => row.key === key);
	if (existingIndex === -1) return cart;

	const nextQuantity = cart[existingIndex].quantity + delta;

	if (nextQuantity <= 0) {
		return cart.filter((row) => row.key !== key);
	}

	return cart.map((row, index) =>
		index === existingIndex ? { ...row, quantity: nextQuantity } : row,
	);
}

export function removeCartItem(cart, key) {
	if (!cart.some((row) => row.key === key)) return cart;
	return cart.filter((row) => row.key !== key);
}

export function clearCart(cart) {
	return cart.length === 0 ? cart : [];
}

export function summarizeCart(cart) {
	let count = 0;
	let total = 0;
	let saving = 0;

	for (const row of cart) {
		count += row.quantity;
		total += row.price * row.quantity;
		if (row.type === 'menu') saving += (row.separatePrice - row.price) * row.quantity;
	}

	return { count, total, saving, subtotal: total + saving };
}
