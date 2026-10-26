import * as framework from '../src/index.js';
import { circle, svg, SVG_NAMESPACE } from '../src/svg.js';

const { Component, button, div, each, li, match, mount, output, p, section, show, signal, span, strong, tag, ul, value } = framework;

const results = [];
const sandbox = document.querySelector('#sandbox');

function assert(condition, message = 'Assertion failed.') {
	if (!condition) throw new Error(message);
}

function test(name, run) {
	try {
		run();
		results.push({ name, ok: true });
	} catch (error) {
		results.push({ name, ok: false, error: error.message });
	} finally {
		sandbox.replaceChildren();
	}
}

/** Number of nodes inserted or removed below root while run() executes. */
function mutations(root, run) {
	const observer = new MutationObserver(() => {});
	observer.observe(root, { childList: true, subtree: true });
	run();
	const records = observer.takeRecords();
	observer.disconnect();
	return records.reduce((total, record) => total + record.addedNodes.length + record.removedNodes.length, 0);
}

test('Veřejné API nabízí jediný způsob zápisu', () => {
	for (const name of ['ViewComponent', 'state', 'element', 'bind', 'text', 'list', 'when', 'view', 'Scope']) {
		assert(!(name in framework), `Veřejné API stále exportuje ${name}.`);
	}
});

test('Signal oznamuje pouze skutečnou změnu', () => {
	const count = signal(1);
	const seen = [];
	const unsubscribe = count.subscribe((next) => seen.push(next));
	count.value = 1;
	count.update((current) => current + 1);
	unsubscribe();
	count.value = 3;
	assert(JSON.stringify(seen) === '[1,2]', `Neočekávaná oznámení: ${JSON.stringify(seen)}`);
});

test('Computed hodnota se aktualizuje synchronně a uvolní odběry', () => {
	const left = signal(2);
	const right = signal(3);

	class Sum extends Component {
		constructor() {
			super();
			this.total = this.computed([left, right], (a, b) => a + b);
		}

		template() {
			return output(this.total);
		}
	}

	const sum = mount(new Sum(), sandbox);
	left.value = 5;
	assert(sum.total.value === 8 && sum.root.textContent === '8', 'Odvozená hodnota nebyla aktualizována synchronně.');
	sum.destroy();
	assert(
		left.subscriberCount === 0 && right.subscriberCount === 0,
		'Odběry zůstaly aktivní po destrukci komponenty.',
	);
});

test('Komponenta aktualizuje jediný textový uzel', () => {
	class Counter extends Component {
		constructor() {
			super();
			this.count = this.signal(0);
		}

		template() {
			return p('Hodnota: ', this.count);
		}
	}

	const counter = mount(new Counter(), sandbox);
	const textNode = counter.root.lastChild;
	const changed = mutations(counter.root, () => {
		counter.count.value = 4;
	});
	assert(counter.root.lastChild === textNode, 'Textový uzel byl nahrazen.');
	assert(changed === 0, 'Změna textu vložila nebo odebrala uzly.');
	assert(counter.root.textContent === 'Hodnota: 4', 'Text neodpovídá stavu.');
	counter.destroy();
	assert(counter.count.subscriberCount === 0, 'Odběr zůstal aktivní.');
});

test('Deklarativní strom vytvoří vnořený DOM bez ručního append', () => {
	class Counter extends Component {
		constructor() {
			super();
			this.count = this.signal(0);
		}

		template() {
			return section(
				button('Počet: ', strong(this.count))
					.prop('type', 'button')
					.ref('button')
					.class('is-positive', this.count.map((count) => count > 0))
					.on('click', () => this.count.update((count) => count + 1)),
			)
				.class('counter')
				.ref('section');
		}
	}

	const counter = mount(new Counter(), sandbox);
	assert(counter.root === counter.refs.section, 'Kořenový ref neodkazuje na vytvořený element.');
	assert(counter.refs.button.textContent === 'Počet: 0', 'Vnořený obsah nebyl vytvořen.');
	counter.refs.button.click();
	assert(counter.refs.button.textContent === 'Počet: 1', 'Reaktivní text se neaktualizoval.');
	assert(counter.refs.button.classList.contains('is-positive'), 'Reaktivní CSS třída se neaktualizovala.');
	counter.destroy();
	assert(counter.count.subscriberCount === 0, 'Deklarativní vazby nebyly při destrukci uvolněny.');
});

test('Fluent zápis řetězí element, třídy, atributy, událost a obsah', () => {
	class Counter extends Component {
		constructor() {
			super();
			this.count = this.signal(0);
			this.color = this.signal('red');
		}

		template() {
			return div(
				button('Počet: ', this.count)
					.class('is-positive', this.count.map((count) => count > 0))
					.class('counter')
					.prop('type', 'button')
					.aria('label', 'Zvýšit počet')
					.data('testid', 'counter')
					.style('color', this.color)
					.ref('button')
					.on('click', () => this.count.update((count) => count + 1)),
			)
				.class('wrapper')
				.ref('root');
		}
	}

	const counter = mount(new Counter(), sandbox);
	const buttonNode = counter.refs.button;
	assert(counter.root === counter.refs.root, 'Reference kořene nebyla uložena.');
	assert(buttonNode.getAttribute('aria-label') === 'Zvýšit počet', 'ARIA atribut nebyl nastaven.');
	assert(buttonNode.dataset.testid === 'counter', 'Datový atribut nebyl nastaven.');
	assert(buttonNode.classList.contains('counter'), 'Statická třída chybí.');
	buttonNode.click();
	counter.color.value = 'blue';
	assert(buttonNode.textContent === 'Počet: 1', 'Reaktivní text se neaktualizoval.');
	assert(buttonNode.className === 'counter is-positive', 'Reaktivní a statická třída se nesešly.');
	assert(buttonNode.style.color === 'blue', 'Reaktivní styl se neaktualizoval.');
	counter.destroy();
	assert(
		counter.count.subscriberCount === 0 && counter.color.subscriberCount === 0,
		'Fluent vazby nebyly uvolněny.',
	);
});

test('Volitelný SVG modul vytvoří a aktualizuje SVG element', () => {
	class Icon extends Component {
		constructor() {
			super();
			this.radius = this.signal(4);
		}

		template() {
			return svg(circle().attr('cx', 8).attr('cy', 8).attr('r', this.radius)).attr('viewBox', '0 0 16 16');
		}
	}

	const icon = mount(new Icon(), sandbox);
	const circleNode = icon.root.firstChild;
	assert(icon.root.namespaceURI === SVG_NAMESPACE, 'Kořen nemá SVG namespace.');
	assert(circleNode.namespaceURI === SVG_NAMESPACE, 'Potomek nemá SVG namespace.');
	icon.radius.value = 6;
	assert(circleNode.getAttribute('r') === '6', 'SVG atribut se neaktualizoval.');
	icon.destroy();
	assert(icon.radius.subscriberCount === 0, 'SVG vazba nebyla uvolněna.');
});

test('Vlastní element a rozšíření řetězce fungují bez změny jádra', () => {
	const labelled = (builder, label) => {
		builder.class('labelled').aria('label', label);
	};

	class CustomElement extends Component {
		template() {
			return tag('status-panel', 'Připraveno').use(labelled, 'Stav aplikace').data('state', 'ready');
		}
	}

	const component = mount(new CustomElement(), sandbox);
	assert(component.root.localName === 'status-panel', 'Vlastní název elementu nebyl použit.');
	assert(component.root.classList.contains('labelled'), 'Rozšíření nenastavilo CSS třídu.');
	assert(component.root.getAttribute('aria-label') === 'Stav aplikace', 'Rozšíření nenastavilo atribut.');
	component.destroy();
});

test('Šablona může vrátit uzel vytvořený přímo přes Web API', () => {
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

	const component = mount(new Native(), sandbox);
	const node = component.root;
	assert(node.localName === 'canvas', 'Uzel z Web API nebyl použit jako kořen.');
	node.click();
	component.destroy();
	node.click();
	assert(calls === 1, `Listener se provedl ${calls}krát.`);
});

test('Událost se po destrukci komponenty již neprovede', () => {
	let calls = 0;

	class Clicker extends Component {
		template() {
			return button('Test')
				.prop('type', 'button')
				.on('click', () => {
					calls += 1;
				});
		}
	}

	const component = mount(new Clicker(), sandbox);
	const node = component.root;
	node.click();
	component.destroy();
	node.click();
	assert(calls === 1, `Listener se provedl ${calls}krát.`);
});

test('Keyed seznam zachová identitu a mění jen dotčené uzly', () => {
	const items = signal([
		{ id: 1, label: 'A' },
		{ id: 2, label: 'B' },
		{ id: 3, label: 'C' },
	]);

	class Row extends Component {
		template() {
			return li(this.props.item.map((item) => item.label)).data('key', this.props.item.value.id);
		}
	}

	class List extends Component {
		template() {
			return ul(each(items, { key: (item) => item.id, render: (item) => new Row({ item }) }));
		}
	}

	const list = mount(new List(), sandbox);
	const keys = () => [...list.root.querySelectorAll('li')].map((node) => node.dataset.key).join(',');
	const originalTwo = list.root.querySelector('[data-key="2"]');
	const sourceSubscribers = items.subscriberCount;

	const unchanged = mutations(list.root, () => {
		items.value = items.value.map((item) => ({ ...item }));
	});
	assert(unchanged === 0, `Aktualizace beze změny pořadí provedla ${unchanged} DOM mutací.`);

	const removal = mutations(list.root, () => {
		items.value = items.value.filter((item) => item.id !== 1);
	});
	assert(removal === 1, `Odebrání jedné položky provedlo ${removal} DOM mutací.`);

	items.value = [
		{ id: 3, label: 'C' },
		{ id: 2, label: 'B změněno' },
		{ id: 4, label: 'D' },
	];
	assert(list.root.querySelector('[data-key="2"]') === originalTwo, 'Uzel se stejným klíčem byl nahrazen.');
	assert(originalTwo.textContent === 'B změněno', 'Data zachovaného řádku se neaktualizovala.');
	assert(keys() === '3,2,4', `Pořadí uzlů neodpovídá datům: ${keys()}.`);
	assert(items.subscriberCount === sourceSubscribers, 'Aktualizace seznamu přidala odběr zdroje.');

	const destroyed = mutations(sandbox, () => list.destroy());
	assert(destroyed === 1, `Destrukce seznamu provedla ${destroyed} DOM mutací místo jedné.`);
	assert(items.subscriberCount === 0, 'Seznam neuvolnil odběr zdroje.');
});

test('Podmíněný podstrom se vytvoří, nahradí a uklidí', () => {
	let destroyed = 0;
	const visible = signal(null);

	class Branch extends Component {
		template() {
			return span(this.props.label);
		}

		beforeDestroy() {
			destroyed += 1;
		}
	}

	class Holder extends Component {
		template() {
			return div(show(visible, (label) => new Branch({ label })));
		}
	}

	const holder = mount(new Holder(), sandbox);
	visible.value = 'první';
	visible.value = 'druhý';
	visible.value = null;
	assert(destroyed === 2, `Očekávány 2 cleanupy, získáno ${destroyed}.`);
	assert(holder.root.querySelector('span') === null, 'Nepravdivá větev zůstala v DOM.');
	holder.destroy();
	assert(visible.subscriberCount === 0, 'Podmínka neuvolnila odběr.');
});

test('match přepíná varianty podle hodnoty', () => {
	const screen = signal('catalog');

	class Screens extends Component {
		template() {
			return div(match(screen, { catalog: () => span('Katalog'), order: () => span('Objednávka') }));
		}
	}

	const screens = mount(new Screens(), sandbox);
	screen.value = 'order';
	assert(screens.root.textContent === 'Objednávka', 'Varianta se nepřepnula.');
	screen.value = 'missing';
	assert(screens.root.textContent === '', 'Neznámá varianta něco vykreslila.');
	screens.destroy();
	assert(screen.subscriberCount === 0, 'match neuvolnil odběr.');
});

test('afterMount vnořené komponenty běží až v dokumentu', () => {
	let connected = null;

	class Leaf extends Component {
		template() {
			return span('list');
		}

		afterMount() {
			connected = this.root.isConnected;
		}
	}

	class Branch extends Component {
		template() {
			return div(new Leaf());
		}
	}

	mount(new Branch(), sandbox).destroy();
	assert(connected === true, 'afterMount běžel před vložením do dokumentu.');
});

test('value přijme statickou hodnotu i signál', () => {
	assert(value(2, (number) => number * 2) === 4, 'Statická hodnota nebyla transformována.');
	const price = signal(10);

	class Price extends Component {
		template() {
			return span(value(price, (amount) => `${amount} Kč`));
		}
	}

	const view = mount(new Price(), sandbox);
	price.value = 12;
	assert(view.root.textContent === '12 Kč', 'Vazba z value() se neaktualizovala.');
	view.destroy();
});

test('Duplicitní klíč je oznámen jako chyba', () => {
	const items = signal([]);

	class List extends Component {
		template() {
			return ul(each(items, { key: (item) => item.id, render: (item) => li(String(item.value.id)) }));
		}
	}

	const list = mount(new List(), sandbox);
	let failed = false;
	try {
		items.value = [{ id: 1 }, { id: 1 }];
	} catch {
		failed = true;
	}
	list.destroy();
	assert(failed, 'Duplicitní klíč nebyl odmítnut.');
});

const passed = results.filter((result) => result.ok).length;
const summary = document.querySelector('#summary');
summary.textContent = `${passed}/${results.length} testů prošlo.`;
summary.className = passed === results.length ? 'pass' : 'fail';

const listNode = document.querySelector('#results');
for (const result of results) {
	const item = document.createElement('li');
	item.className = result.ok ? 'pass' : 'fail';
	item.textContent = result.ok ? `✓ ${result.name}` : `✗ ${result.name}: ${result.error}`;
	listNode.append(item);
}

window.__TEST_RESULTS__ = { passed, total: results.length, results };
