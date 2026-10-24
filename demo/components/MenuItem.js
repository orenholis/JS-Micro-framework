import {
  ViewComponent,
  button,
  span,
  strong,
  value,
} from '../../src/index.js';
import { money } from '../format.js';

export class MenuItem extends ViewComponent {
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
