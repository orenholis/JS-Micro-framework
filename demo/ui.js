import { button, div, output, span } from '../src/index.js';
import { circle, path, rect, svg } from '../src/svg.js';

const ICONS = {
	tray: [path().attr('d', 'M8 40h48M14 40a18 18 0 0 1 36 0M32 22v-4M6 48h52')],
	bag: [path().attr('d', 'M14 22h36l-3 34H17zM24 22v-6a8 8 0 0 1 16 0v6')],
	plus: [path().attr('d', 'M32 14v36M14 32h36')],
	minus: [path().attr('d', 'M14 32h36')],
	close: [path().attr('d', 'M18 18l28 28M46 18L18 46')],
	forward: [path().attr('d', 'M26 14l18 18-18 18')],
	back: [path().attr('d', 'M38 14L20 32l18 18')],
	check: [path().attr('d', 'M14 33l11 11 25-26')],
	card: [rect().attr('x', 6).attr('y', 14).attr('width', 52).attr('height', 36).attr('rx', 6), path().attr('d', 'M6 24h52M14 40h12')],
	cash: [rect().attr('x', 6).attr('y', 16).attr('width', 52).attr('height', 32).attr('rx', 6), circle().attr('cx', 32).attr('cy', 32).attr('r', 7)],
	down: [path().attr('d', 'M32 8v40M18 34l14 14 14-14M12 58h40')],
};

/** Liniová ikona z volitelného SVG modulu frameworku. */
export function icon(name, className) {
	return svg(...ICONS[name])
		.class('icon', className)
		.attr('viewBox', '0 0 64 64')
		.attr('fill', 'none')
		.attr('stroke', 'currentColor')
		.attr('stroke-width', 3)
		.attr('stroke-linecap', 'round')
		.attr('stroke-linejoin', 'round')
		.aria('hidden', 'true');
}

/**
 * Fotografie produktu z lokálního atlasu. Snímky v atlasu jsou čtvercové,
 * proto se vykreslí jako čtverec a rámeček libovolného tvaru je ořízne.
 */
export function productImage(itemId, className) {
	return span(span().class('product-image__photo').attr('data-menu-id', itemId))
		.class('product-image', className)
		.aria('hidden', 'true');
}

/**
 * Krokovač množství. Hodnota i popisky mohou být statické nebo signály.
 */
export function stepper({ value, label, decreaseLabel, increaseLabel, onDecrease, onIncrease, disabled = false }) {
	return div(
		button(icon('minus'))
			.class('stepper__button')
			.prop('type', 'button')
			.prop('disabled', disabled)
			.aria('label', decreaseLabel)
			.on('click', onDecrease),
		output(value).class('stepper__value').aria('live', 'polite'),
		button(icon('plus'))
			.class('stepper__button')
			.prop('type', 'button')
			.prop('disabled', disabled)
			.aria('label', increaseLabel)
			.on('click', onIncrease),
	)
		.class('stepper')
		.attr('role', 'group')
		.aria('label', label);
}
