import { Component, button, div, h2, p, section } from '../../src/index.js';
import { CartPanel } from './CartPanel.js';

export class OrderScreen extends Component {
	template() {
		const { cart, error, onBack, onClear, onContinue, onDecrease, onIncrease, onRemove, pending, summary } = this.props;

		return div(
			section(
				div(
					button('← Zpět k nabídce')
						.class('flow-back')
						.prop('type', 'button')
						.ref('back')
						.on('click', onBack),
					div(
						p('Krok 1 ze 3').class('eyebrow'),
						h2('Vaše objednávka').id('order-screen-title'),
					).class('flow-heading__copy'),
				).class('flow-heading'),
				new CartPanel({
					cart,
					error,
					pending,
					summary,
					onClear,
					onConfirm: onContinue,
					onDecrease,
					onIncrease,
					onRemove,
				}),
			).class('flow-screen', 'order-screen').aria('labelledby', 'order-screen-title'),
		).class('flow-overlay');
	}

	afterMount() {
		this.refs.back.focus();
		this.listen(document, 'keydown', (event) => {
			if (event.key === 'Escape') this.props.onBack();
		});
	}
}
