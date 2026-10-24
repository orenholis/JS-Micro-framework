export const money = (amount) => `${amount.toLocaleString('cs-CZ')} Kč`;

export function formatItemCount(count) {
	if (count === 1) return '1 položka';
	if (count >= 2 && count <= 4) return `${count} položky`;
	return `${count} položek`;
}
