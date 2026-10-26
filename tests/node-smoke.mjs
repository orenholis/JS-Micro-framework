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
		this.classList = {
			add: (...names) => {
				for (const name of names) this.classList.toggle(name, true);
			},
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

	get isConnected() {
		let current = this;
		while (current.parentNode) current = current.parentNode;
		return current === document;
	}

	get nextSibling() {
		const siblings = this.parentNode?.childNodes ?? [];
		return siblings[siblings.indexOf(this) + 1] ?? null;
	}

	contains(node) {
		for (let current = node; current; current = current.parentNode) {
			if (current === this) return true;
		}
		return false;
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

	click() {
		this.dispatchEvent(new Event('click'));
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

const framework = await import('../src/index.js');
const { Component, button, computed, div, each, h2, img, li, match, mount, p, section, show, signal, span, tag, ul, value } = framework;
const host = () => document.createElement('div');

const { circle, svg, SVG_NAMESPACE } = await import('../src/svg.js');

let passed = 0;

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function test(name, run) {
	run();
	passed += 1;
	console.log(`✓ ${name}`);
}

test('veřejné API obsahuje jen jeden způsob zápisu', () => {
	for (const name of ['ViewComponent', 'state', 'element', 'bind', 'text', 'list', 'when', 'view', 'Scope']) {
		assert(!(name in framework), `Veřejné API stále exportuje ${name}.`);
	}
});

test('signal, Object.is a synchronní computed', () => {
	const left = signal(2);
	const right = signal(3);
	const notifications = [];
	left.subscribe((current) => notifications.push(current));

	class Sum extends Component {
		constructor() {
			super();
			this.total = this.computed([left, right], (a, b) => a + b);
		}

		template() {
			return span(this.total);
		}
	}

	const sum = mount(new Sum(), host());
	left.value = 2;
	left.value = 5;
	assert(sum.total.value === 8 && sum.root.textContent === '8', 'Computed hodnota není synchronní.');
	assert(notifications.join(',') === '2,5', 'Signal oznámil nezměněnou hodnotu.');
	sum.destroy();
	assert(right.subscriberCount === 0, 'Computed neuvolnil odběr.');
	assert(typeof computed === 'function', 'computed chybí ve veřejném API.');
});

test('cílená textová vazba zachová uzel', () => {
	class Counter extends Component {
		constructor() {
			super();
			this.count = this.signal(0);
		}

		template() {
			return p('Hodnota ', this.count);
		}
	}

	const counter = mount(new Counter(), host());
	const textNode = counter.root.childNodes[1];
	counter.count.value = 4;
	assert(counter.root.childNodes[1] === textNode, 'Textový uzel byl nahrazen.');
	assert(counter.root.textContent === 'Hodnota 4', 'Text neodpovídá stavu.');
	counter.destroy();
	assert(counter.count.subscriberCount === 0, 'Odběr zůstal aktivní.');
});

test('AbortController odstraní listenery komponenty', () => {
	let calls = 0;
	class Clicker extends Component {
		template() {
			return button('Klik').on('click', () => {
				calls += 1;
			});
		}
	}

	const component = mount(new Clicker(), host());
	const node = component.root;
	node.click();
	component.destroy();
	node.click();
	assert(calls === 1, 'Listener zůstal aktivní po destroy.');
});

test('šablona může vrátit uzel vytvořený přímo přes Web API', () => {
	let calls = 0;
	class Native extends Component {
		template() {
			const node = document.createElement('canvas');
			this.listen(node, 'click', () => {
				calls += 1;
			});
			return node;
		}
	}

	const component = mount(new Native(), host());
	const node = component.root;
	assert(node.nodeName === 'CANVAS', 'Uzel vytvořený přes Web API nebyl použit jako kořen.');
	node.click();
	component.destroy();
	node.click();
	assert(calls === 1, 'Listener registrovaný přes this.listen zůstal aktivní.');
});

test('deklarativní strom vytvoří children, refs, události a reaktivní vazby', () => {
	class Card extends Component {
		constructor() {
			super();
			this.title = this.signal('Původní');
			this.active = this.signal(false);
		}

		template() {
			return section(
				h2(this.title),
				button('Změnit')
					.ref('button')
					.prop('type', 'button')
					.on('click', () => {
						this.title.value = 'Změněno';
						this.active.value = true;
					}),
			)
				.ref('card')
				.class('card')
				.class('is-active', this.active);
		}
	}

	const card = mount(new Card(), host());
	const heading = card.root.childNodes[0];
	assert(card.refs.card === card.root, 'Kořenová reference nebyla uložena.');
	assert(card.refs.button === card.root.childNodes[1], 'Reference potomka nebyla uložena.');
	card.refs.button.click();
	assert(heading.textContent === 'Změněno', 'Reaktivní text se přes strom neaktualizoval.');
	assert(card.root.className === 'card is-active', 'Reaktivní CSS třída se neaktualizovala.');
	card.destroy();
	assert(
		card.title.subscriberCount === 0 && card.active.subscriberCount === 0,
		'Strom neuvolnil reaktivní odběry.',
	);
});

test('fluent API vytváří vnořený DOM a řetězí statické i reaktivní nastavení', () => {
	class FluentCounter extends Component {
		constructor() {
			super();
			this.count = this.signal(0);
			this.color = this.signal('red');
		}

		template() {
			return div(
				button('Počet: ', value(this.count))
					.class('counter')
					.class(
						'is-positive',
						value(this.count, (count) => count > 0),
					)
					.prop('type', 'button')
					.aria('label', 'Zvýšit počet')
					.data('testid', 'counter')
					.style('color', value(this.color))
					.ref('button')
					.on('click', () => this.count.update((count) => count + 1)),
			)
				.class('wrapper')
				.ref('root');
		}
	}

	const counter = mount(new FluentCounter(), host());
	const buttonNode = counter.refs.button;
	assert(counter.root === counter.refs.root, 'Reference kořene nebyla uložena.');
	assert(counter.root.className === 'wrapper', 'Statická třída nebyla nastavena.');
	assert(
		buttonNode.attributes.get('aria-label') === 'Zvýšit počet',
		'ARIA atribut nebyl nastaven.',
	);
	assert(
		buttonNode.attributes.get('data-testid') === 'counter',
		'Datový atribut nebyl nastaven.',
	);
	assert(buttonNode.type === 'button', 'DOM vlastnost nebyla nastavena.');
	buttonNode.click();
	counter.color.value = 'blue';
	assert(buttonNode.textContent === 'Počet: 1', 'Reaktivní text se neaktualizoval.');
	assert(buttonNode.className === 'counter is-positive', 'Reaktivní třída se neaktualizovala.');
	assert(buttonNode.style.color === 'blue', 'Reaktivní styl se neaktualizoval.');
	counter.destroy();
	assert(
		counter.count.subscriberCount === 0 && counter.color.subscriberCount === 0,
		'Fluent vazby nebyly uvolněny.',
	);
});

test('volitelný SVG modul vytváří elementy ve správném jmenném prostoru', () => {
	class Icon extends Component {
		template() {
			return svg(circle().attr('cx', 8).attr('cy', 8).attr('r', 6)).attr(
				'viewBox',
				'0 0 16 16',
			);
		}
	}

	const icon = mount(new Icon(), host());
	assert(icon.root.namespaceURI === SVG_NAMESPACE, 'SVG kořen nemá SVG namespace.');
	assert(
		icon.root.childNodes[0].namespaceURI === SVG_NAMESPACE,
		'SVG potomek nemá SVG namespace.',
	);
	assert(icon.root.childNodes[0].attributes.get('r') === '6', 'SVG atribut nebyl nastaven.');
	icon.destroy();
});

test('vlastní element a rozšíření řetězce nevyžadují změnu jádra', () => {
	const labelled = (builder, label) => {
		builder.class('labelled').aria('label', label);
	};

	class CustomElement extends Component {
		template() {
			return tag('status-panel', 'Připraveno')
				.use(labelled, 'Stav aplikace')
				.data('state', 'ready');
		}
	}

	const component = mount(new CustomElement(), host());
	assert(component.root.nodeName === 'STATUS-PANEL', 'Vlastní název elementu nebyl použit.');
	assert(component.root.className === 'labelled', 'Rozšíření nenastavilo CSS třídu.');
	assert(
		component.root.attributes.get('aria-label') === 'Stav aplikace',
		'Rozšíření nenastavilo atribut.',
	);
	component.destroy();
});

test('keyed seznam zachová identitu a pořadí', () => {
	const source = signal([
		{ id: 1, label: 'A' },
		{ id: 2, label: 'B' },
		{ id: 3, label: 'C' },
	]);

	class Row extends Component {
		template() {
			return li(this.props.item.map((item) => item.label)).data('id', this.props.item.value.id);
		}
	}

	class List extends Component {
		template() {
			return ul(each(source, { key: (item) => item.id, render: (item) => new Row({ item }) }));
		}
	}

	const list = mount(new List(), host());
	const rows = () => list.root.childNodes.filter((node) => node.nodeName === 'LI');
	const originalTwo = rows()[1];
	source.value = [
		{ id: 3, label: 'C' },
		{ id: 2, label: 'B2' },
		{ id: 4, label: 'D' },
	];
	assert(rows()[1] === originalTwo, 'Uzel se stejným klíčem byl nahrazen.');
	assert(
		rows()
			.map((node) => node.attributes.get('data-id'))
			.join(',') === '3,2,4',
		'Pořadí neodpovídá zdroji.',
	);
	assert(originalTwo.textContent === 'B2', 'Data zachovaného řádku se nezměnila.');
	list.destroy();
	assert(source.subscriberCount === 0, 'Seznam neuvolnil odběr.');
});

test('podmíněná komponenta provede cleanup', () => {
	let cleanups = 0;
	class Branch extends Component {
		template() {
			return span(this.props.label);
		}

		beforeDestroy() {
			cleanups += 1;
		}
	}

	const source = signal(null);
	class Holder extends Component {
		template() {
			return div(show(source, (label) => new Branch({ label })));
		}
	}

	const holder = mount(new Holder(), host());
	source.value = 'A';
	source.value = 'B';
	source.value = null;
	assert(cleanups === 2, 'Podmíněné větve nebyly uklizeny.');
	source.value = 'C';
	holder.destroy();
	assert(cleanups === 3, 'Destrukce rodiče neuklidila aktivní větev.');
	assert(source.subscriberCount === 0, 'Podmínka neuvolnila odběr.');
});

test('duplicitní klíč v seznamu je chyba', () => {
	class Broken extends Component {
		template() {
			return ul(each(signal([{ id: 1 }, { id: 1 }]), { key: (item) => item.id, render: () => li('x') }));
		}
	}

	let error = null;
	try {
		mount(new Broken(), host());
	} catch (caught) {
		error = caught;
	}
	assert(error?.message.includes('Duplicate list key'), 'Duplicitní klíč nebyl odmítnut.');
});

test('statická třída nepřepíše dříve deklarovanou reaktivní třídu', () => {
	class Box extends Component {
		constructor() {
			super();
			this.active = this.signal(true);
		}

		template() {
			return div().class('is-active', this.active).class('box');
		}
	}

	const box = mount(new Box(), host());
	assert(box.root.className.split(' ').sort().join(' ') === 'box is-active', 'Statická třída přepsala reaktivní.');
	box.active.value = false;
	assert(box.root.className === 'box', 'Reaktivní třída se po změně neodebrala.');
	box.destroy();
});

test('seznam bez změny pořadí nepřesouvá uzly', () => {
	const items = signal([1, 2, 3, 4].map((id) => ({ id })));
	class List extends Component {
		template() {
			return ul(each(items, { key: (item) => item.id, render: (item) => li(item.map((current) => current.id)) }));
		}
	}

	const list = mount(new List(), host());
	let moves = 0;
	const insertBefore = list.root.insertBefore.bind(list.root);
	list.root.insertBefore = (node, before) => {
		moves += 1;
		return insertBefore(node, before);
	};
	items.value = items.value.map((item) => ({ ...item }));
	assert(moves === 0, `Seznam přesunul ${moves} nezměněných uzlů.`);
	items.value = items.value.toReversed();
	assert(moves > 0 && list.root.textContent === '4321', 'Seznam nepřeuspořádal položky.');
	list.destroy();
});

test('afterMount vnořené komponenty běží až po připojení celého stromu', () => {
	const calls = [];
	class Leaf extends Component {
		template() {
			return span('list');
		}

		afterMount() {
			calls.push(`leaf:${this.root.isConnected}`);
		}
	}

	class Branch extends Component {
		template() {
			return div(new Leaf());
		}

		afterMount() {
			calls.push(`branch:${this.root.isConnected}`);
		}
	}

	const branch = mount(new Branch(), document);
	assert(calls.join(',') === 'leaf:true,branch:true', `Neočekávané pořadí afterMount: ${calls}`);
	branch.destroy();
});

test('destrukce odebere z dokumentu jen kořen, ne každý vnořený uzel', () => {
	const rows = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
	class Row extends Component {
		template() {
			return li(this.props.row.map((row) => row.id));
		}
	}

	class Table extends Component {
		template() {
			return ul(each(rows, { key: (row) => row.id, render: (row) => new Row({ row }) }));
		}
	}

	const target = host();
	const table = mount(new Table(), target);
	const removed = [];
	for (const node of [table.root, ...table.root.childNodes]) {
		const remove = node.remove.bind(node);
		node.remove = () => {
			removed.push(node.nodeName);
			remove();
		};
	}

	table.destroy();
	assert(removed.join(',') === 'UL', `Odebrané uzly: ${removed}`);
	assert(target.childNodes.length === 0 && rows.subscriberCount === 0, 'Destrukce neuvolnila seznam.');
});

test('value přijme statickou hodnotu a signal.map vytvoří vazbu', () => {
	assert(value(2, (number) => number * 2) === 4, 'Statická hodnota nebyla transformována.');
	const price = signal(10);
	class Price extends Component {
		template() {
			return span(price.map((amount) => `${amount} Kč`)).attr('data-price', price);
		}
	}

	const view = mount(new Price(), host());
	price.value = 12;
	assert(view.root.textContent === '12 Kč', 'Text navázaný přes map se neaktualizoval.');
	assert(view.root.attributes.get('data-price') === '12', 'Signál nelze použít přímo jako hodnotu.');
	view.destroy();
	assert(price.subscriberCount === 0, 'Vazby nebyly uvolněny.');
	assert(typeof img === 'function', 'Veřejné API neexportuje všechny HTML elementy.');
});

test('match přepíná obrazovky a show s prázdným výsledkem nic nevloží', () => {
	const screen = signal('catalog');
	const hidden = signal(true);
	class Screens extends Component {
		template() {
			return div(
				match(screen, { catalog: () => span('katalog'), order: () => span('objednávka') }),
				show(hidden, () => null),
			);
		}
	}

	const view = mount(new Screens(), host());
	assert(view.root.textContent === 'katalog', 'Výchozí obrazovka chybí.');
	screen.value = 'order';
	assert(view.root.textContent === 'objednávka', 'Obrazovka se nepřepnula.');
	screen.value = 'unknown';
	assert(view.root.textContent === '', 'Neznámá obrazovka něco vykreslila.');
	view.destroy();
	assert(screen.subscriberCount === 0, 'match neuvolnil odběr.');
});

test('ref v položce seznamu se uloží do vlastnící komponenty', () => {
	class Menu extends Component {
		template() {
			return ul(each(signal([{ id: 'a' }]), { key: (item) => item.id, render: () => li('A').ref('first') }));
		}
	}

	const menu = mount(new Menu(), host());
	assert(menu.refs.first?.nodeName === 'LI', 'Reference zůstala ve skryté pomocné komponentě.');
	menu.destroy();
});

test('každá exportovaná HTML funkce vytvoří element svého jména', () => {
	const names = 'a article aside button div footer form h1 h2 h3 header img input label li main nav ol option output p section select small span strong table tbody td textarea th thead tr ul';
	for (const name of names.split(' ')) {
		assert(framework[name]().name === name, `Export ${name} vytváří jiný element.`);
	}
});

console.log(`\n${passed} smoke testů prošlo.`);
