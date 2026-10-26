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
} from '../../src/index.js';
import { formatItemCount, money } from '../format.js';
import { CartRow } from './CartRow.js';

export class CartPanel extends ViewComponent {
	template() {
		const { cart, error, onClear, onConfirm, onDecrease, onIncrease, onRemove, pending, summary } = this.props;

		return aside(
			div(
				div(
					p(summary.map((current) => formatItemCount(current.count))).class('eyebrow'),
					h2('Přehled položek').id('cart-title').attr('tabindex', '-1').ref('title'),
				),
				button('Vyprázdnit')
					.class('clear-cart-button')
					.prop('type', 'button')
					.prop('hidden', summary.map((current) => current.count === 0))
					.prop('disabled', pending)
					.aria('label', 'Vyprázdnit objednávku')
					.on('click', () => {
						onClear();
						this.refs.title.focus();
					}),
			).class('cart-panel__heading'),

			span(summary.map((current) => {
				const verb = current.count === 1 ? 'je' : 'jsou';
				return `V objednávce ${verb} ${formatItemCount(current.count)}. Celkem ${money(current.total)}.`;
			}))
				.class('visually-hidden')
				.aria('live', 'polite')
				.aria('atomic', 'true'),

			p('Vybrané položky se zobrazí tady.')
				.class('empty-state')
				.prop(
					'hidden',
					summary.map((current) => current.count > 0),
				),

			div(
				each(cart, {
					key: (row) => row.id,
					render: (row) => new CartRow({ row, pending, onIncrease, onDecrease, onRemove }),
				}),
			).class('cart-rows'),

			div(
				span('Celkem'),
				strong(summary.map((current) => money(current.total))).class(
					'total-value',
				),
			).class('total-row'),

			p(error)
				.class('order-error')
				.prop('hidden', error.map((message) => message.length === 0))
				.attr('role', 'alert'),

			button(pending.map((isPending) => (isPending ? 'Čekejte prosím…' : 'Pokračovat')))
				.class('primary-button', 'primary-button--wide')
				.prop('type', 'button')
				.prop(
					'disabled',
					this.computed([summary, pending], (current, isPending) => current.count === 0 || isPending),
				)
				.on('click', onConfirm),
		)
			.class('cart-panel')
			.aria('labelledby', 'cart-title');
	}
}
