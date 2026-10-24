import {
  ViewComponent,
  div,
  main,
  show,
} from '../../src/index.js';
import { categories, menuItems } from '../data.js';
import {
  addCartItem,
  changeCartItemQuantity,
  filterMenuItems,
  removeCartItem,
  summarizeCart,
} from '../state.js';
import { CartPanel } from './CartPanel.js';
import { Catalog } from './Catalog.js';
import { Confirmation } from './Confirmation.js';
import { DetailPanel } from './DetailPanel.js';
import { TopBar } from './TopBar.js';

export class KioskApp extends ViewComponent {
  constructor() {
    super();
    this.category = this.signal(categories[0].id);
    this.visibleItems = this.signal(
      filterMenuItems(menuItems, categories[0].id),
    );
    this.selectedItem = this.signal(null);
    this.cart = this.signal([]);
    this.confirmation = this.signal(null);
  }

  selectCategory(categoryId) {
    this.category.value = categoryId;
    this.visibleItems.value = filterMenuItems(menuItems, categoryId);
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
          categories,
          category: this.category,
          items: this.visibleItems,
          onCategorySelect: (categoryId) => this.selectCategory(categoryId),
          onItemOpen: (item) => {
            this.selectedItem.value = item;
          },
        }),
        new CartPanel({
          cart: this.cart,
          onIncrease: (itemId) => this.changeQuantity(itemId, 1),
          onDecrease: (itemId) => this.changeQuantity(itemId, -1),
          onRemove: (itemId) => this.removeFromCart(itemId),
          onConfirm: () => this.confirmOrder(),
        }),
      ).class('layout'),

      show(this.selectedItem, (item) => new DetailPanel({
        item,
        onAdd: (selected) => this.addToCart(selected),
        onClose: () => {
          this.selectedItem.value = null;
        },
      })),

      show(this.confirmation, (summary) => new Confirmation({
        summary,
        onReset: () => {
          this.cart.value = [];
          this.confirmation.value = null;
        },
      })),
    ).class('kiosk-shell');
  }
}
