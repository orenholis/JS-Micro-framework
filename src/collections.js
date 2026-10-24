import { Component } from './core.js';
import { state } from './state.js';

function mountRenderable(renderable, parent, before) {
	if (renderable instanceof Component) {
		renderable.mount(parent, before);
		return { nodes: [renderable.root], destroy: () => renderable.destroy() };
	}

	if (!(renderable instanceof Node)) {
		throw new TypeError('Invalid dynamic view');
	}

	const nodes =
		renderable instanceof DocumentFragment ? [...renderable.childNodes] : [renderable];

	parent.insertBefore(renderable, before);

	return {
		nodes,
		destroy: () => {
			for (const node of nodes) {
				node.remove();
			}
		},
	};
}

function moveBefore(record, parent, cursor) {
	for (const node of record.nodes) {
		parent.insertBefore(node, cursor);
	}
}

export function when(owner, source, target, factory) {
	const start = document.createComment('when:start');
	const end = document.createComment('when:end');
	target.append(start, end);
	let current = null;

	const unsubscribe = source.subscribe((value) => {
		current?.destroy();
		current = value ? mountRenderable(factory(value), target, end) : null;
	});

	owner.own(() => {
		unsubscribe();
		current?.destroy();
		start.remove();
		end.remove();
	});

	return { start, end };
}

export function list(owner, source, target, { key, render }) {
	const start = document.createComment('list:start');
	const end = document.createComment('list:end');
	target.append(start, end);
	let records = new Map();

	const unsubscribe = source.subscribe((items) => {
		const nextKeys = new Set();
		const ordered = [];

		for (const item of items) {
			const itemKey = key(item);
			if (nextKeys.has(itemKey)) {
				throw new Error(`Duplicate list key: ${String(itemKey)}`);
			}

			nextKeys.add(itemKey);

			let record = records.get(itemKey);
			if (record) {
				record.value.value = item;
			} else {
				const value = state(item);
				const mounted = mountRenderable(render(value, itemKey), target, end);
				record = { ...mounted, value };
			}

			ordered.push([itemKey, record]);
		}

		for (const [itemKey, record] of records) {
			if (!nextKeys.has(itemKey)) {
				record.destroy();
			}
		}

		let cursor = end;
		for (let index = ordered.length - 1; index >= 0; index -= 1) {
			const record = ordered[index][1];
			moveBefore(record, target, cursor);
			cursor = record.nodes[0];
		}

		records = new Map(ordered);
	});

	owner.own(() => {
		unsubscribe();
		for (const record of records.values()) {
			record.destroy();
		}

		records.clear();
		start.remove();
		end.remove();
	});

	return { start, end };
}
