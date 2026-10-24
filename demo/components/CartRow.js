import {
  ViewComponent,
  article,
  button,
  div,
  output,
  span,
  strong,
  value,
} from '../../src/index.js';
import { money } from '../format.js';

export class CartRow extends ViewComponent {
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
