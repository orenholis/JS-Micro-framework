import { ViewComponent, div, header, small, span, strong, value } from '../../src/index.js';
import { formatItemCount } from '../format.js';

export class TopBar extends ViewComponent {
	template() {
		const { summary } = this.props;

		return header(
			div(
				span('B').class('brand__mark').aria('hidden', 'true'),
				div(strong('BITE'), small('fresh kitchen')),
			).class('brand'),
			span(
				span('Vaše objednávka'),
				strong(value(summary, (current) => formatItemCount(current.count))),
			).class('cart-count'),
		).class('topbar');
	}
}
