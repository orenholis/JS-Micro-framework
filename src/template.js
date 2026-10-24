import { Component } from './core.js';
import { list, when } from './collections.js';
import { isElementBuilder, readEventBinding } from './html.js';
import { isSignal } from './state.js';

const VALUE = Symbol('value');
const EACH = Symbol('each');
const SHOW = Symbol('show');

const BINDING_PREFIXES = { attr: 'attribute', class: 'class', style: 'style' };

const RESERVED_KEYS = new Set(['tag', 'namespace', 'children', 'skip']);

const identity = (value) => value;

export function value(source, map = identity) {
	if (!isSignal(source)) {
		throw new TypeError('value: Signal required');
	}

	return { [VALUE]: true, source, map };
}

export function each(source, { key, render }) {
	if (!isSignal(source)) {
		throw new TypeError('each: Signal required');
	}

	if (typeof key !== 'function' || typeof render !== 'function') {
		throw new TypeError('each: key and render required');
	}

	return { [EACH]: true, source, key, render };
}

export function show(source, render) {
	if (!isSignal(source)) {
		throw new TypeError('show: Signal required');
	}

	if (typeof render !== 'function') {
		throw new TypeError('show: render required');
	}

	return { [SHOW]: true, source, render };
}

class InlineView extends Component {
	constructor(description) {
		super();
		this.description = description;
	}

	create() {
		return view(this, this.description);
	}
}

function asRenderable(description) {
	return description instanceof Component ? description : new InlineView(description);
}

function applyReference(owner, reference, node) {
	if (typeof reference === 'function') {
		reference(node);
		owner.own(() => reference(null));
		return;
	}

	if (typeof reference !== 'string' || reference.length === 0) {
		throw new TypeError('Invalid ref');
	}

	owner.refs[reference] = node;
	owner.own(() => {
		if (owner.refs[reference] === node) {
			delete owner.refs[reference];
		}
	});
}

function bindValue(owner, node, target, candidate) {
	if (candidate?.[VALUE]) {
		owner.bind(node, target, candidate.source, candidate.map);
		return;
	}

	owner.bind(node, target, candidate);
}

function applyProperty(owner, node, key, candidate) {
	const separator = key.indexOf(':');

	if (separator !== -1) {
		const prefix = key.slice(0, separator);
		const name = key.slice(separator + 1);

		if (prefix === 'on') {
			const event = readEventBinding(candidate);
			owner.listen(node, name, event?.handler ?? candidate, event?.options);
			return;
		}

		const target = BINDING_PREFIXES[prefix];
		if (target) {
			bindValue(owner, node, `${target}:${name}`, candidate);
			return;
		}

		if (prefix === 'prop') {
			bindValue(owner, node, `property:${name}`, candidate);
			return;
		}
	}

	if (key === 'text') {
		bindValue(owner, node, 'text', candidate);
		return;
	}

	if (key === 'class') {
		bindValue(owner, node, 'property:className', candidate);
		return;
	}

	const target =
		key.startsWith('aria-') || !(key in node) ? `attribute:${key}` : `property:${key}`;
	bindValue(owner, node, target, candidate);
}

function appendDescription(owner, parent, description) {
	if (description == null || description === false) {
		return;
	}

	if (Array.isArray(description)) {
		for (const child of description) {
			appendDescription(owner, parent, child);
		}
		return;
	}

	if (description?.skip) {
		return;
	}

	if (description?.[EACH]) {
		list(owner, description.source, parent, {
			key: description.key,
			render: (item, itemKey) => asRenderable(description.render(item, itemKey)),
		});
		return;
	}

	if (description?.[SHOW]) {
		when(owner, description.source, parent, (current) =>
			asRenderable(description.render(current)),
		);
		return;
	}

	if (description instanceof Component) {
		owner.child(description, parent);
		return;
	}

	parent.append(view(owner, description));
}

export function view(owner, description) {
	if (!owner?.scope) {
		throw new TypeError('view: owner required');
	}

	if (description instanceof Node) {
		return description;
	}

	if (description?.[VALUE]) {
		return owner.text(description.source, description.map);
	}

	if (isSignal(description)) {
		return owner.text(description);
	}

	const isText =
		typeof description === 'string' ||
		typeof description === 'number' ||
		typeof description === 'bigint';

	if (isText) {
		return document.createTextNode(String(description));
	}

	if (!description || typeof description !== 'object' || Array.isArray(description)) {
		throw new TypeError('Invalid view root');
	}

	if (isElementBuilder(description)) {
		const node = description.namespace
			? document.createElementNS(description.namespace, description.name)
			: document.createElement(description.name);

		for (const [key, candidate] of Object.entries(description.properties)) {
			if (key === 'ref') {
				applyReference(owner, candidate, node);
			} else {
				applyProperty(owner, node, key, candidate);
			}
		}

		appendDescription(owner, node, description.content);
		return node;
	}

	const tag = description.tag || 'div';
	const namespace = description.namespace;
	const node = namespace ? document.createElementNS(namespace, tag) : document.createElement(tag);

	for (const [key, candidate] of Object.entries(description)) {
		if (RESERVED_KEYS.has(key)) {
			continue;
		}

		if (key === 'ref') {
			applyReference(owner, candidate, node);
		} else {
			applyProperty(owner, node, key, candidate);
		}
	}

	if (!description.skip && description.text === undefined) {
		appendDescription(owner, node, description.children);
	}

	return node;
}

export class ViewComponent extends Component {
	template() {
		throw new Error('template() required');
	}

	create() {
		return view(this, this.template());
	}
}
