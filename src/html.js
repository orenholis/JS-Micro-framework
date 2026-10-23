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

  class(name, condition) {
    if (arguments.length === 2 && typeof condition !== 'string') {
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

const createTag = (name) => (...children) => tag(name, ...children);

export const a = createTag('a');
export const article = createTag('article');
export const aside = createTag('aside');
export const button = createTag('button');
export const div = createTag('div');
export const footer = createTag('footer');
export const form = createTag('form');
export const h1 = createTag('h1');
export const h2 = createTag('h2');
export const h3 = createTag('h3');
export const header = createTag('header');
export const img = createTag('img');
export const input = createTag('input');
export const label = createTag('label');
export const li = createTag('li');
export const main = createTag('main');
export const nav = createTag('nav');
export const ol = createTag('ol');
export const option = createTag('option');
export const output = createTag('output');
export const p = createTag('p');
export const section = createTag('section');
export const select = createTag('select');
export const small = createTag('small');
export const span = createTag('span');
export const strong = createTag('strong');
export const table = createTag('table');
export const tbody = createTag('tbody');
export const td = createTag('td');
export const textarea = createTag('textarea');
export const th = createTag('th');
export const thead = createTag('thead');
export const tr = createTag('tr');
export const ul = createTag('ul');
