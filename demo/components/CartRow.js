import {
	ViewComponent,
	article,
	button,
	div,
	output,
	span,
	strong,
} from '../../src/index.js';
import { money } from '../format.js';

export class CartRow extends ViewComponent {
	template() {
		const { row, pending, onIncrease, onDecrease, onRemove } = this.props;

		return article(
			span()
				.class('cart-row__image', 'product-image')
				.attr('data-menu-id', row.map((current) => current.id))
				.aria('hidden', 'true'),
			div(
				div(
					strong(row.map((current) => current.name)),
					span(row.map((current) => `${current.quantity} × ${money(current.price)}`))
						.class('cart-row__unit-price'),
				),
				span(row.map((current) => money(current.price * current.quantity))).class('muted'),
			).class('cart-row__copy'),
			div(
				button('−')
					.class('quantity-button')
					.prop('type', 'button')
					.prop('disabled', pending)
					.aria('label', row.map((current) => `Snížit množství: ${current.name}`))
					.on('click', () => onDecrease(row.value.id)),
				output(row.map((current) => current.quantity))
					.class('quantity')
					.aria('label', row.map((current) => `Množství: ${current.quantity}`)),
				button('+')
					.class('quantity-button')
					.prop('type', 'button')
					.prop('disabled', pending)
					.aria('label', row.map((current) => `Zvýšit množství: ${current.name}`))
					.on('click', () => onIncrease(row.value.id)),
				button('Odebrat')
					.class('remove-button')
					.prop('type', 'button')
					.prop('disabled', pending)
					.aria('label', row.map((current) => `Odebrat z objednávky: ${current.name}`))
					.on('click', () => onRemove(row.value.id)),
			).class('cart-row__controls'),
		).class('cart-row');
	}
}
