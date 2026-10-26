import { Component, button, div, h2, p, section, span, strong } from '../../src/index.js';
import { focusableButtons, trapTabKey } from '../focus.js';
import { money } from '../format.js';
import { isMenuBurger, MENU_SURCHARGE } from '../menu-deal.js';
import { icon, productImage, stepper } from '../ui.js';

export class ProductSheet extends Component {
	constructor(props) {
		super(props);
		this.quantity = this.signal(1);
	}

	template() {
		const { error, item, onAdd, onClose, onMakeMenu, onRetry, status } = this.props;
		const total = this.computed([item, this.quantity], (current, quantity) => money((current?.price ?? 0) * quantity));
		const menuVisible = item.map((current) => !current || !isMenuBurger(current.id));

		return div(
			section(
				span().class('sheet__grabber').aria('hidden', 'true'),
				div(
					productImage(item.map((current) => current?.id ?? null), 'sheet__image'),
					div(
						h2(item.map((current) => current?.name ?? 'Detail produktu')).id('detail-title'),
						p(item.map((current) => current?.description ?? '')).class('sheet__description'),
						strong(item.map((current) => current ? money(current.price) : '')).class('sheet__price'),
					).class('sheet__copy'),
					button(icon('close'))
						.class('icon-button')
						.prop('type', 'button')
						.aria('label', 'Zavřít detail')
						.ref('close')
						.on('click', onClose),
				).class('sheet__head'),

				p('Načítám detail…')
					.class('sheet__status')
					.attr('role', 'status')
					.prop('hidden', status.map((current) => current !== 'loading')),
				div(
					p(error),
					button('Zkusit znovu').class('secondary-button').prop('type', 'button').ref('retry').on('click', onRetry),
				)
					.class('sheet__status', 'sheet__status--error')
					.attr('role', 'alert')
					.prop('hidden', status.map((current) => current !== 'error')),

				button(
					span(productImage(9, 'upsell-thumb'), productImage(13, 'upsell-thumb')).class('sheet__upsell-images'),
					span(
						span('Udělejte z toho menu').class('sheet__upsell-title'),
						span(`+ příloha, nápoj a omáčka za ${money(MENU_SURCHARGE)}`).class('sheet__upsell-note'),
					).class('sheet__upsell-copy'),
					span('Sestavit').class('sheet__upsell-action'),
				)
					.class('sheet__upsell')
					.prop('type', 'button')
					.prop('hidden', menuVisible)
					.ref('menu')
					.on('click', () => onMakeMenu(item.value.id)),

				div(
					stepper({
						value: this.quantity,
						label: 'Množství',
						decreaseLabel: 'Ubrat kus',
						increaseLabel: 'Přidat kus',
						onDecrease: () => this.quantity.update((current) => Math.max(1, current - 1)),
						onIncrease: () => this.quantity.update((current) => Math.min(9, current + 1)),
					}),
					button(span('Přidat do objednávky'), span(total))
						.class('primary-button', 'sheet__add')
						.prop('type', 'button')
						.aria('label', 'Přidat do objednávky')
						.ref('add')
						.on('click', () => onAdd(item.value, this.quantity.value)),
				)
					.class('sheet__footer')
					.prop('hidden', status.map((current) => current !== 'ready')),
			)
				.class('sheet')
				.attr('role', 'dialog')
				.attr('aria-busy', status.map((current) => current === 'loading' ? 'true' : null))
				.aria('modal', 'true')
				.aria('labelledby', 'detail-title'),
		)
			.class('sheet-backdrop')
			.on('click', (event) => {
				if (event.target === event.currentTarget) onClose();
			});
	}

	afterMount() {
		this.refs.close.focus();
		this.own(this.props.status.subscribe((status) => {
			if (status === 'ready' && document.activeElement === this.refs.retry) this.refs.close.focus();
		}, { immediate: false }));
		this.listen(document, 'keydown', (event) => {
			if (event.key === 'Escape') {
				this.props.onClose();
				return;
			}

			trapTabKey(event, focusableButtons(this.root));
		});
	}
}
