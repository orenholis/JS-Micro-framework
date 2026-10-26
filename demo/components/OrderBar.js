import { Component, button, div, span, strong } from '../../src/index.js';
import { formatItemCount, money } from '../format.js';

export class OrderBar extends Component {
	template() {
		const { onOpen, orderType, summary } = this.props;
		const label = this.computed(
			[orderType, summary],
			(type, current) => `${type === 'eat-in' ? 'Na místě' : 'S sebou'} · ${formatItemCount(current.count)}`,
		);

		return div(
			div(
				span(label).class('order-bar__label'),
				strong(summary.map((current) => money(current.total))).class('order-bar__total'),
			).class('order-bar__summary'),
			button('Zobrazit objednávku')
				.class('primary-button', 'order-bar__button')
				.prop('type', 'button')
				.prop('disabled', summary.map((current) => current.count === 0))
				.on('click', onOpen),
		).class('order-bar');
	}
}
