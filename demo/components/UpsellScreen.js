import { Component, button, div, h2, p, section, span, strong } from '../../src/index.js';
import { menuItems } from '../data.js';
import { money } from '../format.js';

const suggestions = menuItems.filter((item) => [10, 15, 16].includes(item.id));

export class UpsellScreen extends Component {
	template() {
		const { onAdd, onBack, onContinue } = this.props;

		return div(
			section(
				div(
					button('← Zpět')
						.class('flow-back')
						.prop('type', 'button')
						.ref('back')
						.on('click', onBack),
					div(
						p('Krok 2 ze 3').class('eyebrow'),
						h2('Ještě něco navíc?').id('upsell-title'),
						p('Oblíbené doplňky můžete přidat jedním klepnutím.'),
					).class('flow-heading__copy'),
				).class('flow-heading'),
				div(
					...suggestions.map((item) => button(
						span()
							.class('upsell-item__image', 'product-image')
							.attr('data-menu-id', item.id)
							.aria('hidden', 'true'),
						span(
							strong(item.name),
							span(money(item.price)),
						).class('upsell-item__copy'),
						span('+ Přidat').class('upsell-item__action'),
					)
						.class('upsell-item')
						.prop('type', 'button')
						.aria('label', `Přidat: ${item.name}`)
						.on('click', () => onAdd(item))),
				).class('upsell-list'),
				button('Pokračovat k dokončení')
					.class('primary-button', 'flow-primary')
					.prop('type', 'button')
					.on('click', onContinue),
			).class('flow-screen', 'upsell-screen').aria('labelledby', 'upsell-title'),
		).class('flow-overlay');
	}

	afterMount() {
		this.refs.back.focus();
		this.listen(document, 'keydown', (event) => {
			if (event.key === 'Escape') this.props.onBack();
		});
	}
}
