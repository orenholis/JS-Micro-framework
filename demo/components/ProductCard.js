import { Component, button, span, strong } from '../../src/index.js';
import { money } from '../format.js';
import { icon, productImage } from '../ui.js';

export class ProductCard extends Component {
	template() {
		const { item, onOpen } = this.props;

		return button(
			productImage(item.map((current) => current.id), 'menu-card__image'),
			span(
				strong(item.map((current) => current.name)).class('menu-card__name'),
				span(
					span(item.map((current) => money(current.price))).class('menu-card__price'),
					span(icon('plus')).class('menu-card__add'),
				).class('menu-card__row'),
			).class('menu-card__body'),
		)
			.class('menu-card')
			.prop('type', 'button')
			.aria('label', item.map((current) => `${current.name}, ${money(current.price)}`))
			.on('click', () => onOpen(item.value));
	}
}
