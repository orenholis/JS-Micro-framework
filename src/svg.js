export function svgElement(name, attributes = {}, children = []) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);

  for (const [key, value] of Object.entries(attributes)) {
    if (value != null) {
      node.setAttribute(key, String(value));
    }
  }

  node.append(...children);
  return node;
}
