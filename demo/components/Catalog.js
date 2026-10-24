import { ViewComponent, button, div, each, h1, nav, p, section, value } from '../../src/index.js';
import { MenuItem } from './MenuItem.js';

export class Catalog extends ViewComponent {
	template() {
		const { categories, category, items, onCategorySelect, onItemOpen } = this.props;

		return section(
			div(
				div(
					p('Objednávkový kiosk').class('eyebrow'),
					h1('Vyberte si z nabídky').id('menu-title'),
				),
				p('Ukázka cílených DOM aktualizací bez virtuálního stromu.').class(
					'section-heading__copy',
				),
			).class('section-heading'),

			nav(
				categories.map((item) =>
					button(item.name)
						.class('category-button')
						.class(
							'is-active',
							value(category, (current) => current === item.id),
						)
						.prop('type', 'button')
						.attr(
							'aria-current',
							value(category, (current) => (current === item.id ? 'true' : null)),
						)
						.on('click', () => onCategorySelect(item.id)),
				),
			)
				.class('categories')
				.aria('label', 'Kategorie menu'),

			div(
				each(items, {
					key: (item) => item.id,
					render: (item) => new MenuItem({ item, onOpen: onItemOpen }),
				}),
			).class('menu-grid'),
		)
			.class('catalog')
			.aria('labelledby', 'menu-title');
	}
}
