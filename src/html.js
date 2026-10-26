const ELEMENT_BUILDER = Symbol('element-builder');
const EVENT_BINDING = Symbol('event-binding');

function addClass(target, names) {
	const current = target.properties.class;
	const next = names.filter(Boolean).join(' ');
	target.properties.class = current ? `${current} ${next}` : next;
}

/**
 * Fluent, one-use description of an element. It is converted directly to a
 * real DOM node by the template renderer; it is not retained as a virtual DOM.
 */
export class ElementBuilder {
	constructor(name, namespace = null) {
		this[ELEMENT_BUILDER] = true;
		this.name = name;
		this.namespace = namespace;
		this.properties = Object.create(null);
		this.content = [];
	}

	/**
	 * .class('a', 'b') přidá statické třídy; .class('a', podmínka) třídu
	 * přepíná. Chybějící druhý argument (undefined, null) se ignoruje.
	 */
	class(name, condition) {
		if (arguments.length === 2 && condition != null && typeof condition !== 'string') {
			this.properties[`class:${name}`] = condition;
		} else {
			addClass(this, [...arguments]);
		}
		return this;
	}

	id(value) {
		return this.attr('id', value);
	}

	attr(name, value = true) {
		this.properties[`attr:${name}`] = value;
		return this;
	}

	aria(name, value) {
		return this.attr(`aria-${name}`, value);
	}

	data(name, value) {
		return this.attr(`data-${name}`, value);
	}

	prop(name, value) {
		this.properties[`prop:${name}`] = value;
		return this;
	}

	style(name, value) {
		this.properties[`style:${name}`] = value;
		return this;
	}

	on(type, handler, options) {
		this.properties[`on:${type}`] = options
			? { [EVENT_BINDING]: true, handler, options }
			: handler;
		return this;
	}

	use(extension, ...arguments_) {
		if (typeof extension !== 'function') {
			throw new TypeError('Invalid builder extension');
		}

		extension(this, ...arguments_);
		return this;
	}

	ref(reference) {
		this.properties.ref = reference;
		return this;
	}

	text(value) {
		this.content = [value];
		return this;
	}

	child(child) {
		this.content.push(child);
		return this;
	}

	children(...children) {
		this.content.push(...children);
		return this;
	}
}

export function isElementBuilder(candidate) {
	return candidate?.[ELEMENT_BUILDER] === true;
}

export function readEventBinding(candidate) {
	return candidate?.[EVENT_BINDING] ? candidate : null;
}

export function tag(name, ...children) {
	return new ElementBuilder(name).children(...children);
}

const createTag =
	(name) =>
		(...children) =>
			tag(name, ...children);

// Order of names must match the order of tags in the string below.
export const [
	a,
	article,
	aside,
	button,
	div,
	footer,
	form,
	h1,
	h2,
	h3,
	header,
	img,
	input,
	label,
	li,
	main,
	nav,
	ol,
	option,
	output,
	p,
	section,
	select,
	small,
	span,
	strong,
	table,
	tbody,
	td,
	textarea,
	th,
	thead,
	tr,
	ul,
] = 'a article aside button div footer form h1 h2 h3 header img input label li main nav ol option output p section select small span strong table tbody td textarea th thead tr ul'.split(' ').map(createTag);
