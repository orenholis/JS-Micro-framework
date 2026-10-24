import assert from 'node:assert/strict';
import { menuItems } from '../demo/data.js';
import { formatItemCount } from '../demo/format.js';
import {
	addCartItem,
	changeCartItemQuantity,
	clearCart,
	removeCartItem,
	summarizeCart,
} from '../demo/state.js';

let passed = 0;

function test(name, run) {
	run();
	passed += 1;
	console.log(`✓ ${name}`);
}

test('nová položka se přidá s množstvím jedna', () => {
	const cart = [];
	const item = menuItems[0];
	const result = addCartItem(cart, item);

	assert.deepEqual(result, [{ ...item, quantity: 1 }]);
	assert.deepEqual(cart, [], 'Původní košík se nesmí změnit.');
	assert.equal(item.quantity, undefined, 'Položka nabídky se nesmí změnit.');
});

test('opakované přidání zvýší množství a zachová ostatní řádky', () => {
	const unaffectedRow = { ...menuItems[1], quantity: 1 };
	const cart = [{ ...menuItems[0], quantity: 1 }, unaffectedRow];
	const result = addCartItem(cart, menuItems[0]);

	assert.equal(result[0].quantity, 2);
	assert.equal(result[1], unaffectedRow);
	assert.equal(cart[0].quantity, 1, 'Původní řádek se nesmí změnit.');
});

test('změna množství aktualizuje pouze nalezenou položku', () => {
	const unaffectedRow = { ...menuItems[1], quantity: 1 };
	const cart = [{ ...menuItems[0], quantity: 2 }, unaffectedRow];
	const result = changeCartItemQuantity(cart, menuItems[0].id, -1);

	assert.equal(result[0].quantity, 1);
	assert.equal(result[1], unaffectedRow);
});

test('snížení množství na nulu položku odstraní', () => {
	const cart = [
		{ ...menuItems[0], quantity: 1 },
		{ ...menuItems[1], quantity: 2 },
	];
	const result = changeCartItemQuantity(cart, menuItems[0].id, -1);

	assert.deepEqual(
		result.map((row) => row.id),
		[menuItems[1].id],
	);
});

test('neplatná změna zbytečně nevytvoří nový košík', () => {
	const cart = [{ ...menuItems[0], quantity: 1 }];

	assert.equal(changeCartItemQuantity(cart, 999, 1), cart);
	assert.equal(changeCartItemQuantity(cart, menuItems[0].id, 0), cart);
	assert.equal(changeCartItemQuantity(cart, menuItems[0].id, Number.NaN), cart);
});

test('odebrání odstraní pouze zvolenou položku', () => {
	const cart = [
		{ ...menuItems[0], quantity: 1 },
		{ ...menuItems[1], quantity: 1 },
	];
	const result = removeCartItem(cart, menuItems[0].id);

	assert.deepEqual(
		result.map((row) => row.id),
		[menuItems[1].id],
	);
	assert.equal(removeCartItem(cart, 999), cart);
});

test('vyprázdnění odstraní celý obsah a prázdný košík zachová', () => {
	const cart = [{ ...menuItems[0], quantity: 1 }];
	const emptyCart = [];

	assert.deepEqual(clearCart(cart), []);
	assert.equal(clearCart(emptyCart), emptyCart);
});

test('souhrn spočítá počet kusů a celkovou cenu', () => {
	const cart = [
		{ ...menuItems[0], quantity: 2 },
		{ ...menuItems[2], quantity: 3 },
	];

	assert.deepEqual(summarizeCart(cart), {
		count: 5,
		total: menuItems[0].price * 2 + menuItems[2].price * 3,
	});
	assert.deepEqual(summarizeCart([]), { count: 0, total: 0 });
});

test('počet položek používá správný český tvar', () => {
	assert.equal(formatItemCount(0), '0 položek');
	assert.equal(formatItemCount(1), '1 položka');
	assert.equal(formatItemCount(2), '2 položky');
	assert.equal(formatItemCount(4), '4 položky');
	assert.equal(formatItemCount(5), '5 položek');
	assert.equal(formatItemCount(21), '21 položek');
});

console.log(`\n${passed} testů doménové logiky kiosku prošlo.`);
