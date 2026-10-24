import {
  ViewComponent,
  div,
  header,
  small,
  span,
  strong,
  value,
} from '../../src/index.js';
import { summarizeCart } from '../state.js';

export class TopBar extends ViewComponent {
  template() {
    const { cart } = this.props;

    return header(
      div(
        span('C').class('brand__mark').aria('hidden', 'true'),
        div(
          strong('Constrained UI'),
          small('framework demo'),
        ),
      ).class('brand'),
      span(value(
        cart,
        (rows) => `${summarizeCart(rows).count} položek`,
      )).class('cart-count').aria('live', 'polite'),
    ).class('topbar');
  }
}
