import { ViewComponent, button, div, h2, p, section } from '../../src/index.js';
import { formatItemCount, money } from '../format.js';

export class Confirmation extends ViewComponent {
	template() {
		const { order, onReset } = this.props;

		return div(
			section(
				div('✓').class('confirmation__icon').aria('hidden', 'true'),
				h2('Objednávka přijata'),
				p(`Číslo objednávky: ${order.id}`).class('confirmation__order-number'),
				p(`${formatItemCount(order.count)} v hodnotě ${money(order.total)}.`),
				button('Nová objednávka')
					.class('primary-button')
					.prop('type', 'button')
					.ref('reset')
					.on('click', onReset),
			)
				.class('confirmation')
				.attr('role', 'dialog')
				.aria('modal', 'true'),
		).class('overlay', 'overlay--confirmation');
	}

	afterMount() {
		this.refs.reset.focus();
	}
}
