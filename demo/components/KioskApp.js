import { ViewComponent, div, main, show } from '../../src/index.js';
import { ApiError, catalogApi } from '../api.js';
import { addCartItem, changeCartItemQuantity, removeCartItem, summarizeCart } from '../state.js';
import { CartPanel } from './CartPanel.js';
import { Catalog } from './Catalog.js';
import { Confirmation } from './Confirmation.js';
import { DetailPanel } from './DetailPanel.js';
import { TopBar } from './TopBar.js';

export class KioskApp extends ViewComponent {
	constructor() {
		super();
		this.categories = this.signal([]);
		this.category = this.signal(null);
		this.visibleItems = this.signal([]);
		this.catalogStatus = this.signal('loading');
		this.catalogError = this.signal('');
		this.catalogEmpty = this.computed(
			[this.catalogStatus, this.visibleItems],
			(status, items) => status === 'ready' && items.length === 0,
		);
		this.selectedItem = this.signal(null);
		this.cart = this.signal([]);
		this.confirmation = this.signal(null);
		this.catalogRequest = null;
		this.catalogRequestId = 0;
	}

	afterMount() {
		this.loadInitialCatalog();
	}

	beforeDestroy() {
		this.catalogRequest?.abort();
	}

	startCatalogRequest() {
		this.catalogRequest?.abort();
		this.catalogRequest = new AbortController();
		this.catalogRequestId += 1;
		this.catalogStatus.value = 'loading';
		this.catalogError.value = '';

		return { controller: this.catalogRequest, requestId: this.catalogRequestId };
	}

	isCurrentCatalogRequest(requestId) {
		return this.mounted && requestId === this.catalogRequestId;
	}

	handleCatalogError(error, requestId) {
		if (error.name === 'AbortError' || !this.isCurrentCatalogRequest(requestId)) return;

		this.catalogError.value = error instanceof ApiError
			? 'Katalog se nepodařilo načíst ze serveru.'
			: 'Při načítání katalogu došlo k neočekávané chybě.';
		this.catalogStatus.value = 'error';
	}

	async loadInitialCatalog() {
		const { controller, requestId } = this.startCatalogRequest();

		try {
			const categories = await catalogApi.listCategories({ signal: controller.signal });
			if (!this.isCurrentCatalogRequest(requestId)) return;

			if (categories.length === 0) {
				throw new ApiError('The catalog has no categories.', 500);
			}

			this.categories.value = categories;
			this.category.value = categories[0].id;
			const items = await catalogApi.listMenuItems(categories[0].id, {
				signal: controller.signal,
			});
			if (!this.isCurrentCatalogRequest(requestId)) return;

			this.visibleItems.value = items;
			this.catalogStatus.value = 'ready';
		} catch (error) {
			this.handleCatalogError(error, requestId);
		}
	}

	async selectCategory(categoryId) {
		this.category.value = categoryId;
		const { controller, requestId } = this.startCatalogRequest();

		try {
			const items = await catalogApi.listMenuItems(categoryId, {
				signal: controller.signal,
			});
			if (!this.isCurrentCatalogRequest(requestId)) return;

			this.visibleItems.value = items;
			this.catalogStatus.value = 'ready';
		} catch (error) {
			this.handleCatalogError(error, requestId);
		}
	}

	retryCatalog() {
		if (this.categories.value.length === 0 || this.category.value === null) {
			this.loadInitialCatalog();
			return;
		}

		this.selectCategory(this.category.value);
	}

	addToCart(item) {
		this.cart.value = addCartItem(this.cart.value, item);
		this.selectedItem.value = null;
	}

	changeQuantity(itemId, delta) {
		this.cart.value = changeCartItemQuantity(this.cart.value, itemId, delta);
	}

	removeFromCart(itemId) {
		this.cart.value = removeCartItem(this.cart.value, itemId);
	}

	confirmOrder() {
		this.confirmation.value = summarizeCart(this.cart.value);
	}

	template() {
		return main(
			new TopBar({ cart: this.cart }),

			div(
				new Catalog({
					categories: this.categories,
					category: this.category,
					empty: this.catalogEmpty,
					error: this.catalogError,
					items: this.visibleItems,
					status: this.catalogStatus,
					onCategorySelect: (categoryId) => this.selectCategory(categoryId),
					onItemOpen: (item) => {
						this.selectedItem.value = item;
					},
					onRetry: () => this.retryCatalog(),
				}),
				new CartPanel({
					cart: this.cart,
					onIncrease: (itemId) => this.changeQuantity(itemId, 1),
					onDecrease: (itemId) => this.changeQuantity(itemId, -1),
					onRemove: (itemId) => this.removeFromCart(itemId),
					onConfirm: () => this.confirmOrder(),
				}),
			).class('layout'),

			show(
				this.selectedItem,
				(item) =>
					new DetailPanel({
						item,
						onAdd: (selected) => this.addToCart(selected),
						onClose: () => {
							this.selectedItem.value = null;
						},
					}),
			),

			show(
				this.confirmation,
				(summary) =>
					new Confirmation({
						summary,
						onReset: () => {
							this.cart.value = [];
							this.confirmation.value = null;
						},
					}),
			),
		).class('kiosk-shell');
	}
}
