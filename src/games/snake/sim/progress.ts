// Прогресс игрока: какой рисунок рисуется, какие штрихи горят, что лежит в альбоме.
// Хранилище передаётся снаружи, чтобы логику можно было проверить без браузера.

import type { Picture } from '../pictures/types';

export interface AlbumEntry {
	id: string;
	/** Прилив, в котором рисунок собран (0 — первый). */
	tide: number;
}

export interface SaveData {
	v: 1;
	/** Индекс текущего рисунка в библиотеке. */
	pic: number;
	tide: number;
	/** Зажжённые штрихи текущего рисунка. */
	lit: number[];
	album: AlbumEntry[];
	taught: string[];
}

export interface KeyValue {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

const fresh = (): SaveData => ({ v: 1, pic: 0, tide: 0, lit: [], album: [], taught: [] });

export class Progress {
	data: SaveData;

	constructor(
		private readonly pictures: readonly Picture[],
		private readonly store: KeyValue | null,
		private readonly key: string
	) {
		this.data = this.load();
	}

	private load(): SaveData {
		try {
			const raw = this.store?.getItem(this.key);
			if (!raw) return fresh();
			const d = JSON.parse(raw) as Partial<SaveData>;
			if (d.v !== 1) return fresh();
			const pic = Number.isInteger(d.pic)
				? Math.max(0, Math.min(this.pictures.length - 1, d.pic as number))
				: 0;
			const n = this.pictures[pic].strokes.length;
			return {
				v: 1,
				pic,
				tide: Number.isInteger(d.tide) ? Math.max(0, d.tide as number) : 0,
				lit: Array.isArray(d.lit)
					? [...new Set(d.lit.filter((i) => Number.isInteger(i) && i >= 0 && i < n))]
					: [],
				album: Array.isArray(d.album)
					? d.album.filter((a) => a && typeof a.id === 'string' && Number.isInteger(a.tide))
					: [],
				taught: Array.isArray(d.taught) ? d.taught.filter((t) => typeof t === 'string') : []
			};
		} catch {
			return fresh();
		}
	}

	save(): void {
		try {
			this.store?.setItem(this.key, JSON.stringify(this.data));
		} catch {
			// хранилище недоступно — играем без сохранения
		}
	}

	get picture(): Picture {
		return this.pictures[this.data.pic];
	}

	isLit(stroke: number): boolean {
		return this.data.lit.includes(stroke);
	}

	/** Индекс текущего захода: первый, где есть незажжённый штрих. */
	get cycle(): number {
		const i = this.picture.cycles.findIndex((g) => g.some((s) => !this.isLit(s)));
		return i < 0 ? this.picture.cycles.length : i;
	}

	/** Штрихи, которые ждут обводки в этом заходе. */
	pending(): number[] {
		const g = this.picture.cycles[this.cycle];
		return g ? g.filter((s) => !this.isLit(s)) : [];
	}

	get complete(): boolean {
		return this.cycle >= this.picture.cycles.length;
	}

	light(stroke: number): void {
		if (!this.isLit(stroke)) this.data.lit.push(stroke);
		this.save();
	}

	/** Рисунок собран: в альбом, дальше следующий (после последнего — новый прилив). */
	finishPicture(): AlbumEntry {
		const entry = { id: this.picture.id, tide: this.data.tide };
		if (!this.data.album.some((a) => a.id === entry.id && a.tide === entry.tide))
			this.data.album.push(entry);
		this.data.lit = [];
		this.data.pic++;
		if (this.data.pic >= this.pictures.length) {
			this.data.pic = 0;
			this.data.tide++;
		}
		this.save();
		return entry;
	}

	/** Сколько разных рисунков собрано (для доски почёта). */
	get collected(): number {
		return this.data.album.length;
	}

	taught(id: string): boolean {
		return this.data.taught.includes(id);
	}

	teach(id: string): void {
		if (!this.taught(id)) {
			this.data.taught.push(id);
			this.save();
		}
	}

	reset(): void {
		this.data = fresh();
		this.save();
	}
}
