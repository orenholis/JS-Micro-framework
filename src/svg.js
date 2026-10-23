import { ElementBuilder } from './html.js';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function svgTag(name) {
  return (...children) => (
    new ElementBuilder(name, SVG_NAMESPACE).children(...children)
  );
}

export const svg = svgTag('svg');
export const circle = svgTag('circle');
export const ellipse = svgTag('ellipse');
export const g = svgTag('g');
export const line = svgTag('line');
export const path = svgTag('path');
export const polygon = svgTag('polygon');
export const polyline = svgTag('polyline');
export const rect = svgTag('rect');
export const svgText = svgTag('text');
export const use = svgTag('use');
