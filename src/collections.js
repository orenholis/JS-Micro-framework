import { detach } from './core.js';
import { signal } from './state.js';

// Both helpers mount components between two comment markers, so content can be
// inserted again at the right place without searching among siblings.
function markers(owner, target, cleanup) {
	const start = document.createComment('');
	const end = document.createComment('');
	target.append(start, end);

	owner.own(() => {
		cleanup();
		detach(start);
		detach(end);
	});

	return end;
}

export function when(owner, source, target, factory) {
	let current = null;
	let unsubscribe = null;
	const end = markers(owner, target, () => {
		unsubscribe();
		current?.destroy();
	});

	unsubscribe = source.subscribe((value) => {
		current?.destroy();
		current = value ? factory(value) : null;
		current?.mount(target, end);
	});
}

export function list(owner, source, target, { key, render }) {
	let records = new Map();
	let unsubscribe = null;
	const end = markers(owner, target, () => {
		unsubscribe();
		for (const record of records.values()) {
			record.component.destroy();
		}
		records.clear();
	});

	unsubscribe = source.subscribe((items) => {
		const next = new Map();

		for (const item of items) {
			const itemKey = key(item);
			if (next.has(itemKey)) {
				throw new Error(`Duplicate list key: ${String(itemKey)}`);
			}

			let record = records.get(itemKey);
			if (record) {
				record.item.value = item;
			} else {
				const value = signal(item);
				record = { item: value, component: render(value, itemKey).mount(target, end) };
			}

			next.set(itemKey, record);
		}

		for (const [itemKey, record] of records) {
			if (!next.has(itemKey)) {
				record.component.destroy();
			}
		}

		let cursor = end;
		for (const { component } of [...next.values()].reverse()) {
			if (component.root.nextSibling !== cursor) target.insertBefore(component.root, cursor);
			cursor = component.root;
		}

		records = next;
	});
}
