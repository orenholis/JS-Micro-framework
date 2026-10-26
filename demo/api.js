export class ApiError extends Error {
	constructor(message, status) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

export function createCatalogApi(fetchImplementation = fetch) {
	async function request(path, { body, method = 'GET', signal } = {}) {
		const headers = { Accept: 'application/json' };

		if (body !== undefined) headers['Content-Type'] = 'application/json';

		const response = await fetchImplementation(path, {
			body: body === undefined ? undefined : JSON.stringify(body),
			headers,
			method,
			signal,
		});

		if (!response.ok) {
			throw new ApiError(`API request failed with status ${response.status}.`, response.status);
		}

		return response.json();
	}

	return Object.freeze({
		listCategories(options = {}) {
			return request('/api/categories', options);
		},

		listMenuItems(categoryId, options = {}) {
			const query = new URLSearchParams({ category: categoryId });
			return request(`/api/menu-items?${query}`, options);
		},

		getMenuItem(itemId, options = {}) {
			return request(`/api/menu-items/${encodeURIComponent(itemId)}`, options);
		},

		createOrder(cart, options = {}) {
			return request('/api/orders', {
				body: {
					items: cart
						.filter((row) => row.type === 'item')
						.map((row) => ({ menuItemId: row.id, quantity: row.quantity })),
					menus: cart
						.filter((row) => row.type === 'menu')
						.map((row) => ({ ...row.selection, quantity: row.quantity })),
				},
				method: 'POST',
				signal: options.signal,
			});
		},
	});
}

export const catalogApi = createCatalogApi();
