import { ViewComponent, button, div, h2, p, section } from '../../src/index.js';
import { trapTabKey } from '../focus.js';
import { formatItemCount, money } from '../format.js';

export class Confirmation extends ViewComponent {
	template() {
		const { order, onReset } = this.props;

		return div(
			section(
				div('✓').class('confirmation__icon').aria('hidden', 'true'),
				h2('Děkujeme!').id('confirmation-title'),
				p('Vaši objednávku právě připravujeme.'),
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
				.aria('modal', 'true')
				.aria('labelledby', 'confirmation-title'),
		).class('overlay', 'overlay--confirmation');
	}

	afterMount() {
		this.refs.reset.focus();
		this.listen(document, 'keydown', (event) => {
			trapTabKey(event, [this.refs.reset]);
		});
	}
}
