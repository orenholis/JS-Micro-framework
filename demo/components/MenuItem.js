import { Component, button, span, strong } from '../../src/index.js';
import { money } from '../format.js';

export class MenuItem extends Component {
	template() {
		const { item, onOpen } = this.props;

		return button(
			span()
				.class('menu-card__image', 'product-image')
				.attr('data-menu-id', item.map((current) => current.id))
				.aria('hidden', 'true'),
			span(
				strong(item.map((current) => current.name)).class('menu-card__name'),
				span(item.map((current) => money(current.price))).class('menu-card__price'),
			).class('menu-card__copy'),
		)
			.class('menu-card')
			.prop('type', 'button')
			.on('click', () => onOpen(item.value));
	}
}
