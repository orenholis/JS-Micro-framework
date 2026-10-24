export function addCartItem(cart, item) {
	const existingIndex = cart.findIndex((row) => row.id === item.id);

	if (existingIndex === -1) {
		return [...cart, { ...item, quantity: 1 }];
	}

	return cart.map((row, index) =>
		index === existingIndex ? { ...row, quantity: row.quantity + 1 } : row,
	);
}

export function changeCartItemQuantity(cart, itemId, delta) {
	if (!Number.isFinite(delta) || delta === 0) return cart;

	const existingIndex = cart.findIndex((row) => row.id === itemId);
	if (existingIndex === -1) return cart;

	const nextQuantity = cart[existingIndex].quantity + delta;

	if (nextQuantity <= 0) {
		return cart.filter((row) => row.id !== itemId);
	}

	return cart.map((row, index) =>
		index === existingIndex ? { ...row, quantity: nextQuantity } : row,
	);
}

export function removeCartItem(cart, itemId) {
	if (!cart.some((row) => row.id === itemId)) return cart;
	return cart.filter((row) => row.id !== itemId);
}

export function summarizeCart(cart) {
	let count = 0;
	let total = 0;

	for (const row of cart) {
		count += row.quantity;
		total += row.price * row.quantity;
	}

	return { count, total };
}
