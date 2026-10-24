export class Signal {
	#value;
	#subscribers = new Set();

	constructor(initialValue) {
		this.#value = initialValue;
	}

	get value() {
		return this.#value;
	}

	set value(nextValue) {
		if (Object.is(this.#value, nextValue)) {
			return;
		}

		this.#value = nextValue;

		for (const subscriber of [...this.#subscribers]) {
			subscriber(nextValue);
		}
	}

	update(updater) {
		this.value = updater(this.#value);
	}

	subscribe(subscriber, { immediate = true } = {}) {
		this.#subscribers.add(subscriber);
		if (immediate) subscriber(this.#value);

		return () => {
			this.#subscribers.delete(subscriber);
		};
	}

	get subscriberCount() {
		return this.#subscribers.size;
	}
}

export function state(initialValue) {
	return new Signal(initialValue);
}

export function isSignal(value) {
	return value instanceof Signal;
}

export function computed(sources, project, scope) {
	const sourceList = Array.isArray(sources) ? sources : [sources];
	const output = state(project(...sourceList.map((source) => source.value)));
	const refresh = () => {
		output.value = project(...sourceList.map((source) => source.value));
	};

	for (const source of sourceList) {
		const unsubscribe = source.subscribe(refresh, { immediate: false });
		scope?.own(unsubscribe);
	}

	return output;
}
