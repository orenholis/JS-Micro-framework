import { Component, div, match, show } from '../../src/index.js';
import { ApiError, catalogApi } from '../api.js';
import { menuItems } from '../data.js';
import { priceMenu } from '../menu-deal.js';
import { addCartItem, addCartMenu, changeCartItemQuantity, clearCart, removeCartItem, summarizeCart } from '../state.js';
import { CatalogScreen } from './CatalogScreen.js';
import { ConfirmationScreen } from './ConfirmationScreen.js';
import { MenuBuilder } from './MenuBuilder.js';
import { OrderScreen } from './OrderScreen.js';
import { PaymentScreen } from './PaymentScreen.js';
import { ProductSheet } from './ProductSheet.js';
import { WelcomeScreen } from './WelcomeScreen.js';

const findItem = (id) => menuItems.find((item) => item.id === id);

export class KioskApp extends Component {
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
		this.screen = this.signal('welcome');
		this.builder = this.signal(null);
		this.returnToCatalog = false;
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

	addToCart(item, quantity = 1) {
		this.clearOrderError();
		this.cart.value = addCartItem(this.cart.value, item, quantity);
		this.closeDetail();
	}

	changeQuantity(key, delta) {
		this.clearOrderError();
		this.cart.value = changeCartItemQuantity(this.cart.value, key, delta);
	}

	clearOrderError() {
		if (this.orderStatus.value === 'error') this.orderStatus.value = 'idle';
		this.orderError.value = '';
	}

	openMenuBuilder(burgerId) {
		this.closeDetail();
		this.builder.value = { selection: { burger: burgerId } };
	}

	editMenu(row) {
		this.builder.value = { selection: row.selection, replaceKey: row.key, quantity: row.quantity };
	}

	completeMenu(selection, initial) {
		const menu = priceMenu(selection, findItem);
		if (!menu) return;

		this.clearOrderError();
		const quantity = initial?.quantity ?? 1;
		const cart = initial?.replaceKey ? removeCartItem(this.cart.value, initial.replaceKey) : this.cart.value;
		this.cart.value = addCartMenu(cart, menu, selection, quantity);
		this.builder.value = null;
	}

	startOrder(type) {
		this.orderType.value = type;
		this.returnToCatalog = false;
		this.screen.value = 'catalog';
	}

	toggleOrderType() {
		this.orderType.value = this.orderType.value === 'eat-in' ? 'takeaway' : 'eat-in';
	}

	cancelOrder() {
		this.orderRequest?.abort();
		this.closeDetail();
		this.builder.value = null;
		this.cart.value = clearCart(this.cart.value);
		this.payment.value = 'card';
		this.orderStatus.value = 'idle';
		this.orderError.value = '';
		this.screen.value = 'welcome';
	}

	showScreen(screen) {
		this.returnToCatalog = screen === 'catalog';
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
			this.confirmation.value = { order, method: this.payment.value };
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

	finishOrder() {
		this.confirmation.value = null;
		this.payment.value = 'card';
		this.screen.value = 'welcome';
	}

	template() {
		return div(
			match(this.screen, {
				welcome: () => new WelcomeScreen({ onStart: (type) => this.startOrder(type) }),
				catalog: () => new CatalogScreen({
					categories: this.categories,
					category: this.category,
					empty: this.catalogEmpty,
					error: this.catalogError,
					focusTitle: this.returnToCatalog,
					header: {
						onCancel: () => this.cancelOrder(),
						onToggleType: () => this.toggleOrderType(),
					},
					items: this.visibleItems,
					orderType: this.orderType,
					status: this.catalogStatus,
					summary: this.cartSummary,
					onBuildMenu: (burgerId) => this.openMenuBuilder(burgerId),
					onCategorySelect: (categoryId) => this.selectCategory(categoryId),
					onItemOpen: (item) => this.openDetail(item),
					onOpenOrder: () => this.showScreen('order'),
					onRetry: () => this.retryCatalog(),
				}),
				order: () => new OrderScreen({
					cart: this.cart,
					error: this.orderError,
					orderType: this.orderType,
					pending: this.orderPending,
					summary: this.cartSummary,
					onAdd: (item) => this.addToCart(item),
					onBack: () => this.showScreen('catalog'),
					onContinue: () => this.showScreen('payment'),
					onDecrease: (key) => this.changeQuantity(key, -1),
					onEditMenu: (row) => this.editMenu(row),
					onIncrease: (key) => this.changeQuantity(key, 1),
				}),
				payment: () => new PaymentScreen({
					error: this.orderError,
					orderType: this.orderType,
					payment: this.payment,
					pending: this.orderPending,
					summary: this.cartSummary,
					onBack: () => this.showScreen('order'),
					onConfirm: () => this.confirmOrder(),
					onPayment: (method) => {
						this.payment.value = method;
					},
				}),
			}),

			show(
				this.detailItemId,
				() => new ProductSheet({
					error: this.detailError,
					item: this.detailItem,
					status: this.detailStatus,
					onAdd: (item, quantity) => this.addToCart(item, quantity),
					onClose: () => this.closeDetail(),
					onMakeMenu: (burgerId) => this.openMenuBuilder(burgerId),
					onRetry: () => this.retryDetail(),
				}),
			),

			show(
				this.builder,
				(initial) => new MenuBuilder({
					initial,
					onClose: () => {
						this.builder.value = null;
					},
					onComplete: (selection, origin) => this.completeMenu(selection, origin),
				}),
			),

			show(
				this.confirmation,
				({ order, method }) => new ConfirmationScreen({
					method,
					order,
					onReset: () => this.finishOrder(),
				}),
			),
		).class('kiosk');
	}
}
