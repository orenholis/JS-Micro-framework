import assert from 'node:assert/strict';

class TestNode extends EventTarget {
	constructor(nodeName = '#node') {
		super();
		this.nodeName = nodeName;
		this.parentNode = null;
		this.childNodes = [];
		this.attributes = new Map();
		this.dataset = {};
		this.style = {};
		this.className = '';
		this.disabled = false;
		this.hidden = false;
		this.classList = {
			contains: (name) => this.className.split(/\s+/).includes(name),
			toggle: (name, enabled) => {
				const names = new Set(this.className.split(/\s+/).filter(Boolean));
				if (enabled) names.add(name);
				else names.delete(name);
				this.className = [...names].join(' ');
			},
		};
	}

	append(...children) {
		for (const child of children) {
			this.insertBefore(
				child instanceof TestNode ? child : document.createTextNode(String(child)),
				null,
			);
		}
	}

	insertBefore(node, before) {
		if (node instanceof TestFragment) {
			for (const child of [...node.childNodes]) this.insertBefore(child, before);
			return node;
		}

		node.remove();
		const index = before == null ? this.childNodes.length : this.childNodes.indexOf(before);
		if (index < 0) throw new Error('Reference node is not a child.');
		this.childNodes.splice(index, 0, node);
		node.parentNode = this;
		return node;
	}

	remove() {
		if (!this.parentNode) return;
		const index = this.parentNode.childNodes.indexOf(this);
		if (index >= 0) this.parentNode.childNodes.splice(index, 1);
		this.parentNode = null;
	}

	setAttribute(name, value) {
		this.attributes.set(name, String(value));
	}

	removeAttribute(name) {
		this.attributes.delete(name);
	}

	getAttribute(name) {
		return this.attributes.get(name) ?? null;
	}

	focus() {
		document.activeElement = this;
	}

	click() {
		if (!this.disabled) this.dispatchEvent(new Event('click'));
	}

	get isConnected() {
		let current = this;
		while (current.parentNode) current = current.parentNode;
		return current === document;
	}

	get textContent() {
		return this.nodeName === '#text'
			? this.nodeValue
			: this.childNodes.map((child) => child.textContent).join('');
	}

	set textContent(value) {
		if (this.nodeName === '#text') {
			this.nodeValue = String(value);
			return;
		}

		for (const child of this.childNodes) child.parentNode = null;
		this.childNodes = [];
		if (value !== '') this.append(document.createTextNode(String(value)));
	}
}

class TestText extends TestNode {
	constructor(value) {
		super('#text');
		this.nodeValue = String(value);
	}
}

class TestFragment extends TestNode {
	constructor() {
		super('#document-fragment');
	}
}

class TestDocument extends TestNode {
	constructor() {
		super('#document');
		this.activeElement = null;
	}

	createElement(name) {
		return new TestNode(name.toUpperCase());
	}

	createElementNS(namespace, name) {
		const node = this.createElement(name);
		node.namespaceURI = namespace;
		return node;
	}

	createTextNode(value) {
		return new TestText(value);
	}

	createComment(value) {
		const node = new TestNode('#comment');
		node.nodeValue = value;
		return node;
	}

	createDocumentFragment() {
		return new TestFragment();
	}
}

globalThis.Node = TestNode;
globalThis.DocumentFragment = TestFragment;
globalThis.document = new TestDocument();

const { menuItems, categories } = await import('../demo/data.js');
const { KioskApp } = await import('../demo/components/KioskApp.js');
const { mount } = await import('../src/index.js');

function descendants(root) {
	return [root, ...root.childNodes.flatMap((child) => descendants(child))];
}

function findButton(root, name) {
	const button = descendants(root).find((node) =>
		node.nodeName === 'BUTTON'
		&& (node.textContent.trim() === name || node.getAttribute('aria-label') === name),
	);

	assert.ok(button, `Tlačítko „${name}“ nebylo nalezeno.`);
	return button;
}

function findProduct(root, name) {
	const button = descendants(root).find((node) =>
		node.nodeName === 'BUTTON'
		&& node.classList.contains('menu-card')
		&& node.textContent.includes(name),
	);

	assert.ok(button, `Produkt „${name}“ nebyl nalezen.`);
	return button;
}

function findCartRow(root, name) {
	return descendants(root).find((node) =>
		node.nodeName === 'ARTICLE' && node.textContent.includes(name),
	);
}

async function settle() {
	await Promise.resolve();
	await Promise.resolve();
}

const createdOrders = [];
const api = {
	async listCategories() {
		return categories;
	},
	async listMenuItems(categoryId) {
		return menuItems.filter((item) => item.category === categoryId);
	},
	async getMenuItem(itemId) {
		return menuItems.find((item) => item.id === itemId);
	},
	async createOrder(cart) {
		createdOrders.push(cart.map((item) => ({ id: item.id, quantity: item.quantity })));
		return {
			id: 41,
			status: 'created',
			count: cart.reduce((sum, item) => sum + item.quantity, 0),
			total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
		};
	},
};

const host = document.createElement('div');
document.append(host);
const app = mount(new KioskApp({ api }), host);
await settle();

findButton(app.root, 'Nápoje').click();
await settle();
assert.equal(app.category.value, 'drinks');
assert.deepEqual(app.visibleItems.value.map((item) => item.name), ['Espresso', 'Perlivá voda']);

const espressoTrigger = findProduct(app.root, 'Espresso');
espressoTrigger.focus();
espressoTrigger.click();
await settle();
assert.equal(app.detailItem.value.name, 'Espresso');
assert.equal(document.activeElement.getAttribute('aria-label'), 'Zavřít detail');

const escape = new Event('keydown');
Object.defineProperty(escape, 'key', { value: 'Escape' });
document.dispatchEvent(escape);
assert.equal(app.detailItemId.value, null);
assert.equal(document.activeElement, espressoTrigger);

espressoTrigger.click();
await settle();
findButton(app.root, 'Přidat do objednávky').click();
assert.equal(app.cartSummary.value.count, 1);
assert.equal(app.cartSummary.value.total, 55);

const espressoRow = findCartRow(app.root, 'Espresso');
findButton(app.root, 'Zvýšit množství: Espresso').click();
assert.equal(app.cartSummary.value.count, 2);
assert.equal(app.cartSummary.value.total, 110);
assert.equal(findCartRow(app.root, 'Espresso'), espressoRow, 'Řádek košíku ztratil identitu.');

findButton(app.root, 'Oblíbené').click();
await settle();
findProduct(app.root, 'Kuřecí burger').click();
await settle();
findButton(app.root, 'Přidat do objednávky').click();
assert.equal(app.cartSummary.value.count, 3);
assert.equal(app.cartSummary.value.total, 269);

findButton(app.root, 'Odebrat z objednávky: Espresso').click();
assert.equal(app.cartSummary.value.count, 1);
assert.equal(app.cartSummary.value.total, 159);

findButton(app.root, 'Potvrdit objednávku').click();
await settle();
assert.deepEqual(createdOrders, [[{ id: 1, quantity: 1 }]]);
assert.ok(app.root.textContent.includes('Číslo objednávky: 41'));
assert.equal(document.activeElement.textContent, 'Nová objednávka');

findButton(app.root, 'Nová objednávka').click();
assert.equal(app.confirmation.value, null);
assert.deepEqual(app.cart.value, []);

app.destroy();
assert.equal(app.cart.subscriberCount, 0);
assert.equal(app.detailStatus.subscriberCount, 0);
assert.equal(app.confirmation.subscriberCount, 0);
assert.equal(host.childNodes.length, 0);

console.log('✓ kompletní scénář kiosku včetně klávesnice, identity řádků a cleanupu');
console.log('\n1 integrační scénář kiosku prošel.');
