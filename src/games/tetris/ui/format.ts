export function formatScore(score: number, digits = 6): string {
	const safe = Math.max(0, Math.floor(Number.isFinite(score) ? score : 0));
	return String(safe)
		.padStart(digits, '0')
		.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatTime(ms: number, tenths = true): string {
	const safe = Math.max(0, Number.isFinite(ms) ? ms : 0);
	const total = Math.floor(safe / 100);
	const minutes = Math.floor(total / 600);
	const seconds = Math.floor((total % 600) / 10);
	const base = `${minutes}:${String(seconds).padStart(2, '0')}`;
	return tenths ? `${base}.${total % 10}` : base;
}
