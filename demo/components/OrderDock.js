import { Component, button, div, span, strong } from '../../src/index.js';
import { formatItemCount, money } from '../format.js';

export class OrderDock extends Component {
	template() {
		const { onOpen, summary } = this.props;

		return div(
			div(
				span(summary.map((current) => formatItemCount(current.count))),
				strong(summary.map((current) => money(current.total))),
			).class('order-dock__summary'),
			button('Zobrazit objednávku')
				.class('order-dock__button')
				.prop('type', 'button')
				.prop('disabled', summary.map((current) => current.count === 0))
				.on('click', onOpen),
		)
			.class('order-dock')
			.class('has-items', summary.map((current) => current.count > 0));
	}
}
