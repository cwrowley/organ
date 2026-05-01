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

export function formatDuration(seconds: number | null): string {
	if (seconds == null) return '';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseDuration(input: string): number | null {
	const s = input.trim();
	if (s === '') return null;
	if (s.includes(':')) {
		const parts = s.split(':');
		if (parts.length !== 2) return null;
		const m = Number(parts[0]);
		const sec = Number(parts[1]);
		if (!Number.isFinite(m) || !Number.isFinite(sec)) return null;
		return Math.round(m * 60 + sec);
	}
	const n = Number(s);
	return Number.isFinite(n) ? Math.round(n) : null;
}

export function formatFee(fee: number | null): string {
	if (fee == null) return '';
	return `$${fee.toFixed(0)}`;
}
