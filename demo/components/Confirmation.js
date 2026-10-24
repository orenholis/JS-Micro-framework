import {
  ViewComponent,
  button,
  div,
  h2,
  p,
  section,
} from '../../src/index.js';
import { money } from '../format.js';

export class Confirmation extends ViewComponent {
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
