// Marks a derived binding created by signal.map() or value().
export const VALUE = Symbol('value');

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

	map(map) {
		return { [VALUE]: true, source: this, map };
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

export function signal(initialValue) {
	return new Signal(initialValue);
}

export function isSignal(candidate) {
	return candidate instanceof Signal;
}

export function computed(sources, project, scope) {
	const sourceList = Array.isArray(sources) ? sources : [sources];
	const read = () => project(...sourceList.map((source) => source.value));
	const output = signal(read());

	for (const source of sourceList) {
		const unsubscribe = source.subscribe(() => {
			output.value = read();
		}, { immediate: false });
		scope?.own(unsubscribe);
	}

	return output;
}
