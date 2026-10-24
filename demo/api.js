export class ApiError extends Error {
	constructor(message, status) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

export function createCatalogApi(fetchImplementation = fetch) {
	async function get(path, signal) {
		const response = await fetchImplementation(path, {
			headers: { Accept: 'application/json' },
			signal,
		});

		if (!response.ok) {
			throw new ApiError(`API request failed with status ${response.status}.`, response.status);
		}

		return response.json();
	}

	return Object.freeze({
		listCategories(options = {}) {
			return get('/api/categories', options.signal);
		},

		listMenuItems(categoryId, options = {}) {
			const query = new URLSearchParams({ category: categoryId });
			return get(`/api/menu-items?${query}`, options.signal);
		},

		getMenuItem(itemId, options = {}) {
			return get(`/api/menu-items/${encodeURIComponent(itemId)}`, options.signal);
		},
	});
}

export const catalogApi = createCatalogApi();
