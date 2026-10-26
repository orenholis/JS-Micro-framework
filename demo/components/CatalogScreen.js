import { Component, button, div, each, h1, main, nav, p, show, span } from '../../src/index.js';
import { formatItemCount } from '../format.js';
import { productImage } from '../ui.js';
import { KioskHeader } from './KioskHeader.js';
import { OrderBar } from './OrderBar.js';
import { ProductCard } from './ProductCard.js';
import { PromoBlock } from './PromoBlock.js';

// Kategorii v postranním panelu zastupuje fotografie typického produktu.
const categoryImage = { popular: 1, burgers: 3, chicken: 5, sides: 9, drinks: 13, desserts: 16 };

export class CatalogScreen extends Component {
	template() {
		const { categories, category, empty, error, header, items, onBuildMenu, onCategorySelect, onItemOpen, onOpenOrder, onRetry, orderType, status, summary } = this.props;
		const title = this.computed(
			[categories, category],
			(list, current) => list.find((item) => item.id === current)?.name ?? 'Nabídka',
		);
		const promoVisible = this.computed(
			[category, status],
			(current, state) => state === 'ready' && (current === 'popular' || current === 'burgers'),
		);

		return div(
			new KioskHeader({ ...header, orderType }),
			div(
				nav(
					each(categories, {
						key: (item) => item.id,
						render: (item) => button(
							productImage(categoryImage[item.value.id] ?? 1, 'category-tile__image'),
							span(item.map((current) => current.name)).class('category-tile__label'),
						)
							.class('category-tile')
							.class('is-active', category.map((current) => current === item.value.id))
							.prop('type', 'button')
							.attr('aria-current', category.map((current) => current === item.value.id ? 'true' : null))
							.on('click', () => onCategorySelect(item.value.id)),
					}),
				)
					.class('category-rail')
					.aria('label', 'Kategorie'),
				main(
					div(
						h1(title).id('menu-title').attr('tabindex', '-1').ref('title'),
						span(items.map((list) => formatItemCount(list.length)))
							.class('catalog-heading__count')
							.prop('hidden', status.map((current) => current !== 'ready')),
					).class('catalog-heading'),

					show(promoVisible, () => new PromoBlock({ onBuild: onBuildMenu })),

					p('Načítám nabídku…')
						.class('catalog-status')
						.attr('role', 'status')
						.prop('hidden', status.map((current) => current !== 'loading')),
					div(
						p(error),
						button('Zkusit znovu').class('secondary-button').prop('type', 'button').on('click', onRetry),
					)
						.class('catalog-status', 'catalog-status--error')
						.attr('role', 'alert')
						.prop('hidden', status.map((current) => current !== 'error')),
					p('V této kategorii zatím nejsou žádné položky.')
						.class('catalog-status')
						.prop('hidden', empty.map((current) => !current)),

					div(
						each(items, {
							key: (item) => item.id,
							render: (item) => new ProductCard({ item, onOpen: onItemOpen }),
						}),
					)
						.class('menu-grid')
						.prop('hidden', status.map((current) => current !== 'ready')),
				).class('catalog-main'),
			).class('catalog-body'),
			new OrderBar({ onOpen: onOpenOrder, orderType, summary }),
		).class('screen', 'catalog-screen');
	}

	afterMount() {
		if (this.props.focusTitle) this.refs.title.focus();
	}
}
