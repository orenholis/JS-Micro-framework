import { isSignal, VALUE } from './state.js';

const WRITERS = {
	attr(node, name, value) {
		if (value == null || value === false) {
			node.removeAttribute(name);
		} else {
			node.setAttribute(name, value === true ? '' : String(value));
		}
	},
	prop(node, name, value) {
		node[name] = value;
	},
	class(node, name, value) {
		node.classList.toggle(name, Boolean(value));
	},
	style(node, name, value) {
		node.style[name] = value == null ? '' : String(value);
	},
};

/**
 * Calls write with the current value of a static value, a signal or a
 * signal.map() binding and, for the reactive ones, after every change.
 */
function track(candidate, write, scope) {
	if (candidate?.[VALUE]) {
		const { source, map } = candidate;
		scope.own(source.subscribe((value) => write(map(value))));
	} else if (isSignal(candidate)) {
		scope.own(candidate.subscribe(write));
	} else {
		write(candidate);
	}
}

export function text(candidate, scope) {
	const node = document.createTextNode('');
	track(candidate, (value) => {
		node.nodeValue = value == null ? '' : String(value);
	}, scope);
	return node;
}

export function bind(node, kind, name, candidate, scope) {
	const write = WRITERS[kind];
	if (!write) {
		throw new TypeError(`Invalid binding: ${kind}`);
	}

	track(candidate, (value) => write(node, name, value), scope);
}
