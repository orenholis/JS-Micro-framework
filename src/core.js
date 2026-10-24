import { bind, text } from './dom.js';
import { computed, state } from './state.js';

export class Scope {
	#cleanups = [];
	#destroyed = false;

	constructor() {
		this.events = new AbortController();
	}

	own(cleanup) {
		if (typeof cleanup !== 'function') {
			throw new TypeError('Invalid cleanup');
		}

		if (this.#destroyed) {
			cleanup();
			return cleanup;
		}

		this.#cleanups.push(cleanup);
		return cleanup;
	}

	listen(node, type, handler, options = {}) {
		node.addEventListener(type, handler, { ...options, signal: this.events.signal });
		return handler;
	}

	destroy() {
		if (this.#destroyed) return;
		this.#destroyed = true;
		this.events.abort();

		for (let index = this.#cleanups.length - 1; index >= 0; index -= 1) {
			this.#cleanups[index]();
		}

		this.#cleanups.length = 0;
	}

	get destroyed() {
		return this.#destroyed;
	}
}

export class Component {
	#mounted = false;
	#children = new Set();

	constructor(props = {}) {
		this.props = Object.freeze({ ...props });
		this.scope = new Scope();
		this.refs = Object.create(null);
		this.root = null;
	}

	create() {
		throw new Error('create() required');
	}

	mount(target, before = null) {
		if (this.#mounted) {
			throw new Error('Already mounted');
		}

		if (!(target instanceof Node)) {
			throw new TypeError('Invalid mount target');
		}

		const root = this.create();
		if (!(root instanceof Node) || root instanceof DocumentFragment) {
			throw new TypeError('Invalid component root');
		}

		this.root = root;
		target.insertBefore(root, before);
		this.#mounted = true;
		this.afterMount?.();
		return this;
	}

	destroy() {
		if (!this.#mounted) {
			return;
		}

		for (const child of [...this.#children].reverse()) {
			child.destroy();
		}
		this.#children.clear();
		this.beforeDestroy?.();
		this.scope.destroy();
		this.root?.remove();
		this.refs = Object.create(null);
		this.root = null;
		this.#mounted = false;
	}

	child(component, target, before = null) {
		component.mount(target, before);
		this.#children.add(component);
		this.scope.own(() => {
			component.destroy();
			this.#children.delete(component);
		});
		return component;
	}

	signal(initialValue) {
		return state(initialValue);
	}

	computed(sources, project) {
		return computed(sources, project, this.scope);
	}

	text(source, map = String) {
		return text(source, { map, scope: this.scope });
	}

	bind(node, target, source, map = (value) => value) {
		return bind(node, target, source, { map, scope: this.scope });
	}

	listen(node, type, handler, options) {
		return this.scope.listen(node, type, handler, options);
	}

	own(cleanup) {
		return this.scope.own(cleanup);
	}

	get mounted() {
		return this.#mounted;
	}
}

export function mount(component, target, before = null) {
	return component.mount(target, before);
}
