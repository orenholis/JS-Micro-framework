import { Component, button, div, each, footer, h1, h2, header, main, p, section, span, strong, tag } from '../../src/index.js';

const dl = (...children) => tag('dl', ...children);
const dt = (...children) => tag('dt', ...children);
const dd = (...children) => tag('dd', ...children);
import { menuItems } from '../data.js';
import { formatItemCount, money } from '../format.js';
import { icon, productImage } from '../ui.js';
import { CartLine } from './CartLine.js';

const suggestions = [15, 16, 10].map((id) => menuItems.find((item) => item.id === id));

export class OrderScreen extends Component {
	template() {
		const { cart, error, onAdd, onBack, onContinue, onDecrease, onEditMenu, onIncrease, orderType, pending, summary } = this.props;

		return div(
			header(
				button(icon('back'), span('Přidat další'))
					.class('back-button')
					.prop('type', 'button')
					.on('click', onBack),
				span(orderType.map((type) => type === 'eat-in' ? 'Na místě' : 'S sebou')).class('screen-top__meta'),
			).class('screen-top'),

			main(
				h1('Vaše objednávka').id('order-title').attr('tabindex', '-1').ref('title'),
				p('Objednávka je prázdná. Vraťte se do nabídky a něco si vyberte.')
					.class('empty-state')
					.prop('hidden', summary.map((current) => current.count > 0)),
				div(
					each(cart, {
						key: (row) => row.key,
						render: (row) => new CartLine({ row, pending, onDecrease, onEditMenu, onIncrease }),
					}),
				).class('order-lines'),
				section(
					h2('Nechcete k tomu ještě něco?').id('upsell-title'),
					div(
						...suggestions.map((item) => button(
							productImage(item.id, 'upsell-card__image'),
							span(item.name).class('upsell-card__name'),
							span(span(money(item.price)), span(icon('plus')).class('menu-card__add')).class('upsell-card__row'),
						)
							.class('upsell-card')
							.prop('type', 'button')
							.prop('disabled', pending)
							.aria('label', `Přidat: ${item.name}`)
							.on('click', () => onAdd(item))),
					).class('upsell-grid'),
				)
					.class('upsell')
					.aria('labelledby', 'upsell-title'),
			).class('order-main'),

			footer(
				dl(
					div(dt('Mezisoučet'), dd(summary.map((current) => money(current.subtotal)))).class('totals__row'),
					div(dt('Sleva za menu'), dd(summary.map((current) => `−${money(current.saving)}`)))
						.class('totals__row')
						.prop('hidden', summary.map((current) => current.saving === 0)),
				).class('totals'),
				p(error).class('form-error').attr('role', 'alert').prop('hidden', error.map((message) => message.length === 0)),
				div(
					div(
						span(summary.map((current) => `Celkem · ${formatItemCount(current.count)}`)).class('order-footer__label'),
						strong(summary.map((current) => money(current.total))).class('order-footer__total'),
					),
					button('Pokračovat k platbě')
						.class('primary-button')
						.prop('type', 'button')
						.prop('disabled', summary.map((current) => current.count === 0))
						.on('click', onContinue),
				).class('order-footer__row'),
			).class('order-footer'),
		)
			.class('screen', 'order-screen')
			.aria('labelledby', 'order-title');
	}

	afterMount() {
		this.refs.title.focus();
		this.listen(document, 'keydown', (event) => {
			if (event.key === 'Escape') this.props.onBack();
		});
	}
}
