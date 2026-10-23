import { isSignal } from './state.js';

function append(parent, child) {
  if (child == null || child === false) {
    return;
  }

  if (Array.isArray(child)) {
    for (const nested of child) {
      append(parent, nested);
    }
    return;
  }

  const node = child instanceof Node
    ? child
    : document.createTextNode(String(child));

  parent.append(node);
}

export function element(name, options = {}, children = []) {
  const node = document.createElement(name);

  for (const [key, value] of Object.entries(options)) {
    if (value == null || value === false) {
      continue;
    }

    if (key === 'class') {
      node.className = value;
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else if (key in node && !key.startsWith('aria-')) {
      node[key] = value;
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }

  append(node, children);
  return node;
}

export function text(source, { map = String, scope } = {}) {
  if (!isSignal(source)) {
    return document.createTextNode(map(source));
  }

  const node = document.createTextNode('');
  const unsubscribe = source.subscribe((value) => {
    node.nodeValue = map(value);
  });
  scope?.own(unsubscribe);
  return node;
}

function createBindingWriter(node, target) {
  const separator = target.indexOf(':');
  const kind = separator === -1 ? target : target.slice(0, separator);
  const name = separator === -1 ? '' : target.slice(separator + 1);

  switch (kind) {
    case 'text':
      return (value) => {
        node.textContent = value == null ? '' : String(value);
      };

    case 'property':
      return (value) => {
        node[name] = value;
      };

    case 'attribute':
      return (value) => {
        if (value == null || value === false) {
          node.removeAttribute(name);
        } else {
          node.setAttribute(name, value === true ? '' : String(value));
        }
      };

    case 'class':
      return (value) => {
        node.classList.toggle(name, Boolean(value));
      };

    case 'style':
      return (value) => {
        node.style[name] = value == null ? '' : String(value);
      };

    default:
      throw new TypeError(`Invalid binding: ${target}`);
  }
}

export function bind(
  node,
  target,
  source,
  { map = (value) => value, scope } = {},
) {
  const write = createBindingWriter(node, target);
  const apply = (value) => {
    write(map(value));
  };

  if (!isSignal(source)) {
    apply(source);
    return () => {};
  }

  const unsubscribe = source.subscribe(apply);
  scope?.own(unsubscribe);
  return unsubscribe;
}
