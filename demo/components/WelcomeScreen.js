import { Component, button, div, footer, h1, header, main, p, section, span, tag } from '../../src/index.js';
import { icon, productImage } from '../ui.js';

function choice(iconName, title, note, onSelect) {
	return button(
		icon(iconName, 'choice-card__icon'),
		span(
			span(title).class('choice-card__title'),
			span(note).class('choice-card__note'),
		).class('choice-card__copy'),
	)
		.class('choice-card')
		.prop('type', 'button')
		.on('click', onSelect);
}

export class WelcomeScreen extends Component {
	template() {
		const { onStart } = this.props;

		return main(
			header(span('BITE').class('brand')).class('welcome__top'),
			section(
				productImage(1, 'welcome__image'),
				h1('Objednejte', tag('br'), 'si tady.').class('welcome__title').id('welcome-title'),
				p('Kde si dnes dáte jídlo?').class('welcome__lead'),
			).class('welcome__hero'),
			div(
				choice('tray', 'Na místě', 'Přineseme na podnosu', () => onStart('eat-in')),
				choice('bag', 'S sebou', 'Zabalíme do tašky', () => onStart('takeaway')),
			)
				.class('welcome__choices')
				.attr('role', 'group')
				.aria('label', 'Způsob konzumace'),
			footer(span('Platba kartou, telefonem i hotově')).class('welcome__footer'),
		)
			.class('screen', 'welcome')
			.aria('labelledby', 'welcome-title');
	}
}
