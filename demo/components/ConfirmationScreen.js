import { Component, button, div, h2, p, section, span, strong, tag } from '../../src/index.js';
import { focusableButtons, trapTabKey } from '../focus.js';
import { formatItemCount, money } from '../format.js';
import { icon } from '../ui.js';

const RESET_AFTER = 20;

export class ConfirmationScreen extends Component {
	constructor(props) {
		super(props);
		this.remaining = this.signal(RESET_AFTER);
	}

	template() {
		const { method, onReset, order } = this.props;

		return section(
			span('BITE').class('brand'),
			div(
				span(icon('check')).class('confirmation__check').aria('hidden', 'true'),
				h2(...(method === 'card' ? ['Zaplaceno.', tag('br'), 'Děkujeme!'] : ['Objednávka přijata.', tag('br'), 'Děkujeme!']))
					.id('confirmation-title'),
				div(
					span('Číslo vaší objednávky').class('order-number__label'),
					strong(String(order.id)).class('order-number__value').aria('label', `Číslo objednávky: ${order.id}`),
					p(`${formatItemCount(order.count)} za ${money(order.total)}. ${method === 'card'
						? 'Až se číslo objeví na obrazovce u výdeje, jídlo je připravené.'
						: 'Zaplaťte prosím u pokladny, pak počkejte na číslo u výdeje.'}`).class('order-number__copy'),
				).class('order-number'),
			).class('confirmation__body'),
			div(
				button('Nová objednávka')
					.class('light-button')
					.prop('type', 'button')
					.ref('reset')
					.on('click', onReset),
				div(div().class('countdown__fill').style('width', this.remaining.map((value) => `${(value / RESET_AFTER) * 100}%`)))
					.class('countdown')
					.attr('role', 'progressbar')
					.aria('label', 'Návrat na úvod')
					.attr('aria-valuemin', 0)
					.attr('aria-valuemax', RESET_AFTER)
					.attr('aria-valuenow', this.remaining),
				span(this.remaining.map((value) => `Kiosek se za ${value} s vrátí na úvod`)).class('countdown__text'),
			).class('confirmation__footer'),
		)
			.class('confirmation')
			.attr('role', 'dialog')
			.aria('modal', 'true')
			.aria('labelledby', 'confirmation-title');
	}

	afterMount() {
		this.refs.reset.focus();
		const timer = setInterval(() => {
			this.remaining.update((value) => value - 1);
			if (this.remaining.value <= 0) this.props.onReset();
		}, 1000);
		this.own(() => clearInterval(timer));
		this.listen(document, 'keydown', (event) => trapTabKey(event, focusableButtons(this.root)));
	}
}
