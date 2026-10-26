import { Component, button, div, footer, h2, header, li, main, match, ol, span, strong } from '../../src/index.js';
import { menuItems } from '../data.js';
import { focusableButtons, trapTabKey } from '../focus.js';
import { money } from '../format.js';
import { MENU_SURCHARGE, menuSlots, NO_SAUCE, priceMenu } from '../menu-deal.js';
import { icon, productImage } from '../ui.js';

const findItem = (id) => menuItems.find((item) => item.id === id);
const emptyPicks = () => Object.fromEntries(menuSlots.map((slot) => [slot.key, null]));

class BuilderChoice extends Component {
	template() {
		const { itemId, name, note, onPick, picks, slotKey } = this.props;

		return button(
			itemId === NO_SAUCE
				? span('Bez omáčky').class('builder-choice__none').aria('hidden', 'true')
				: productImage(itemId, 'builder-choice__image'),
			span(strong(name), span(note).class('builder-choice__note')).class('builder-choice__copy'),
			span(icon('check')).class('builder-choice__check').aria('hidden', 'true'),
		)
			.class('builder-choice')
			.class('is-active', picks.map((current) => current[slotKey] === itemId))
			.prop('type', 'button')
			.attr('aria-pressed', picks.map((current) => String(current[slotKey] === itemId)))
			.aria('label', `Vybrat: ${name}`)
			.on('click', () => onPick(slotKey, itemId));
	}
}

export class MenuBuilder extends Component {
	constructor(props) {
		super(props);
		const initial = { ...emptyPicks(), ...props.initial?.selection };
		const firstOpen = menuSlots.findIndex((slot) => initial[slot.key] === null);
		this.picks = this.signal(initial);
		this.step = this.signal(firstOpen === -1 ? 0 : firstOpen);
	}

	pick(key, id) {
		this.picks.value = { ...this.picks.value, [key]: id };
	}

	canOpen(index) {
		return menuSlots.slice(0, index).every((slot) => this.picks.value[slot.key] !== null);
	}

	next() {
		const slot = menuSlots[this.step.value];
		if (this.picks.value[slot.key] === null) return;

		if (this.step.value < menuSlots.length - 1) {
			this.step.value += 1;
			return;
		}

		this.props.onComplete({ ...this.picks.value }, this.props.initial);
	}

	choices(slot) {
		const options = slot.options.map((option) => {
			const item = findItem(option.id);
			return new BuilderChoice({
				itemId: item.id,
				name: item.name,
				note: option.extra ? `+${money(option.extra)}` : 'v ceně',
				picks: this.picks,
				slotKey: slot.key,
				onPick: (key, id) => this.pick(key, id),
			});
		});

		if (slot.optional) {
			options.push(new BuilderChoice({
				itemId: NO_SAUCE,
				name: 'Bez omáčky',
				note: 'menu bez omáčky',
				picks: this.picks,
				slotKey: slot.key,
				onPick: (key, id) => this.pick(key, id),
			}));
		}

		return div(...options).class('builder-choices');
	}

	template() {
		const slotKey = this.step.map((current) => menuSlots[current].key);
		const preview = this.computed(this.picks, (picks) => {
			const complete = priceMenu(picks, findItem);
			if (complete) return complete;

			const burger = picks.burger ? findItem(picks.burger) : null;
			const extras = menuSlots.reduce((sum, slot) =>
				sum + (slot.options.find((option) => option.id === picks[slot.key])?.extra ?? 0), 0);
			return {
				name: burger ? `Menu ${burger.name}` : 'Zvýhodněné menu',
				price: burger ? burger.price + MENU_SURCHARGE + extras : null,
				saving: 0,
			};
		});
		const blocked = this.computed([this.step, this.picks], (step, picks) => picks[menuSlots[step].key] === null);
		const cases = Object.fromEntries(menuSlots.map((slot) => [slot.key, () => this.choices(slot)]));

		return div(
			header(
				button(icon('close'))
					.class('icon-button')
					.prop('type', 'button')
					.aria('label', 'Zavřít sestavení menu')
					.ref('close')
					.on('click', this.props.onClose),
				span('Zvýhodněné menu').class('builder__kicker'),
			).class('builder__top'),

			ol(
				...menuSlots.map((slot, index) => li(
					button(
						span(slot.label).class('builder-step__label'),
						span(this.computed([this.picks, this.step], (picks, step) => {
							const id = picks[slot.key];
							if (id === NO_SAUCE) return 'Bez omáčky';
							if (id !== null) return findItem(id).name;
							return step === index ? 'Vybíráte' : '—';
						})).class('builder-step__value'),
					)
						.class('builder-step')
						.class('is-current', this.step.map((current) => current === index))
						.prop('type', 'button')
						.attr('aria-current', this.step.map((current) => current === index ? 'step' : null))
						.prop('disabled', this.picks.map(() => !this.canOpen(index)))
						.on('click', () => {
							if (this.canOpen(index)) this.step.value = index;
						}),
				)),
			)
				.class('builder-steps')
				.aria('label', 'Kroky menu'),

			main(
				span(this.step.map((current) => `Krok ${current + 1} ze ${menuSlots.length}`)).class('eyebrow'),
				h2(this.step.map((current) => menuSlots[current].title)).id('builder-title'),
				match(slotKey, cases),
			).class('builder__main'),

			footer(
				div(
					span(preview.map((current) => current.name)).class('builder__name'),
					div(
						strong(preview.map((current) => current.price === null ? '—' : money(current.price))).class('builder__price'),
						span(preview.map((current) => `ušetříte ${money(current.saving)}`))
							.class('saving-badge')
							.prop('hidden', preview.map((current) => current.saving <= 0)),
					).class('builder__price-row'),
				).class('builder__summary'),
				button('Zpět')
					.class('secondary-button')
					.prop('type', 'button')
					.prop('hidden', this.step.map((current) => current === 0))
					.on('click', () => this.step.update((current) => Math.max(0, current - 1))),
				button(this.step.map((current) => current === menuSlots.length - 1 ? 'Přidat menu do objednávky' : 'Pokračovat'))
					.class('primary-button')
					.prop('type', 'button')
					.prop('disabled', blocked)
					.on('click', () => this.next()),
			).class('builder__footer'),
		)
			.class('builder')
			.attr('role', 'dialog')
			.aria('modal', 'true')
			.aria('labelledby', 'builder-title');
	}

	afterMount() {
		this.refs.close.focus();
		this.listen(document, 'keydown', (event) => {
			if (event.key === 'Escape') {
				this.props.onClose();
				return;
			}

			trapTabKey(event, focusableButtons(this.root));
		});
	}
}
