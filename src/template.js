import { Component } from './core.js';
import { list, when } from './collections.js';
import { bind, text } from './dom.js';
import { isElementBuilder, readEventBinding } from './html.js';
import { isSignal, VALUE } from './state.js';

const EACH = Symbol('each');
const SHOW = Symbol('show');

const identity = (value) => value;

export function value(source, map = identity) {
	return isSignal(source) ? source.map(map) : map(source);
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

export function match(source, cases) {
	return show(source, (current) => cases[current]?.(current));
}

/**
 * Dynamic content is always mounted as a component, so it owns its bindings.
 * A plain builder gets a lightweight component that shares the owner's refs.
 */
function asComponent(owner, description) {
	if (description == null || description === false) return null;
	if (description instanceof Component) return description;

	const component = new Component();
	component.refs = owner.refs;
	component.template = () => description;
	return component;
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

function applyProperty(owner, node, key, candidate) {
	if (key === 'ref') {
		applyReference(owner, candidate, node);
		return;
	}

	if (key === 'class') {
		node.classList.add(...candidate.split(' ').filter(Boolean));
		return;
	}

	const separator = key.indexOf(':');
	const kind = key.slice(0, separator);
	const name = key.slice(separator + 1);

	if (kind === 'on') {
		const event = readEventBinding(candidate);
		owner.listen(node, name, event?.handler ?? candidate, event?.options);
	} else {
		bind(node, kind, name, candidate, owner.scope);
	}
}

function appendContent(owner, parent, content) {
	if (content == null || content === false) {
		return;
	}

	if (Array.isArray(content)) {
		for (const child of content) {
			appendContent(owner, parent, child);
		}
	} else if (content[EACH]) {
		list(owner, content.source, parent, {
			key: content.key,
			render: (item, itemKey) => {
				const component = asComponent(owner, content.render(item, itemKey));
				if (!component) throw new TypeError('each: render must return a view');
				return component;
			},
		});
	} else if (content[SHOW]) {
		when(owner, content.source, parent, (current) =>
			asComponent(owner, content.render(current)),
		);
	} else if (content instanceof Component) {
		owner.child(content, parent);
	} else {
		parent.append(view(owner, content));
	}
}

/**
 * Turns a template value into a real DOM node. Builders are walked once;
 * only reactive values leave bindings behind.
 */
export function view(owner, content) {
	if (content instanceof Node) {
		return content;
	}

	const type = typeof content;
	if (content?.[VALUE] || isSignal(content) || type === 'string' || type === 'number' || type === 'bigint') {
		return text(content, owner.scope);
	}

	if (!isElementBuilder(content)) {
		throw new TypeError('Invalid template content');
	}

	const node = content.namespace
		? document.createElementNS(content.namespace, content.name)
		: document.createElement(content.name);

	for (const [key, candidate] of Object.entries(content.properties)) {
		applyProperty(owner, node, key, candidate);
	}

	appendContent(owner, node, content.content);
	return node;
}
