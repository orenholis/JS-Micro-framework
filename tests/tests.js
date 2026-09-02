import {
  Component,
  Scope,
  ViewComponent,
  computed,
  element,
  list,
  mount,
  state,
  value,
  when,
} from '../src/index.js';

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

test('Signal oznamuje pouze skutečnou změnu', () => {
  const value = state(1);
  const seen = [];
  const unsubscribe = value.subscribe((next) => seen.push(next));
  value.value = 1;
  value.update((current) => current + 1);
  unsubscribe();
  value.value = 3;
  assert(JSON.stringify(seen) === '[1,2]', `Neočekávaná oznámení: ${JSON.stringify(seen)}`);
});

test('Computed hodnota se aktualizuje synchronně a uvolní odběry', () => {
  const scope = new Scope();
  const left = state(2);
  const right = state(3);
  const total = computed([left, right], (a, b) => a + b, scope);
  left.value = 5;
  assert(total.value === 8, 'Odvozená hodnota nebyla aktualizována synchronně.');
  scope.destroy();
  assert(left.subscriberCount === 0 && right.subscriberCount === 0, 'Odběry zůstaly aktivní po destrukci scope.');
});

test('Komponenta aktualizuje jediný textový uzel', () => {
  class Counter extends Component {
    constructor() {
      super();
      this.count = this.signal(0);
    }

    create() {
      return element('p', {}, ['Hodnota: ', this.text(this.count)]);
    }
  }

  const counter = mount(new Counter(), sandbox);
  const textNode = counter.root.lastChild;
  counter.count.value = 4;
  assert(counter.root.lastChild === textNode, 'Textový uzel byl nahrazen.');
  assert(counter.root.textContent === 'Hodnota: 4', 'Text neodpovídá stavu.');
  counter.destroy();
  assert(counter.count.subscriberCount === 0, 'Komponenta neuvolnila reaktivní odběr.');
});

test('Deklarativní strom vytvoří vnořený DOM bez ručního append', () => {
  class Counter extends ViewComponent {
    constructor() {
      super();
      this.count = this.signal(0);
    }

    template() {
      return {
        tag: 'section', class: 'counter', ref: 'section',
        children: [{
          tag: 'button', type: 'button', ref: 'button',
          'class:is-positive': value(this.count, (count) => count > 0),
          'on:click': () => this.count.update((count) => count + 1),
          children: ['Počet: ', { tag: 'strong', text: value(this.count) }],
        }],
      };
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

test('Událost se po destrukci komponenty již neprovede', () => {
  let calls = 0;

  class Button extends Component {
    create() {
      const button = element('button', { type: 'button' }, ['Test']);
      this.listen(button, 'click', () => { calls += 1; });
      return button;
    }
  }

  const component = mount(new Button(), sandbox);
  const button = component.root;
  button.click();
  component.destroy();
  button.click();
  assert(calls === 1, `Listener se provedl ${calls}krát.`);
});

test('Keyed seznam zachová identitu existujících uzlů', () => {
  class Row extends Component {
    create() {
      const row = element('li');
      this.bind(row, 'text', this.props.item, (item) => item.label);
      row.dataset.key = String(this.props.item.value.id);
      return row;
    }
  }

  const scope = new Scope();
  const items = state([{ id: 1, label: 'A' }, { id: 2, label: 'B' }, { id: 3, label: 'C' }]);
  const target = element('ul');
  sandbox.append(target);
  list(scope, items, target, {
    key: (item) => item.id,
    render: (item) => new Row({ item }),
  });

  const originalTwo = target.querySelector('[data-key="2"]');
  const removedSignalCount = items.subscriberCount;
  items.value = [{ id: 3, label: 'C' }, { id: 2, label: 'B změněno' }, { id: 4, label: 'D' }];
  assert(target.querySelector('[data-key="2"]') === originalTwo, 'Uzel se stejným klíčem byl nahrazen.');
  assert(originalTwo.textContent === 'B změněno', 'Data zachovaného řádku se neaktualizovala.');
  assert([...target.querySelectorAll('li')].map((node) => node.dataset.key).join(',') === '3,2,4', 'Pořadí uzlů neodpovídá datům.');
  assert(items.subscriberCount === removedSignalCount, 'Aktualizace seznamu přidala odběr zdroje.');
  scope.destroy();
  assert(items.subscriberCount === 0, 'Seznam neuvolnil odběr zdroje.');
});

test('Podmíněný podstrom se vytvoří, nahradí a uklidí', () => {
  let destroyed = 0;

  class Branch extends Component {
    create() {
      return element('span', {}, [this.props.label]);
    }

    beforeDestroy() {
      destroyed += 1;
    }
  }

  const scope = new Scope();
  const visible = state(null);
  const target = element('div');
  sandbox.append(target);
  when(scope, visible, target, (label) => new Branch({ label }));
  visible.value = 'první';
  visible.value = 'druhý';
  visible.value = null;
  assert(destroyed === 2, `Očekávány 2 cleanupy, získáno ${destroyed}.`);
  assert(target.querySelector('span') === null, 'Nepravdivá větev zůstala v DOM.');
  scope.destroy();
  assert(visible.subscriberCount === 0, 'Podmínka neuvolnila odběr.');
});

test('Duplicitní klíč je oznámen jako chyba', () => {
  const scope = new Scope();
  const items = state([]);
  const target = element('ul');
  sandbox.append(target);
  list(scope, items, target, {
    key: (item) => item.id,
    render: (item) => element('li', {}, [String(item.value.id)]),
  });

  let failed = false;
  try {
    items.value = [{ id: 1 }, { id: 1 }];
  } catch {
    failed = true;
  }
  scope.destroy();
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
