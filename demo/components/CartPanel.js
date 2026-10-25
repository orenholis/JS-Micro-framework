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
		const { cart, error, onClear, onConfirm, onDecrease, onIncrease, onRemove, pending, summary } = this.props;

		return aside(
			div(
				div(
					p(value(summary, (current) => formatItemCount(current.count))).class('eyebrow'),
					h2('Přehled položek').id('cart-title').attr('tabindex', '-1').ref('title'),
				),
				button('Vyprázdnit')
					.class('clear-cart-button')
					.prop('type', 'button')
					.prop('hidden', value(summary, (current) => current.count === 0))
					.prop('disabled', value(pending))
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

			p('Vybrané položky se zobrazí tady.')
				.class('empty-state')
				.prop(
					'hidden',
					value(summary, (current) => current.count > 0),
				),

			div(
				each(cart, {
					key: (row) => row.id,
					render: (row) => new CartRow({ row, pending, onIncrease, onDecrease, onRemove }),
				}),
			).class('cart-rows'),

			div(
				span('Celkem'),
				strong(value(summary, (current) => money(current.total))).class(
					'total-value',
				),
			).class('total-row'),

			p(value(error))
				.class('order-error')
				.prop('hidden', value(error, (message) => message.length === 0))
				.attr('role', 'alert'),

			button(value(pending, (isPending) => (isPending ? 'Čekejte prosím…' : 'Pokračovat')))
				.class('primary-button', 'primary-button--wide')
				.prop('type', 'button')
				.prop(
					'disabled',
					value(this.computed([summary, pending], (current, isPending) => current.count === 0 || isPending)),
				)
				.on('click', onConfirm),
		)
			.class('cart-panel')
			.aria('labelledby', 'cart-title');
	}
}
