import {
  ViewComponent,
  article,
  aside,
  button,
  div,
  each,
  h1,
  h2,
  header,
  main,
  mount,
  nav,
  output,
  p,
  section,
  show,
  small,
  span,
  strong,
  value,
} from '../src/index.js';
import { categories, menuItems } from './data.js';

const money = (amount) => `${amount.toLocaleString('cs-CZ')} Kč`;

class MenuItem extends ViewComponent {
  template() {
    const { item, onOpen } = this.props;

    return button(
      span(value(item, (current) => current.emoji))
        .class('menu-card__emoji')
        .aria('hidden', 'true'),
      strong(value(item, (current) => current.name))
        .class('menu-card__name'),
      span(value(item, (current) => money(current.price)))
        .class('menu-card__price'),
    )
      .class('menu-card')
      .prop('type', 'button')
      .on('click', () => onOpen(item.value));
  }
}

class DetailPanel extends ViewComponent {
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
        div(item.emoji)
          .class('detail-panel__emoji')
          .aria('hidden', 'true'),
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

class CartRow extends ViewComponent {
  template() {
    const { row, onIncrease, onDecrease, onRemove } = this.props;

    return article(
      div(
        strong(value(row, (current) => current.name)),
        span(value(row, (current) => money(current.price * current.quantity)))
          .class('muted'),
      ).class('cart-row__copy'),
      div(
        button('−')
          .class('quantity-button')
          .prop('type', 'button')
          .aria('label', 'Snížit množství')
          .on('click', () => onDecrease(row.value.id)),
        output(value(row, (current) => current.quantity)).class('quantity'),
        button('+')
          .class('quantity-button')
          .prop('type', 'button')
          .aria('label', 'Zvýšit množství')
          .on('click', () => onIncrease(row.value.id)),
        button('Odebrat')
          .class('remove-button')
          .prop('type', 'button')
          .on('click', () => onRemove(row.value.id)),
      ).class('cart-row__controls'),
    ).class('cart-row');
  }
}

class Confirmation extends ViewComponent {
  template() {
    const { summary, onReset } = this.props;

    return div(
      section(
        div('✓').class('confirmation__icon').aria('hidden', 'true'),
        h2('Objednávka přijata'),
        p(`${summary.count} položek v hodnotě ${money(summary.total)}.`),
        button('Nová objednávka')
          .class('primary-button')
          .prop('type', 'button')
          .ref('reset')
          .on('click', onReset),
      )
        .class('confirmation')
        .attr('role', 'dialog')
        .aria('modal', 'true'),
    ).class('overlay', 'overlay--confirmation');
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
      total: this.cart.value.reduce(
        (sum, row) => sum + row.price * row.quantity,
        0,
      ),
    };
  }

  template() {
    return main(
      header(
        div(
          span('C').class('brand__mark').aria('hidden', 'true'),
          div(
            strong('Constrained UI'),
            small('framework demo'),
          ),
        ).class('brand'),
        span(value(
          this.cart,
          (rows) => `${rows.reduce((sum, row) => sum + row.quantity, 0)} položek`,
        )).class('cart-count').aria('live', 'polite'),
      ).class('topbar'),

      div(
        section(
          div(
            div(
              p('Objednávkový kiosk').class('eyebrow'),
              h1('Vyberte si z nabídky').id('menu-title'),
            ),
            p('Ukázka cílených DOM aktualizací bez virtuálního stromu.')
              .class('section-heading__copy'),
          ).class('section-heading'),

          nav(categories.map((category) => (
            button(category.name)
              .class('category-button')
              .class(
                'is-active',
                value(this.category, (current) => current === category.id),
              )
              .prop('type', 'button')
              .attr(
                'aria-current',
                value(
                  this.category,
                  (current) => current === category.id ? 'true' : null,
                ),
              )
              .on('click', () => this.selectCategory(category.id))
          )))
            .class('categories')
            .aria('label', 'Kategorie menu'),

          div(each(this.visibleItems, {
            key: (item) => item.id,
            render: (item) => new MenuItem({
              item,
              onOpen: (selected) => {
                this.selectedItem.value = selected;
              },
            }),
          })).class('menu-grid'),
        )
          .class('catalog')
          .aria('labelledby', 'menu-title'),

        aside(
          div(
            div(
              p('Aktuální výběr').class('eyebrow'),
              h2('Objednávka').id('cart-title'),
            ),
          ).class('cart-panel__heading'),

          p('Zatím jste nic nevybrali.')
            .class('empty-state')
            .prop('hidden', value(this.cart, (rows) => rows.length > 0)),

          div(each(this.cart, {
            key: (row) => row.id,
            render: (row) => new CartRow({
              row,
              onIncrease: (id) => this.changeQuantity(id, 1),
              onDecrease: (id) => this.changeQuantity(id, -1),
              onRemove: (id) => this.removeFromCart(id),
            }),
          })).class('cart-rows'),

          div(
            span('Celkem'),
            strong(value(
              this.cart,
              (rows) => money(rows.reduce(
                (sum, row) => sum + row.price * row.quantity,
                0,
              )),
            )).class('total-value'),
          ).class('total-row'),

          button('Potvrdit objednávku')
            .class('primary-button', 'primary-button--wide')
            .prop('type', 'button')
            .prop('disabled', value(this.cart, (rows) => rows.length === 0))
            .on('click', () => this.confirmOrder()),
        )
          .class('cart-panel')
          .aria('labelledby', 'cart-title'),
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

mount(new KioskApp(), document.querySelector('#app'));
