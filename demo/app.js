import { ViewComponent, each, mount, show, value } from '../src/index.js';
import { categories, menuItems } from './data.js';

const money = (amount) => `${amount.toLocaleString('cs-CZ')} Kč`;

class MenuItem extends ViewComponent {
  template() {
    const { item, onOpen } = this.props;
    return {
      tag: 'button',
      class: 'menu-card',
      type: 'button',
      'on:click': () => onOpen(item.value),
      children: [
        {
          tag: 'span',
          class: 'menu-card__emoji',
          'attr:aria-hidden': 'true',
          text: value(item, (current) => current.emoji),
        },
        {
          tag: 'strong',
          class: 'menu-card__name',
          text: value(item, (current) => current.name),
        },
        {
          tag: 'span',
          class: 'menu-card__price',
          text: value(item, (current) => money(current.price)),
        },
      ],
    };
  }
}

class DetailPanel extends ViewComponent {
  template() {
    const { item, onAdd, onClose } = this.props;
    return {
      class: 'overlay',
      role: 'presentation',
      'on:click': (event) => {
        if (event.target === event.currentTarget) onClose();
      },
      children: [{
        tag: 'section',
        class: 'detail-panel',
        role: 'dialog',
        'attr:aria-modal': 'true',
        'attr:aria-labelledby': 'detail-title',
        children: [
          {
            tag: 'button',
            ref: 'close',
            class: 'icon-button',
            type: 'button',
            'attr:aria-label': 'Zavřít detail',
            'on:click': onClose,
            text: '×',
          },
          {
            class: 'detail-panel__emoji',
            'attr:aria-hidden': 'true',
            text: item.emoji,
          },
          { tag: 'h2', id: 'detail-title', text: item.name },
          { tag: 'p', text: item.description },
          {
            class: 'detail-panel__footer',
            children: [
              { tag: 'strong', text: money(item.price) },
              {
                tag: 'button',
                class: 'primary-button',
                type: 'button',
                'on:click': () => onAdd(item),
                text: 'Přidat do objednávky',
              },
            ],
          },
        ],
      }],
    };
  }

  afterMount() {
    this.refs.close.focus();
  }
}

class CartRow extends ViewComponent {
  template() {
    const { row, onIncrease, onDecrease, onRemove } = this.props;
    return {
      tag: 'article',
      class: 'cart-row',
      children: [
        {
          class: 'cart-row__copy',
          children: [
            {
              tag: 'strong',
              text: value(row, (current) => current.name),
            },
            {
              tag: 'span',
              class: 'muted',
              text: value(
                row,
                (current) => money(current.price * current.quantity),
              ),
            },
          ],
        },
        {
          class: 'cart-row__controls',
          children: [
            {
              tag: 'button',
              class: 'quantity-button',
              type: 'button',
              'attr:aria-label': 'Snížit množství',
              'on:click': () => onDecrease(row.value.id),
              text: '−',
            },
            {
              tag: 'output',
              class: 'quantity',
              text: value(row, (current) => current.quantity),
            },
            {
              tag: 'button',
              class: 'quantity-button',
              type: 'button',
              'attr:aria-label': 'Zvýšit množství',
              'on:click': () => onIncrease(row.value.id),
              text: '+',
            },
            {
              tag: 'button',
              class: 'remove-button',
              type: 'button',
              'on:click': () => onRemove(row.value.id),
              text: 'Odebrat',
            },
          ],
        },
      ],
    };
  }
}

class Confirmation extends ViewComponent {
  template() {
    const { summary, onReset } = this.props;
    return {
      class: 'overlay overlay--confirmation',
      children: [{
        tag: 'section',
        class: 'confirmation',
        role: 'dialog',
        'attr:aria-modal': 'true',
        children: [
          {
            class: 'confirmation__icon',
            'attr:aria-hidden': 'true',
            text: '✓',
          },
          { tag: 'h2', text: 'Objednávka přijata' },
          {
            tag: 'p',
            text: `${summary.count} položek v hodnotě ${money(summary.total)}.`,
          },
          {
            tag: 'button',
            ref: 'reset',
            class: 'primary-button',
            type: 'button',
            'on:click': onReset,
            text: 'Nová objednávka',
          },
        ],
      }],
    };
  }

  afterMount() {
    this.refs.reset.focus();
  }
}

class KioskApp extends ViewComponent {
  constructor() {
    super();
    this.category = this.signal(categories[0].id);
    this.visibleItems = this.signal(
      menuItems.filter((item) => item.category === categories[0].id),
    );
    this.selectedItem = this.signal(null);
    this.cart = this.signal([]);
    this.confirmation = this.signal(null);
  }

  selectCategory(categoryId) {
    this.category.value = categoryId;
    this.visibleItems.value = menuItems.filter(
      (item) => item.category === categoryId,
    );
  }

  addToCart(item) {
    const existing = this.cart.value.find((row) => row.id === item.id);
    this.cart.value = existing
      ? this.cart.value.map((row) => (
        row.id === item.id
          ? { ...row, quantity: row.quantity + 1 }
          : row
      ))
      : [...this.cart.value, { ...item, quantity: 1 }];

    this.selectedItem.value = null;
  }

  changeQuantity(itemId, delta) {
    this.cart.value = this.cart.value
      .map((row) => (
        row.id === itemId
          ? { ...row, quantity: row.quantity + delta }
          : row
      ))
      .filter((row) => row.quantity > 0);
  }

  removeFromCart(itemId) {
    this.cart.value = this.cart.value.filter((row) => row.id !== itemId);
  }

  confirmOrder() {
    this.confirmation.value = {
      count: this.cart.value.reduce((sum, row) => sum + row.quantity, 0),
      total: this.cart.value.reduce((sum, row) => sum + row.price * row.quantity, 0),
    };
  }

  template() {
    return {
      tag: 'main',
      class: 'kiosk-shell',
      children: [
        {
          tag: 'header',
          class: 'topbar',
          children: [
            {
              class: 'brand',
              children: [
                {
                  tag: 'span',
                  class: 'brand__mark',
                  'attr:aria-hidden': 'true',
                  text: 'C',
                },
                {
                  children: [
                    { tag: 'strong', text: 'Constrained UI' },
                    { tag: 'small', text: 'framework demo' },
                  ],
                },
              ],
            },
            {
              tag: 'span',
              class: 'cart-count',
              'attr:aria-live': 'polite',
              text: value(
                this.cart,
                (rows) => `${rows.reduce((sum, row) => sum + row.quantity, 0)} položek`,
              ),
            },
          ],
        },
        {
          class: 'layout',
          children: [
            {
              tag: 'section',
              class: 'catalog',
              'attr:aria-labelledby': 'menu-title',
              children: [
                {
                  class: 'section-heading',
                  children: [
                    {
                      children: [
                        {
                          tag: 'p',
                          class: 'eyebrow',
                          text: 'Objednávkový kiosk',
                        },
                        {
                          tag: 'h1',
                          id: 'menu-title',
                          text: 'Vyberte si z nabídky',
                        },
                      ],
                    },
                    {
                      tag: 'p',
                      class: 'section-heading__copy',
                      text: 'Ukázka cílených DOM aktualizací bez virtuálního stromu.',
                    },
                  ],
                },
                {
                  tag: 'nav',
                  class: 'categories',
                  'attr:aria-label': 'Kategorie menu',
                  children: categories.map((category) => ({
                    tag: 'button',
                    class: 'category-button',
                    type: 'button',
                    'class:is-active': value(
                      this.category,
                      (current) => current === category.id,
                    ),
                    'attr:aria-current': value(
                      this.category,
                      (current) => current === category.id ? 'true' : null,
                    ),
                    'on:click': () => this.selectCategory(category.id),
                    text: category.name,
                  })),
                },
                {
                  class: 'menu-grid',
                  children: each(this.visibleItems, {
                    key: (item) => item.id,
                    render: (item) => new MenuItem({
                      item,
                      onOpen: (selected) => {
                        this.selectedItem.value = selected;
                      },
                    }),
                  }),
                },
              ],
            },
            {
              tag: 'aside',
              class: 'cart-panel',
              'attr:aria-labelledby': 'cart-title',
              children: [
                {
                  class: 'cart-panel__heading',
                  children: [{
                    children: [
                      {
                        tag: 'p',
                        class: 'eyebrow',
                        text: 'Aktuální výběr',
                      },
                      {
                        tag: 'h2',
                        id: 'cart-title',
                        text: 'Objednávka',
                      },
                    ],
                  }],
                },
                {
                  tag: 'p',
                  class: 'empty-state',
                  hidden: value(this.cart, (rows) => rows.length > 0),
                  text: 'Zatím jste nic nevybrali.',
                },
                {
                  class: 'cart-rows',
                  children: each(this.cart, {
                    key: (row) => row.id,
                    render: (row) => new CartRow({
                      row,
                      onIncrease: (id) => this.changeQuantity(id, 1),
                      onDecrease: (id) => this.changeQuantity(id, -1),
                      onRemove: (id) => this.removeFromCart(id),
                    }),
                  }),
                },
                {
                  class: 'total-row',
                  children: [
                    { tag: 'span', text: 'Celkem' },
                    {
                      tag: 'strong',
                      class: 'total-value',
                      text: value(
                        this.cart,
                        (rows) => money(rows.reduce(
                          (sum, row) => sum + row.price * row.quantity,
                          0,
                        )),
                      ),
                    },
                  ],
                },
                {
                  tag: 'button',
                  class: 'primary-button primary-button--wide',
                  type: 'button',
                  disabled: value(this.cart, (rows) => rows.length === 0),
                  'on:click': () => this.confirmOrder(),
                  text: 'Potvrdit objednávku',
                },
              ],
            },
          ],
        },
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
      ],
    };
  }
}

mount(new KioskApp(), document.querySelector('#app'));
