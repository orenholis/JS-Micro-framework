import { Component, button, div, h2, p, section, span, strong } from '../../src/index.js';
import { formatItemCount, money } from '../format.js';

export class CheckoutScreen extends Component {
	constructor(props) {
		super(props);
		this.step = this.signal(0);
	}

	template() {
		const { onBack, onConfirm, onOrderType, onPayment, orderType, payment, pending, summary } = this.props;

		return div(
			section(
				div(
					button('← Zpět')
						.class('flow-back')
						.prop('type', 'button')
						.ref('back')
						.on('click', () => this.step.value === 0 ? onBack() : this.step.value = 0),
					div(
						p('Krok 3 ze 3').class('eyebrow'),
						h2(this.step.map((current) => current === 0 ? 'Kde si objednávku dáte?' : 'Jak chcete zaplatit?')).id('checkout-title'),
					).class('flow-heading__copy'),
				).class('flow-heading'),
				div(
					button(span('🍽').aria('hidden', 'true'), strong('Na místě'), span('Servírování na tác'))
						.class('checkout-choice')
						.class('is-active', orderType.map((current) => current === 'eat-in'))
						.prop('type', 'button')
						.on('click', () => onOrderType('eat-in')),
					button(span('🛍').aria('hidden', 'true'), strong('S sebou'), span('Zabalíme k odnesení'))
						.class('checkout-choice')
						.class('is-active', orderType.map((current) => current === 'takeaway'))
						.prop('type', 'button')
						.on('click', () => onOrderType('takeaway')),
				)
					.class('checkout-choices')
					.prop('hidden', this.step.map((current) => current !== 0)),
				div(
					button(span('▰').aria('hidden', 'true'), strong('Platební karta'), span('Karta nebo telefon'))
						.class('checkout-choice')
						.class('is-active', payment.map((current) => current === 'card'))
						.prop('type', 'button')
						.on('click', () => onPayment('card')),
					button(span('●').aria('hidden', 'true'), strong('Hotově'), span('Platba na pokladně'))
						.class('checkout-choice')
						.class('is-active', payment.map((current) => current === 'cash'))
						.prop('type', 'button')
						.on('click', () => onPayment('cash')),
				)
					.class('checkout-choices')
					.prop('hidden', this.step.map((current) => current !== 1)),
				div(
					div(
						span(summary.map((current) => formatItemCount(current.count))),
						strong(summary.map((current) => money(current.total))),
					).class('checkout-total'),
					button(this.step.map((current) => current === 0 ? 'Pokračovat k platbě' : 'Dokončit objednávku'))
						.class('primary-button', 'flow-primary')
						.prop('type', 'button')
						.prop('disabled', pending)
						.on('click', () => this.step.value === 0 ? this.step.value = 1 : onConfirm()),
				).class('checkout-footer'),
			).class('flow-screen', 'checkout-screen').aria('labelledby', 'checkout-title'),
		).class('flow-overlay');
	}

	afterMount() {
		this.refs.back.focus();
		this.listen(document, 'keydown', (event) => {
			if (event.key === 'Escape') this.step.value === 0 ? this.props.onBack() : this.step.value = 0;
		});
	}
}
