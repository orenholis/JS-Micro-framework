import { Component, button, div, h2, section, span, strong } from '../../src/index.js';
import { menuItems } from '../data.js';
import { money } from '../format.js';

const steps = [
	{ key: 'burger', eyebrow: '1 ze 4', title: 'Vyberte burger', ids: [1, 2, 4] },
	{ key: 'side', eyebrow: '2 ze 4', title: 'Vyberte přílohu', ids: [9, 11] },
	{ key: 'drink', eyebrow: '3 ze 4', title: 'Vyberte nápoj', ids: [13, 14] },
	{ key: 'sauce', eyebrow: '4 ze 4', title: 'Vyberte omáčku', ids: [12] },
];

class BuilderChoice extends Component {
	template() {
		const { item, itemId, label, onSelect, selection, selectionKey } = this.props;

		return button(
			...(item ? [
				span()
					.class('builder-choice__image', 'product-image')
					.attr('data-menu-id', item.id)
					.aria('hidden', 'true'),
				span(strong(item.name), span(money(item.price))).class('builder-choice__copy'),
			] : [span(label).class('builder-choice__plain')]),
		)
			.class('builder-choice')
			.class('is-active', selection.map((current) => current[selectionKey] === itemId))
			.prop('type', 'button')
			.aria('label', item ? `Vybrat: ${item.name}` : label)
			.on('click', () => onSelect(selectionKey, itemId));
	}
}

export class MenuBuilder extends Component {
	constructor(props) {
		super(props);
		this.step = this.signal(0);
		this.selections = this.signal({ burger: null, side: null, drink: null, sauce: null });
		this.canContinue = this.computed(
			[this.step, this.selections],
			(currentStep, selected) => selected[steps[currentStep].key] !== null,
		);
	}

	select(key, id) {
		this.selections.value = { ...this.selections.value, [key]: id };
	}

	continue() {
		if (!this.canContinue.value) return;

		if (this.step.value < steps.length - 1) {
			this.step.value += 1;
			return;
		}

		const selectedItems = Object.values(this.selections.value)
			.filter((id) => id > 0)
			.map((id) => menuItems.find((item) => item.id === id));
		this.props.onComplete(selectedItems);
	}

	choice(item, key) {
		return new BuilderChoice({
			item,
			itemId: item.id,
			selection: this.selections,
			selectionKey: key,
			onSelect: (selectionKey, itemId) => this.select(selectionKey, itemId),
		});
	}

	template() {
		return div(
			section(
				div(
					button('×')
						.class('icon-button', 'builder-close')
						.prop('type', 'button')
						.aria('label', 'Zavřít sestavení menu')
						.ref('close')
						.on('click', this.props.onClose),
					div(
						span(this.step.map((current) => steps[current].eyebrow)).class('eyebrow'),
						h2(this.step.map((current) => steps[current].title)).id('builder-title'),
					).class('flow-heading__copy'),
					div(
						...steps.map((_, index) => span()
							.class('builder-progress__step')
							.class('is-active', this.step.map((current) => current >= index))),
					).class('builder-progress').aria('hidden', 'true'),
				).class('flow-heading', 'builder-heading'),
				...steps.map((step, index) => div(
					div(
						...step.ids.map((id) => this.choice(menuItems.find((item) => item.id === id), step.key)),
						...(step.key === 'sauce' ? [new BuilderChoice({
							item: null,
							itemId: -1,
							label: 'Bez omáčky',
							selection: this.selections,
							selectionKey: 'sauce',
							onSelect: (selectionKey, itemId) => this.select(selectionKey, itemId),
						})] : []),
					).class('builder-choices'),
				)
					.class('builder-step')
					.prop('hidden', this.step.map((current) => current !== index))),
				div(
					button('Zpět')
						.class('secondary-button')
						.prop('type', 'button')
						.prop('hidden', this.step.map((current) => current === 0))
						.on('click', () => this.step.value -= 1),
					button(this.step.map((current) => current === steps.length - 1 ? 'Přidat menu do objednávky' : 'Pokračovat'))
						.class('primary-button')
						.prop('type', 'button')
						.prop('disabled', this.canContinue.map((current) => !current))
						.on('click', () => this.continue()),
				).class('builder-actions'),
			).class('flow-screen', 'menu-builder').aria('labelledby', 'builder-title'),
		).class('flow-overlay');
	}

	afterMount() {
		this.refs.close.focus();
		this.listen(document, 'keydown', (event) => {
			if (event.key === 'Escape') this.props.onClose();
		});
	}
}
