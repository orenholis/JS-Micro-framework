export function trapTabKey(event, elements) {
	if (event.key !== 'Tab') return false;

	const available = elements.filter((element) => element && !element.disabled && !element.hidden);
	if (available.length === 0) return false;

	const currentIndex = available.indexOf(document.activeElement);
	const nextIndex = event.shiftKey
		? currentIndex <= 0 ? available.length - 1 : currentIndex - 1
		: currentIndex === -1 || currentIndex === available.length - 1 ? 0 : currentIndex + 1;

	event.preventDefault();
	available[nextIndex].focus();
	return true;
}
