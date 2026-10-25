import { ViewComponent, button, div, each, h1, nav, p, section, span, value } from '../../src/index.js';
import { MenuItem } from './MenuItem.js';
import { PromoBanner } from './PromoBanner.js';

export class Catalog extends ViewComponent {
	template() {
		const { categories, category, empty, error, items, onBuildMenu, onCategorySelect, onItemOpen, onRetry, status, titleRef } = this.props;

		return section(
			div(
				div(
					p('Čerstvě připraveno').class('eyebrow'),
					h1('Co si dnes dáte?')
						.id('menu-title')
						.attr('tabindex', '-1')
						.ref(titleRef),
				),
				p('Vyberte kategorii a klepněte na produkt.').class(
					'section-heading__copy',
				),
			).class('section-heading'),

			new PromoBanner({ onBuild: onBuildMenu }),

			nav(
				each(categories, {
					key: (item) => item.id,
					render: (item) => button(value(item, (current) => current.name))
						.class('category-button')
						.class(
							'is-active',
							value(category, (current) => current === item.value.id),
						)
						.prop('type', 'button')
						.attr(
							'aria-current',
							value(category, (current) =>
								current === item.value.id ? 'true' : null,
							),
						)
						.on('click', () => onCategorySelect(item.value.id)),
				}),
			)
				.class('categories')
				.aria('label', 'Kategorie menu')
				.prop('hidden', value(categories, (current) => current.length === 0)),

			div(span('Načítám nabídku…').class('catalog-status__message'))
				.class('catalog-status')
				.attr('role', 'status')
				.aria('live', 'polite')
				.prop('hidden', value(status, (current) => current !== 'loading')),

			div(
				p(value(error)).class('catalog-status__message'),
				button('Zkusit znovu')
					.class('secondary-button')
					.prop('type', 'button')
					.on('click', onRetry),
			)
				.class('catalog-status', 'catalog-status--error')
				.attr('role', 'alert')
				.prop('hidden', value(status, (current) => current !== 'error')),

			p('V této kategorii zatím nejsou žádné položky.')
				.class('catalog-status', 'catalog-status__message')
				.prop('hidden', value(empty, (current) => !current)),

			div(
				each(items, {
					key: (item) => item.id,
					render: (item) => new MenuItem({ item, onOpen: onItemOpen }),
				}),
			)
				.class('menu-grid')
				.prop('hidden', value(status, (current) => current !== 'ready')),
		)
			.class('catalog')
			.aria('labelledby', 'menu-title');
	}
}
