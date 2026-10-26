/**
 * Zvýhodněné menu: burger + příloha + nápoj + volitelná omáčka.
 * Definici sdílí kiosek i server, aby cenu a slevu počítaly stejně.
 */
export const MENU_SURCHARGE = 70;
export const NO_SAUCE = 0;

export const menuSlots = [
	{ key: 'burger', label: 'Burger', title: 'Vyberte burger', options: [{ id: 1 }, { id: 2 }, { id: 4 }] },
	{ key: 'side', label: 'Příloha', title: 'Vyberte přílohu', options: [{ id: 9 }, { id: 11, extra: 10 }] },
	{ key: 'drink', label: 'Nápoj', title: 'Vyberte nápoj', options: [{ id: 13 }, { id: 14 }] },
	{ key: 'sauce', label: 'Omáčka', title: 'Přidat omáčku?', optional: true, options: [{ id: 12 }] },
];

export const defaultMenu = Object.freeze({ burger: 1, side: 9, drink: 13, sauce: 12 });

export function isMenuBurger(itemId) {
	return menuSlots[0].options.some((option) => option.id === itemId);
}

export function menuKey(selection) {
	return `menu:${menuSlots.map((slot) => selection[slot.key]).join('-')}`;
}

/**
 * Vrátí cenu a složení menu, nebo null, pokud výběr není platný.
 * findItem(id) vrací položku katalogu s vlastnostmi id, name a price.
 */
export function priceMenu(selection, findItem) {
	if (typeof selection !== 'object' || selection === null) return null;

	const components = [];
	let extras = 0;

	for (const slot of menuSlots) {
		const id = selection[slot.key];

		if (slot.optional && id === NO_SAUCE) continue;

		const option = slot.options.find((candidate) => candidate.id === id);
		const item = option ? findItem(id) : null;
		if (!item) return null;

		extras += option.extra ?? 0;
		components.push({ id: item.id, name: item.name, price: item.price });
	}

	const [burger] = components;
	const price = burger.price + MENU_SURCHARGE + extras;
	const separatePrice = components.reduce((sum, item) => sum + item.price, 0);

	return {
		key: menuKey(selection),
		name: `Menu ${burger.name}`,
		price,
		separatePrice,
		saving: Math.max(0, separatePrice - price),
		components: components.map(({ id, name }) => ({ id, name })),
	};
}
