import { ViewComponent, button, div, span, strong, value } from '../../src/index.js';
import { formatItemCount, money } from '../format.js';

export class OrderDock extends ViewComponent {
	template() {
		const { onOpen, summary } = this.props;

		return div(
			div(
				span(value(summary, (current) => formatItemCount(current.count))),
				strong(value(summary, (current) => money(current.total))),
			).class('order-dock__summary'),
			button('Zobrazit objednávku')
				.class('order-dock__button')
				.prop('type', 'button')
				.prop('disabled', value(summary, (current) => current.count === 0))
				.on('click', onOpen),
		)
			.class('order-dock')
			.class('has-items', value(summary, (current) => current.count > 0));
	}
}
