import { ViewComponent, button, div, h2, p, section, strong } from '../../src/index.js';
import { money } from '../format.js';

export class DetailPanel extends ViewComponent {
	template() {
		const { item, onAdd, onClose } = this.props;

		return div(
			section(
				button('×')
					.class('icon-button')
					.prop('type', 'button')
					.aria('label', 'Zavřít detail')
					.ref('close')
					.on('click', onClose),
				div(item.emoji).class('detail-panel__emoji').aria('hidden', 'true'),
				h2(item.name).id('detail-title'),
				p(item.description),
				div(
					strong(money(item.price)),
					button('Přidat do objednávky')
						.class('primary-button')
						.prop('type', 'button')
						.on('click', () => onAdd(item)),
				).class('detail-panel__footer'),
			)
				.class('detail-panel')
				.attr('role', 'dialog')
				.aria('modal', 'true')
				.aria('labelledby', 'detail-title'),
		)
			.class('overlay')
			.attr('role', 'presentation')
			.on('click', (event) => {
				if (event.target === event.currentTarget) onClose();
			});
	}

	afterMount() {
		this.refs.close.focus();
	}
}
