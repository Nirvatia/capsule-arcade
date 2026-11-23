import { describe, expect, it } from 'vitest';
import { COLS, CURRENT, ROWS } from '../config';
import { LIBRARY } from '../pictures/library';
import { parsePicture } from '../pictures/parse';
import { Current } from './current';
import { Progress, type KeyValue } from './progress';

const pictures = LIBRARY.map((p) => parsePicture(p, COLS, ROWS));

function memory(): KeyValue & { data: Map<string, string> } {
	const data = new Map<string, string>();
	return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function seeded(seed = 7): () => number {
	let s = seed;
	return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

describe('Progress', () => {
	it('walks a picture cycle by cycle and files it in the album', () => {
		const store = memory();
		const p = new Progress(pictures, store, 'k');
		const pic = p.picture;
		expect(p.cycle).toBe(0);
		for (const g of pic.cycles) {
			expect(p.pending()).toEqual(g);
			for (const s of g) p.light(s);
		}
		expect(p.complete).toBe(true);
		p.finishPicture();
		expect(p.data.pic).toBe(1);
		expect(p.collected).toBe(1);
		expect(p.data.lit).toEqual([]);
	});

	it('restores from storage and ignores garbage', () => {
		const store = memory();
		const a = new Progress(pictures, store, 'k');
		a.light(0);
		a.teach('pond');
		const b = new Progress(pictures, store, 'k');
		expect(b.isLit(0)).toBe(true);
		expect(b.taught('pond')).toBe(true);
		store.setItem('k', '{"v":1,"pic":999,"lit":[0,0,-1,"x",500],"album":[null]}');
		const c = new Progress(pictures, store, 'k');
		expect(c.data.pic).toBe(pictures.length - 1);
		expect(c.data.lit).toEqual([0]);
		expect(c.data.album).toEqual([]);
		store.setItem('k', 'not json');
		expect(new Progress(pictures, store, 'k').data.pic).toBe(0);
	});

	it('starts a new tide after the last picture', () => {
		const p = new Progress(pictures, memory(), 'k');
		for (let i = 0; i < pictures.length; i++) p.finishPicture();
		expect(p.data.pic).toBe(0);
		expect(p.data.tide).toBe(1);
		expect(p.collected).toBe(pictures.length);
	});
});

describe('Current', () => {
	it('collects sparks, opens the gate and lets the snake in', () => {
		const c = new Current(1600, 1000, seeded(), 2);
		c.sparks.length = 0;
		c.sparks.push(
			{ x: c.x + 5, y: c.y, vx: 0, vy: 0, ph: 0, big: false, born: 0 },
			{ x: c.x - 5, y: c.y, vx: 0, vy: 0, ph: 0, big: false, born: 0 }
		);
		c.update(1 / 60);
		expect(c.got).toBe(2);
		expect(c.events.some((e) => e.k === 'open')).toBe(true);
		c.gate.x = c.x + 200 * Math.cos(c.ang);
		c.gate.y = c.y + 200 * Math.sin(c.ang);
		for (let i = 0; i < 240 && !c.entered; i++) c.update(1 / 60);
		expect(c.entered).toBe(true);
	});

	it('wraps around the edges with a gap in the trail', () => {
		const c = new Current(1600, 1000, seeded(3));
		c.x = 1600 - CURRENT.EDGE - 1;
		c.y = 500;
		c.ang = 0;
		c.update(0.05);
		expect(c.x).toBeLessThan(100);
		expect(c.trail.some((p) => p.g)).toBe(true);
	});

	it('turns gradually toward the steering direction', () => {
		const c = new Current(1600, 1000, seeded(5));
		c.ang = 0;
		c.steer({ x: 0, y: 1 });
		c.update(1 / 60);
		expect(c.ang).toBeGreaterThan(0);
		expect(c.ang).toBeLessThan(Math.PI / 2);
		for (let i = 0; i < 120; i++) c.update(1 / 60);
		expect(c.ang).toBeCloseTo(Math.PI / 2, 1);
	});

	it('the call pulls distant sparks in', () => {
		const c = new Current(1600, 1000, seeded(9));
		c.sparks.length = 0;
		c.sparks.push({ x: c.x + 300, y: c.y, vx: 0, vy: 0, ph: 0, big: false, born: 0 });
		c.steer({ x: 1, y: 0 });
		expect(c.call()).toBe(true);
		expect(c.call()).toBe(false);
		const d0 = 300;
		c.update(0.3);
		expect(Math.hypot(c.sparks[0].x - c.x, c.sparks[0].y - c.y)).toBeLessThan(d0);
	});
});
