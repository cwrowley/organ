export function formatDate(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(y, m - 1, d);
	return date.toLocaleDateString(undefined, {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

export function isUpcoming(iso: string): boolean {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(y, m - 1, d);
	return date >= today;
}

export function formatDuration(minutes: number | null): string {
	if (minutes == null) return '';
	if (minutes < 60) return `${minutes}m`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatFee(fee: number | null): string {
	if (fee == null) return '';
	return `$${fee.toFixed(0)}`;
}
