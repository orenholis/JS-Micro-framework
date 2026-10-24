import {
	ViewComponent,
	aside,
	button,
	div,
	each,
	h2,
	p,
	span,
	strong,
	value,
} from '../../src/index.js';
import { money } from '../format.js';
import { summarizeCart } from '../state.js';
import { CartRow } from './CartRow.js';

export class CartPanel extends ViewComponent {
	template() {
		const { cart, onConfirm, onDecrease, onIncrease, onRemove } = this.props;

		return aside(
			div(div(p('Aktuální výběr').class('eyebrow'), h2('Objednávka').id('cart-title'))).class(
				'cart-panel__heading',
			),

			p('Zatím jste nic nevybrali.')
				.class('empty-state')
				.prop(
					'hidden',
					value(cart, (rows) => rows.length > 0),
				),

			div(
				each(cart, {
					key: (row) => row.id,
					render: (row) => new CartRow({ row, onIncrease, onDecrease, onRemove }),
				}),
			).class('cart-rows'),

			div(
				span('Celkem'),
				strong(value(cart, (rows) => money(summarizeCart(rows).total))).class(
					'total-value',
				),
			).class('total-row'),

			button('Potvrdit objednávku')
				.class('primary-button', 'primary-button--wide')
				.prop('type', 'button')
				.prop(
					'disabled',
					value(cart, (rows) => rows.length === 0),
				)
				.on('click', onConfirm),
		)
			.class('cart-panel')
			.aria('labelledby', 'cart-title');
	}
}
