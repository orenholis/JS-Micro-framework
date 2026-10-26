import { Component, button, div, footer, h1, header, main, p, section, span, strong } from '../../src/index.js';
import { formatItemCount, money } from '../format.js';
import { icon } from '../ui.js';

const methods = [
	{ id: 'card', icon: 'card', title: 'Kartou nebo telefonem', note: 'Platební terminál je přímo pod obrazovkou' },
	{ id: 'cash', icon: 'cash', title: 'Hotově u pokladny', note: 'Zaplatíte při vyzvednutí, objednávka mezitím počká' },
];

export class PaymentScreen extends Component {
	template() {
		const { error, onBack, onConfirm, onPayment, orderType, payment, pending, summary } = this.props;
		const label = this.computed([orderType, summary], (type, current) =>
			`K zaplacení · ${type === 'eat-in' ? 'na místě' : 's sebou'} · ${formatItemCount(current.count)}`);
		const submitLabel = this.computed([payment, pending, summary], (method, isPending, current) => {
			if (isPending) return 'Odesíláme objednávku…';
			return method === 'card' ? `Zaplatit ${money(current.total)}` : 'Potvrdit objednávku';
		});

		return div(
			header(
				button(icon('back'), span('Zpět k objednávce'))
					.class('back-button')
					.prop('type', 'button')
					.prop('disabled', pending)
					.on('click', onBack),
			).class('screen-top'),

			main(
				div(
					span(label).class('payment__label'),
					strong(summary.map((current) => money(current.total))).class('payment__total'),
				).class('payment__amount'),
				h1('Jak zaplatíte?').id('payment-title').attr('tabindex', '-1').ref('title'),
				div(
					...methods.map((method) => button(
						span(icon(method.icon)).class('payment-method__tile'),
						span(
							span(method.title).class('payment-method__title'),
							span(method.note).class('payment-method__note'),
						).class('payment-method__copy'),
						span(span().class('payment-method__dot')).class('payment-method__radio'),
					)
						.class('payment-method')
						.class('is-active', payment.map((current) => current === method.id))
						.prop('type', 'button')
						.attr('role', 'radio')
						.attr('aria-checked', payment.map((current) => String(current === method.id)))
						.prop('disabled', pending)
						.on('click', () => onPayment(method.id))),
				)
					.class('payment-methods')
					.attr('role', 'radiogroup')
					.aria('label', 'Způsob platby'),
				section(
					icon('down', 'payment-hint__icon'),
					div(
						strong(payment.map((current) => current === 'card'
							? 'Po potvrzení přiložte kartu k terminálu'
							: 'Po potvrzení dostanete číslo objednávky')),
						span(payment.map((current) => current === 'card'
							? 'Terminál se rozsvítí, jakmile bude připraven'
							: 'S ním zaplatíte u pokladny a vyzvednete jídlo')),
					).class('payment-hint__copy'),
				).class('payment-hint').aria('label', 'Postup platby'),
				p(error).class('form-error').attr('role', 'alert').prop('hidden', error.map((message) => message.length === 0)),
			).class('payment-main'),

			footer(
				button(submitLabel)
					.class('primary-button', 'payment__submit')
					.prop('type', 'button')
					.prop('disabled', pending)
					.on('click', onConfirm),
			).class('payment-footer'),
		)
			.class('screen', 'payment-screen')
			.aria('labelledby', 'payment-title');
	}

	afterMount() {
		this.refs.title.focus();
		this.listen(document, 'keydown', (event) => {
			if (event.key === 'Escape' && !this.props.pending.value) this.props.onBack();
		});
	}
}
