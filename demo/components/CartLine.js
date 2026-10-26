import { Component, article, button, div, h2, li, span, strong, tag, ul } from '../../src/index.js';
import { money } from '../format.js';
import { productImage, stepper } from '../ui.js';

/** Řádek objednávky. Typ řádku (produkt / menu) se pro daný klíč nemění. */
export class CartLine extends Component {
	template() {
		const { onDecrease, onEditMenu, onIncrease, pending, row } = this.props;
		const isMenu = row.value.type === 'menu';
		const name = row.value.name;

		const details = isMenu
			? [
				span(row.map((current) => `Menu · ušetříte ${money(current.separatePrice - current.price)}`)).class('saving-badge'),
				h2(name).class('cart-line__name'),
				ul(...row.value.components.map((item) => li(item.name))).class('cart-line__parts'),
			]
			: [
				h2(name).class('cart-line__name'),
				span(row.map((current) => `${money(current.price)} / ks`)).class('cart-line__unit'),
			];

		return article(
			productImage(row.value.id, 'cart-line__image'),
			div(...details).class('cart-line__copy'),
			div(
				strong(row.map((current) => money(current.price * current.quantity))).class('cart-line__total'),
				isMenu
					? tag('s', row.map((current) => money(current.separatePrice * current.quantity))).class('cart-line__was')
					: null,
			).class('cart-line__prices'),
			div(
				isMenu
					? button('Upravit menu')
						.class('secondary-button', 'cart-line__edit')
						.prop('type', 'button')
						.prop('disabled', pending)
						.on('click', () => onEditMenu(row.value))
					: null,
				stepper({
					value: row.map((current) => current.quantity),
					label: `Množství: ${name}`,
					decreaseLabel: row.map((current) => current.quantity === 1 ? `Odebrat z objednávky: ${name}` : `Snížit množství: ${name}`),
					increaseLabel: `Zvýšit množství: ${name}`,
					disabled: pending,
					onDecrease: () => onDecrease(row.value.key),
					onIncrease: () => onIncrease(row.value.key),
				}),
			).class('cart-line__actions'),
		)
			.class('cart-line')
			.class('is-menu', isMenu)
			.aria('label', name);
	}
}
