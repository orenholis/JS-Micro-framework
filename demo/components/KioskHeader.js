import { Component, button, div, header, span } from '../../src/index.js';
import { icon } from '../ui.js';

export class KioskHeader extends Component {
	template() {
		const { onCancel, onToggleType, orderType } = this.props;

		return header(
			span('BITE').class('brand'),
			div(
				button(
					icon('tray', 'chip__icon').class('is-hidden', orderType.map((type) => type !== 'eat-in')),
					icon('bag', 'chip__icon').class('is-hidden', orderType.map((type) => type !== 'takeaway')),
					span(orderType.map((type) => type === 'eat-in' ? 'Na místě' : 'S sebou')),
				)
					.class('chip')
					.prop('type', 'button')
					.aria('label', orderType.map((type) => `Způsob: ${type === 'eat-in' ? 'na místě' : 's sebou'}. Klepnutím změníte.`))
					.on('click', onToggleType),
				button('Zrušit objednávku')
					.class('text-button')
					.prop('type', 'button')
					.on('click', onCancel),
			).class('kiosk-header__actions'),
		).class('kiosk-header');
	}
}
