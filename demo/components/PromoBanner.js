import { ViewComponent, button, div, p, section, span, strong } from '../../src/index.js';

function formatCountdown(seconds) {
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export class PromoBanner extends ViewComponent {
	constructor(props) {
		super(props);
		this.remaining = this.signal(9 * 60 + 59);
	}

	afterMount() {
		const timer = setInterval(() => {
			this.remaining.value = this.remaining.value > 0 ? this.remaining.value - 1 : 9 * 60 + 59;
		}, 1000);
		this.own(() => clearInterval(timer));
	}

	template() {
		return section(
			div(
				span('Výhodné menu').class('promo-banner__label'),
				strong('Poskládejte si celé menu').class('promo-banner__title'),
				p('Burger, příloha, nápoj a omáčka v několika rychlých krocích.'),
				div(
					span('Nabídka končí za'),
					strong(this.remaining.map(formatCountdown)).class('countdown'),
				).class('promo-banner__timer'),
				button('Sestavit menu')
					.class('promo-banner__button')
					.prop('type', 'button')
					.on('click', this.props.onBuild),
			).class('promo-banner__content'),
			span()
				.class('promo-banner__image', 'product-image')
				.attr('data-menu-id', '1')
				.aria('hidden', 'true'),
		).class('promo-banner');
	}
}
