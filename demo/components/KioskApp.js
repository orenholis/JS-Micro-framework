import { ViewComponent, div, main, show } from '../../src/index.js';
import { ApiError, catalogApi } from '../api.js';
import { addCartItem, changeCartItemQuantity, clearCart, removeCartItem, summarizeCart } from '../state.js';
import { Catalog } from './Catalog.js';
import { CheckoutScreen } from './CheckoutScreen.js';
import { Confirmation } from './Confirmation.js';
import { DetailPanel } from './DetailPanel.js';
import { MenuBuilder } from './MenuBuilder.js';
import { OrderDock } from './OrderDock.js';
import { OrderScreen } from './OrderScreen.js';
import { TopBar } from './TopBar.js';
import { UpsellScreen } from './UpsellScreen.js';

export class KioskApp extends ViewComponent {
	constructor({ api = catalogApi } = {}) {
		super();
		this.api = api;
		this.categories = this.signal([]);
		this.category = this.signal(null);
		this.visibleItems = this.signal([]);
		this.catalogStatus = this.signal('loading');
		this.catalogError = this.signal('');
		this.catalogEmpty = this.computed(
			[this.catalogStatus, this.visibleItems],
			(status, items) => status === 'ready' && items.length === 0,
		);
		this.detailItemId = this.signal(null);
		this.detailItem = this.signal(null);
		this.detailStatus = this.signal('idle');
		this.detailError = this.signal('');
		this.cart = this.signal([]);
		this.cartSummary = this.computed(this.cart, summarizeCart);
		this.screen = this.signal('catalog');
		this.builderOpen = this.signal(false);
		this.orderVisible = this.computed(this.screen, (screen) => screen === 'order');
		this.upsellVisible = this.computed(this.screen, (screen) => screen === 'upsell');
		this.checkoutVisible = this.computed(this.screen, (screen) => screen === 'checkout');
		this.orderType = this.signal('eat-in');
		this.payment = this.signal('card');
		this.orderStatus = this.signal('idle');
		this.orderError = this.signal('');
		this.orderPending = this.computed(this.orderStatus, (status) => status === 'submitting');
		this.confirmation = this.signal(null);
		this.catalogRequest = null;
		this.catalogRequestId = 0;
		this.detailRequest = null;
		this.detailRequestId = 0;
		this.detailTrigger = null;
		this.orderRequest = null;
		this.orderRequestId = 0;
		this.catalogTitle = null;
	}

	afterMount() {
		this.loadInitialCatalog();
	}

	beforeDestroy() {
		this.catalogRequest?.abort();
		this.detailRequest?.abort();
		this.orderRequest?.abort();
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
			const categories = await this.api.listCategories({ signal: controller.signal });
			if (!this.isCurrentCatalogRequest(requestId)) return;

			if (categories.length === 0) {
				throw new ApiError('The catalog has no categories.', 500);
			}

			this.categories.value = categories;
			this.category.value = categories[0].id;
			const items = await this.api.listMenuItems(categories[0].id, {
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
			const items = await this.api.listMenuItems(categoryId, {
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

	startDetailRequest() {
		this.detailRequest?.abort();
		this.detailRequest = new AbortController();
		this.detailRequestId += 1;
		this.detailItem.value = null;
		this.detailStatus.value = 'loading';
		this.detailError.value = '';

		return { controller: this.detailRequest, requestId: this.detailRequestId };
	}

	isCurrentDetailRequest(requestId, itemId) {
		return this.mounted
			&& requestId === this.detailRequestId
			&& itemId === this.detailItemId.value;
	}

	async loadDetail(itemId) {
		const { controller, requestId } = this.startDetailRequest();

		try {
			const item = await this.api.getMenuItem(itemId, { signal: controller.signal });
			if (!this.isCurrentDetailRequest(requestId, itemId)) return;

			this.detailItem.value = item;
			this.detailStatus.value = 'ready';
		} catch (error) {
			if (error.name === 'AbortError' || !this.isCurrentDetailRequest(requestId, itemId)) {
				return;
			}

			this.detailError.value = error instanceof ApiError
				? 'Detail produktu se nepodařilo načíst ze serveru.'
				: 'Při načítání detailu došlo k neočekávané chybě.';
			this.detailStatus.value = 'error';
		}
	}

	openDetail(item) {
		this.detailTrigger = document.activeElement;
		this.detailItemId.value = item.id;
		this.loadDetail(item.id);
	}

	closeDetail() {
		this.detailRequest?.abort();
		this.detailRequestId += 1;
		this.detailItemId.value = null;
		this.detailItem.value = null;
		this.detailStatus.value = 'idle';
		this.detailError.value = '';

		if (this.detailTrigger?.isConnected) this.detailTrigger.focus();
		this.detailTrigger = null;
	}

	retryDetail() {
		if (this.detailItemId.value !== null) this.loadDetail(this.detailItemId.value);
	}

	addToCart(item) {
		this.clearOrderError();
		this.cart.value = addCartItem(this.cart.value, item);
		this.closeDetail();
	}

	changeQuantity(itemId, delta) {
		this.clearOrderError();
		this.cart.value = changeCartItemQuantity(this.cart.value, itemId, delta);
	}

	removeFromCart(itemId) {
		this.clearOrderError();
		this.cart.value = removeCartItem(this.cart.value, itemId);
	}

	clearCart() {
		this.clearOrderError();
		this.cart.value = clearCart(this.cart.value);
	}

	clearOrderError() {
		if (this.orderStatus.value === 'error') this.orderStatus.value = 'idle';
		this.orderError.value = '';
	}

	addMenuToCart(items) {
		this.clearOrderError();
		this.cart.value = items.reduce((cart, item) => addCartItem(cart, item), this.cart.value);
		this.builderOpen.value = false;
	}

	showScreen(screen) {
		this.screen.value = screen;
	}

	async confirmOrder() {
		if (this.cart.value.length === 0 || this.orderPending.value) return;

		this.orderRequest?.abort();
		this.orderRequest = new AbortController();
		this.orderRequestId += 1;
		const requestId = this.orderRequestId;
		const submittedCart = this.cart.value;
		this.orderStatus.value = 'submitting';
		this.orderError.value = '';

		try {
			const order = await this.api.createOrder(submittedCart, {
				signal: this.orderRequest.signal,
			});
			if (!this.mounted || requestId !== this.orderRequestId) return;

			this.cart.value = [];
			this.orderStatus.value = 'idle';
			this.screen.value = 'catalog';
			this.confirmation.value = order;
		} catch (error) {
			if (error.name === 'AbortError' || !this.mounted || requestId !== this.orderRequestId) {
				return;
			}

			this.orderError.value = error instanceof ApiError
				? 'Objednávku se nepodařilo uložit. Zkuste to prosím znovu.'
				: 'Při ukládání objednávky došlo k neočekávané chybě.';
			this.orderStatus.value = 'error';
		}
	}

	template() {
		return main(
			new TopBar(),

			div(
				new Catalog({
					categories: this.categories,
					category: this.category,
					empty: this.catalogEmpty,
					error: this.catalogError,
					items: this.visibleItems,
					status: this.catalogStatus,
					titleRef: (node) => {
						this.catalogTitle = node;
					},
					onCategorySelect: (categoryId) => this.selectCategory(categoryId),
					onBuildMenu: () => {
						this.builderOpen.value = true;
					},
					onItemOpen: (item) => this.openDetail(item),
					onRetry: () => this.retryCatalog(),
				}),
			).class('layout'),

			new OrderDock({
				summary: this.cartSummary,
				onOpen: () => this.showScreen('order'),
			}),

			show(
				this.builderOpen,
				() => new MenuBuilder({
					onClose: () => {
						this.builderOpen.value = false;
					},
					onComplete: (items) => this.addMenuToCart(items),
				}),
			),

			show(
				this.orderVisible,
				() => new OrderScreen({
					cart: this.cart,
					error: this.orderError,
					pending: this.orderPending,
					summary: this.cartSummary,
					onBack: () => this.showScreen('catalog'),
					onClear: () => this.clearCart(),
					onContinue: () => this.showScreen('upsell'),
					onIncrease: (itemId) => this.changeQuantity(itemId, 1),
					onDecrease: (itemId) => this.changeQuantity(itemId, -1),
					onRemove: (itemId) => this.removeFromCart(itemId),
				}),
			),

			show(
				this.upsellVisible,
				() => new UpsellScreen({
					onAdd: (item) => this.addToCart(item),
					onBack: () => this.showScreen('order'),
					onContinue: () => this.showScreen('checkout'),
				}),
			),

			show(
				this.checkoutVisible,
				() => new CheckoutScreen({
					onBack: () => this.showScreen('upsell'),
					onConfirm: () => this.confirmOrder(),
					onOrderType: (type) => {
						this.orderType.value = type;
					},
					onPayment: (method) => {
						this.payment.value = method;
					},
					orderType: this.orderType,
					payment: this.payment,
					pending: this.orderPending,
					summary: this.cartSummary,
				}),
			),

			show(
				this.detailItemId,
				() =>
					new DetailPanel({
						error: this.detailError,
						item: this.detailItem,
						status: this.detailStatus,
						onAdd: (selected) => this.addToCart(selected),
						onClose: () => this.closeDetail(),
						onRetry: () => this.retryDetail(),
					}),
			),

			show(
				this.confirmation,
				(order) =>
					new Confirmation({
						order,
						onReset: () => {
							this.confirmation.value = null;
							this.catalogTitle?.focus();
						},
					}),
			),
		).class('kiosk-shell');
	}
}
