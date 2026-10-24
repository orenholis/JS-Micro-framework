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
import { formatItemCount, money } from '../format.js';
import { CartRow } from './CartRow.js';

export class CartPanel extends ViewComponent {
	template() {
		const { cart, onClear, onConfirm, onDecrease, onIncrease, onRemove, summary } = this.props;

		return aside(
			div(
				div(
					p('Aktuální výběr').class('eyebrow'),
					h2('Objednávka').id('cart-title').attr('tabindex', '-1').ref('title'),
				),
				button('Vyprázdnit')
					.class('clear-cart-button')
					.prop('type', 'button')
					.prop('hidden', value(summary, (current) => current.count === 0))
					.aria('label', 'Vyprázdnit objednávku')
					.on('click', () => {
						onClear();
						this.refs.title.focus();
					}),
			).class('cart-panel__heading'),

			span(value(
				summary,
				(current) =>
					`V objednávce ${current.count === 1 ? 'je' : 'jsou'} ${formatItemCount(current.count)}. Celkem ${money(current.total)}.`,
			))
				.class('visually-hidden')
				.aria('live', 'polite')
				.aria('atomic', 'true'),

			p('Zatím jste nic nevybrali.')
				.class('empty-state')
				.prop(
					'hidden',
					value(summary, (current) => current.count > 0),
				),

			div(
				each(cart, {
					key: (row) => row.id,
					render: (row) => new CartRow({ row, onIncrease, onDecrease, onRemove }),
				}),
			).class('cart-rows'),

			div(
				span('Celkem'),
				strong(value(summary, (current) => money(current.total))).class(
					'total-value',
				),
			).class('total-row'),

			button('Potvrdit objednávku')
				.class('primary-button', 'primary-button--wide')
				.prop('type', 'button')
				.prop(
					'disabled',
					value(summary, (current) => current.count === 0),
				)
				.on('click', onConfirm),
		)
			.class('cart-panel')
			.aria('labelledby', 'cart-title');
	}
}
