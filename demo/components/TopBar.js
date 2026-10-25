import { ViewComponent, div, header, small, span, strong } from '../../src/index.js';

export class TopBar extends ViewComponent {
	template() {
		return header(
			div(
				span('B').class('brand__mark').aria('hidden', 'true'),
				div(strong('BITE'), small('fresh kitchen')),
			).class('brand'),
			div(
				span('CZ').class('topbar__language'),
				span('Dotykový kiosk').class('topbar__mode'),
			).class('topbar__utility'),
		).class('topbar');
	}
}
