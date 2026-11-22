// Visible switches for the prototype pages (the owner opens the built file without a query, so
// every choice must be a button on the page). A group is a row of buttons; the choice also goes
// into the address (replaceState), so a screenshot script can open the same view with a query.

export interface Choice {
	readonly id: string;
	readonly label: string;
}
export interface Group {
	readonly key: string;
	readonly label: string;
	readonly options: readonly Choice[];
	/** Several on at once (layers); the value is the ids joined by ','. */
	readonly multi?: boolean;
}

const CSS = `
.pbar{position:fixed;left:0;right:0;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;
  padding:6px 10px;background:rgba(10,8,12,.86);backdrop-filter:blur(4px);font:12px/1.2 system-ui,sans-serif;color:#ddd;
  border-bottom:1px solid rgba(255,255,255,.08)}
.pbar .g{display:flex;gap:3px;align-items:center;flex-wrap:wrap}
.pbar .g>span{opacity:.6;margin-right:3px}
.pbar button{font:inherit;color:#eee;background:#2a2630;border:1px solid #4a4452;border-radius:6px;padding:4px 8px;cursor:pointer}
.pbar button.on{background:#e8a33a;color:#1a1208;border-color:#ffd38a;font-weight:600}
.pbar button:hover{border-color:#aaa}
.pnote{position:fixed;right:10px;bottom:8px;z-index:5;max-width:44vw;font:12px/1.35 system-ui,sans-serif;color:#eee;
  background:rgba(10,8,12,.8);padding:6px 9px;border-radius:6px;pointer-events:none;white-space:pre-line}
`;

export class Bar {
	readonly values = new Map<string, string>();
	private readonly el: HTMLDivElement;
	private readonly note: HTMLDivElement;
	private readonly buttons = new Map<string, HTMLButtonElement[]>();

	constructor(
		private readonly groups: readonly Group[],
		defaults: Record<string, string>,
		private readonly onChange: () => void
	) {
		const style = document.createElement('style');
		style.textContent = CSS;
		document.head.append(style);
		this.el = document.createElement('div');
		this.el.className = 'pbar';
		document.body.append(this.el);
		this.note = document.createElement('div');
		this.note.className = 'pnote';
		document.body.append(this.note);
		const q = new URLSearchParams(location.search);
		for (const g of groups) {
			const wrap = document.createElement('div');
			wrap.className = 'g';
			const label = document.createElement('span');
			label.textContent = g.label;
			wrap.append(label);
			const v = q.get(g.key) ?? defaults[g.key] ?? g.options[0].id;
			this.values.set(g.key, v);
			const list: HTMLButtonElement[] = [];
			for (const o of g.options) {
				const b = document.createElement('button');
				b.textContent = o.label;
				b.dataset.id = o.id;
				b.onclick = () => this.pick(g, o.id);
				wrap.append(b);
				list.push(b);
			}
			this.buttons.set(g.key, list);
			this.el.append(wrap);
		}
		this.paint();
	}

	get(key: string): string {
		return this.values.get(key) ?? '';
	}

	has(key: string, id: string): boolean {
		return this.get(key).split(',').includes(id);
	}

	/** Height of the bar, px: the page draws below it. */
	get height(): number {
		return this.el.getBoundingClientRect().height;
	}

	setNote(text: string): void {
		this.note.textContent = text;
		this.note.style.display = text ? 'block' : 'none';
	}

	private pick(g: Group, id: string): void {
		if (g.multi) {
			const on = new Set(this.get(g.key).split(',').filter(Boolean));
			if (on.has(id)) on.delete(id);
			else on.add(id);
			this.values.set(g.key, [...on].join(','));
		} else {
			this.values.set(g.key, id);
		}
		this.paint();
		const q = new URLSearchParams(location.search);
		for (const [k, v] of this.values) q.set(k, v);
		try {
			history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
		} catch {
			// a page opened in a viewer may not allow it: the buttons still work
		}
		this.onChange();
	}

	private paint(): void {
		for (const g of this.groups) {
			for (const b of this.buttons.get(g.key) ?? []) b.classList.toggle('on', this.has(g.key, b.dataset.id ?? ''));
		}
	}
}
