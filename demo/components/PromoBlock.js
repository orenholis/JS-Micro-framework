import { Component, button, div, h2, p, section, span, strong, tag } from '../../src/index.js';
import { menuItems } from '../data.js';
import { money } from '../format.js';
import { defaultMenu, priceMenu } from '../menu-deal.js';
import { productImage } from '../ui.js';

const offer = priceMenu(defaultMenu, (id) => menuItems.find((item) => item.id === id));

export class PromoBlock extends Component {
	template() {
		return section(
			div(
				span(`Ušetříte ${money(offer.saving)}`).class('promo__badge'),
				h2(offer.name).class('promo__title'),
				p('Burger, příloha, nápoj a omáčka').class('promo__copy'),
				div(
					strong(money(offer.price)).class('promo__price'),
					tag('s', money(offer.separatePrice)).class('promo__was'),
					button('Sestavit menu')
						.class('promo__button')
						.prop('type', 'button')
						.on('click', () => this.props.onBuild(defaultMenu.burger)),
				).class('promo__row'),
			).class('promo__content'),
			productImage(defaultMenu.burger, 'promo__image'),
		)
			.class('promo')
			.aria('label', 'Zvýhodněné menu');
	}
}
