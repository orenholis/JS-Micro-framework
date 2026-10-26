import assert from 'node:assert/strict';
import { menuItems } from '../demo/data.js';
import { formatItemCount } from '../demo/format.js';
import { defaultMenu, NO_SAUCE, priceMenu } from '../demo/menu-deal.js';
import {
	addCartItem,
	addCartMenu,
	changeCartItemQuantity,
	clearCart,
	removeCartItem,
	summarizeCart,
} from '../demo/state.js';

let passed = 0;
const findItem = (id) => menuItems.find((item) => item.id === id);

function test(name, run) {
	run();
	passed += 1;
	console.log(`✓ ${name}`);
}

test('nová položka se přidá jako řádek s množstvím', () => {
	const cart = [];
	const item = menuItems[0];
	const result = addCartItem(cart, item, 2);

	assert.deepEqual(result, [{ key: 'item:1', type: 'item', id: 1, name: item.name, price: item.price, quantity: 2 }]);
	assert.deepEqual(cart, [], 'Původní košík se nesmí změnit.');
});

test('opakované přidání zvýší množství a zachová ostatní řádky', () => {
	const cart = addCartItem(addCartItem([], menuItems[0]), menuItems[1]);
	const result = addCartItem(cart, menuItems[0]);

	assert.equal(result[0].quantity, 2);
	assert.equal(result[1], cart[1]);
	assert.equal(cart[0].quantity, 1, 'Původní řádek se nesmí změnit.');
});

test('menu se ocení jako celek se slevou', () => {
	const menu = priceMenu(defaultMenu, findItem);

	assert.equal(menu.name, 'Menu Double Smash');
	assert.equal(menu.price, 259);
	assert.equal(menu.separatePrice, 312);
	assert.equal(menu.saving, 53);
	assert.deepEqual(menu.components.map((item) => item.name), ['Double Smash', 'Hranolky', 'Cola', 'Kečup']);
});

test('menu bez omáčky a s příplatkovou přílohou má správnou cenu', () => {
	const menu = priceMenu({ burger: 2, side: 11, drink: 14, sauce: NO_SAUCE }, findItem);

	assert.equal(menu.price, 169 + 70 + 10);
	assert.equal(menu.separatePrice, 169 + 69 + 49);
	assert.equal(menu.components.length, 3);
});

test('neplatné složení menu se odmítne', () => {
	assert.equal(priceMenu({ burger: 3, side: 9, drink: 13, sauce: 12 }, findItem), null);
	assert.equal(priceMenu({ burger: 1, side: 9, drink: 13 }, findItem), null);
});

test('menu je v košíku jeden řádek a stejné složení se sloučí', () => {
	const menu = priceMenu(defaultMenu, findItem);
	const cart = addCartMenu(addCartMenu([], menu, defaultMenu), menu, defaultMenu);

	assert.equal(cart.length, 1);
	assert.equal(cart[0].type, 'menu');
	assert.equal(cart[0].quantity, 2);
	assert.deepEqual(cart[0].selection, defaultMenu);
});

test('souhrn počítá cenu, mezisoučet a slevu za menu', () => {
	const menu = priceMenu(defaultMenu, findItem);
	const cart = addCartItem(addCartMenu([], menu, defaultMenu, 2), findItem(6));

	assert.deepEqual(summarizeCart(cart), { count: 3, total: 2 * 259 + 159, saving: 2 * 53, subtotal: 2 * 312 + 159 });
});

test('změna množství podle klíče a odebrání při nule', () => {
	const cart = addCartItem(addCartItem([], menuItems[0]), menuItems[1]);
	const increased = changeCartItemQuantity(cart, 'item:1', 2);
	const removed = changeCartItemQuantity(increased, 'item:1', -3);

	assert.equal(increased[0].quantity, 3);
	assert.equal(increased[1], cart[1]);
	assert.deepEqual(removed.map((row) => row.key), ['item:2']);
	assert.equal(changeCartItemQuantity(cart, 'item:99', 1), cart);
	assert.equal(changeCartItemQuantity(cart, 'item:1', 0), cart);
});

test('odebrání a vyprázdnění vrací stejné pole, pokud se nic nemění', () => {
	const cart = addCartItem([], menuItems[0]);

	assert.deepEqual(removeCartItem(cart, 'item:1'), []);
	assert.equal(removeCartItem(cart, 'item:2'), cart);
	const empty = [];
	assert.equal(clearCart(empty), empty);
	assert.deepEqual(clearCart(cart), []);
});

test('počet položek používá správný český tvar', () => {
	assert.equal(formatItemCount(1), '1 položka');
	assert.equal(formatItemCount(3), '3 položky');
	assert.equal(formatItemCount(5), '5 položek');
});

console.log(`\n${passed} testů doménové logiky kiosku prošlo.`);
