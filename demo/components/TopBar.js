import { ViewComponent, div, header, small, span, strong, value } from '../../src/index.js';
import { formatItemCount } from '../format.js';

export class TopBar extends ViewComponent {
	template() {
		const { summary } = this.props;

		return header(
			div(
				span('C').class('brand__mark').aria('hidden', 'true'),
				div(strong('Constrained UI'), small('framework demo')),
			).class('brand'),
			span(value(summary, (current) => formatItemCount(current.count))).class('cart-count'),
		).class('topbar');
	}
}
