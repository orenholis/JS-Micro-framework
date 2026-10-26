import { ViewComponent, button, div, h2, p, section, span, strong } from '../../src/index.js';
import { trapTabKey } from '../focus.js';
import { money } from '../format.js';

export class DetailPanel extends ViewComponent {
	template() {
		const { error, item, onAdd, onClose, onRetry, status } = this.props;

		return div(
			section(
				button('×')
					.class('icon-button')
					.prop('type', 'button')
					.aria('label', 'Zavřít detail')
					.ref('close')
					.on('click', onClose),
				h2(item.map((current) => current?.name ?? 'Detail produktu')).id('detail-title'),

				div(span('Načítám detail…'))
					.class('detail-panel__status')
					.attr('role', 'status')
					.aria('live', 'polite')
					.prop('hidden', status.map((current) => current !== 'loading')),

				div(
					p(error),
					button('Zkusit znovu')
						.class('secondary-button')
						.prop('type', 'button')
						.ref('retry')
						.on('click', onRetry),
				)
					.class('detail-panel__status', 'detail-panel__status--error')
					.attr('role', 'alert')
					.prop('hidden', status.map((current) => current !== 'error')),

				div(
					div()
						.class('detail-panel__image', 'product-image')
						.attr('data-menu-id', item.map((current) => current?.id ?? null))
						.aria('hidden', 'true'),
					p(item.map((current) => current?.description ?? '')),
					div(
						strong(item.map((current) => money(current?.price ?? 0))),
						button('Přidat do objednávky')
							.class('primary-button')
							.prop('type', 'button')
							.ref('add')
							.on('click', () => onAdd(item.value)),
					).class('detail-panel__footer'),
				)
					.class('detail-panel__content')
					.prop('hidden', status.map((current) => current !== 'ready')),
			)
				.class('detail-panel')
				.attr('role', 'dialog')
				.attr('aria-busy', status.map((current) => current === 'loading' ? 'true' : null))
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
		this.own(this.props.status.subscribe((status) => {
			if (status === 'ready' && document.activeElement === this.refs.retry) {
				this.refs.close.focus();
			}
		}, { immediate: false }));
		this.listen(document, 'keydown', (event) => {
			if (event.key === 'Escape') {
				this.props.onClose();
				return;
			}

			const action = this.props.status.value === 'error'
				? this.refs.retry
				: this.props.status.value === 'ready' ? this.refs.add : null;
			trapTabKey(event, [this.refs.close, action]);
		});
	}
}
