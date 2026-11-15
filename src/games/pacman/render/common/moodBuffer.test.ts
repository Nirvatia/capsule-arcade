import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoodBuffer } from './moodBuffer';
import type { MoodPainter } from './moodBuffer';

interface Draw {
	readonly op: 'drawImage' | 'fillRect';
	readonly alpha: number;
	readonly blend: string;
	readonly fill: string;
	readonly args: readonly unknown[];
}

/** A 2D context that only remembers what was drawn, with the state it was drawn in. */
class FakeContext {
	globalAlpha = 1;
	globalCompositeOperation = 'source-over';
	fillStyle = '#000';
	imageSmoothingEnabled = true;
	readonly draws: Draw[] = [];
	private readonly stack: Array<{ alpha: number; blend: string; fill: string }> = [];

	constructor(readonly canvas: { width: number; height: number }) {}

	private note(op: Draw['op'], args: readonly unknown[]): void {
		this.draws.push({
			op,
			alpha: this.globalAlpha,
			blend: this.globalCompositeOperation,
			fill: this.fillStyle,
			args
		});
	}
	drawImage(...args: unknown[]): void {
		this.note('drawImage', args);
	}
	fillRect(...args: unknown[]): void {
		this.note('fillRect', args);
	}
	save(): void {
		this.stack.push({
			alpha: this.globalAlpha,
			blend: this.globalCompositeOperation,
			fill: this.fillStyle
		});
	}
	restore(): void {
		const state = this.stack.pop();
		if (state) {
			this.globalAlpha = state.alpha;
			this.globalCompositeOperation = state.blend;
			this.fillStyle = state.fill;
		}
	}
	setTransform(): void {}
	clearRect(): void {}
	getImageData(_x: number, _y: number, w: number, h: number): { data: Uint8ClampedArray } {
		return { data: new Uint8ClampedArray(w * h * 4) };
	}
	putImageData(): void {}
}

function fakeCanvas(): { width: number; height: number; getContext: () => FakeContext } {
	const canvas = { width: 0, height: 0, getContext: () => context };
	const context = new FakeContext(canvas);
	return canvas;
}

type Ctx = CanvasRenderingContext2D;
const asCtx = (fake: FakeContext): Ctx => fake as unknown as Ctx;

/** The contexts of the buffers a MoodBuffer made, in the order it made them: shade, light. */
let buffers: FakeContext[] = [];
let now = 0;

beforeEach(() => {
	buffers = [];
	now = 1000;
	vi.stubGlobal('document', {
		createElement: () => {
			const canvas = fakeCanvas();
			buffers.push(canvas.getContext());
			return canvas;
		}
	});
	vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/** A painter of one layer that leaves the context as a sprite leaves it: faint and additive. */
const messyPainter: MoodPainter = (ctx) => {
	ctx.globalAlpha = 0.3;
	ctx.globalCompositeOperation = 'lighter';
	ctx.drawImage({} as CanvasImageSource, 0, 0);
};

describe('mood buffer', () => {
	it('turns the coverage black at full strength whatever the painter leaves behind', () => {
		const mood = new MoodBuffer();
		mood.paint(1024, 576, messyPainter);
		const [shade] = buffers;
		const fill = shade!.draws.find((d) => d.op === 'fillRect');
		expect(fill).toBeDefined();
		expect(fill!.blend).toBe('source-atop');
		expect(fill!.alpha).toBe(1);
	});

	it('draws the shade, then the light, over the whole screen', () => {
		const mood = new MoodBuffer();
		const screen = new FakeContext({ width: 1024, height: 576 });
		mood.draw(asCtx(screen), 1024, 576, messyPainter);
		expect(screen.draws.map((d) => d.blend)).toEqual(['source-over', 'lighter']);
		expect(screen.draws.every((d) => d.alpha === 1)).toBe(true);
		expect(screen.draws[0]!.args.slice(1)).toEqual([0, 0, 512, 288, 0, 0, 1024, 576]);
		// the screen's own state is left as it was
		expect(screen.globalCompositeOperation).toBe('source-over');
	});

	it('multiplies the shade when the night is finished into it', () => {
		const mood = new MoodBuffer();
		const screen = new FakeContext({ width: 1024, height: 576 });
		mood.draw(asCtx(screen), 1024, 576, messyPainter, () => {});
		expect(screen.draws.map((d) => d.blend)).toEqual(['multiply', 'lighter']);
	});

	it('paints and draws no light for a stack that only covers', () => {
		const mood = new MoodBuffer();
		mood.setLight(false);
		const screen = new FakeContext({ width: 1024, height: 576 });
		mood.draw(asCtx(screen), 1024, 576, messyPainter);
		const [, light] = buffers;
		expect(light!.draws).toEqual([]);
		expect(screen.draws.map((d) => d.blend)).toEqual(['source-over']);
	});

	it('draws a part of the maps: the screen rectangle in css px, the target as given', () => {
		const mood = new MoodBuffer();
		mood.paint(1024, 576, messyPainter);
		const screen = new FakeContext({ width: 1024, height: 576 });
		mood.compositeRect(asCtx(screen), 100, 50, 200, 80, 7, 9, 400, 160);
		expect(screen.draws).toHaveLength(2);
		for (const draw of screen.draws) {
			expect(draw.args.slice(1)).toEqual([50, 25, 100, 40, 7, 9, 400, 160]);
		}
	});

	it('stretches the edge pixels over the margins of a baked image', () => {
		const mood = new MoodBuffer();
		mood.setLight(false);
		mood.paint(1024, 576, messyPainter);
		const bake = new FakeContext({ width: 1200, height: 700 });
		mood.compositeWithMargins(asCtx(bake), 80, 60, 1040, 580, 80, 60, 80, 60);
		const parts = bake.draws.map((d) => d.args.slice(1));
		expect(parts).toHaveLength(9);
		// the screen itself, then for example the left margin and the bottom right corner
		expect(parts).toContainEqual([0, 0, 512, 288, 80, 60, 1040, 580]);
		expect(parts).toContainEqual([0, 0, 1, 288, 0, 60, 80, 580]);
		expect(parts).toContainEqual([511, 287, 1, 1, 1120, 640, 80, 60]);
	});

	it('skips a margin that is not there', () => {
		const mood = new MoodBuffer();
		mood.setLight(false);
		mood.paint(1024, 576, messyPainter);
		const bake = new FakeContext({ width: 1024, height: 576 });
		mood.compositeWithMargins(asCtx(bake), 0, 0, 1024, 576, 0, 0, 0, 0);
		expect(bake.draws).toHaveLength(1);
	});

	it('repaints at the rate of its quality tier, or at once when forced', () => {
		const mood = new MoodBuffer();
		mood.setQuality('low');
		let paints = 0;
		const counting: MoodPainter = (_ctx, additive) => {
			if (!additive) {
				paints += 1;
			}
		};
		mood.paint(1024, 576, counting);
		now += 30;
		mood.paint(1024, 576, counting);
		expect(paints).toBe(1);
		now += 40;
		mood.paint(1024, 576, counting);
		expect(paints).toBe(2);
		mood.paint(1024, 576, counting, null, true);
		expect(paints).toBe(3);
	});

	it('draws nothing before the maps are painted', () => {
		const mood = new MoodBuffer();
		const screen = new FakeContext({ width: 1024, height: 576 });
		mood.composite(asCtx(screen));
		mood.compositeRect(asCtx(screen), 0, 0, 10, 10, 0, 0, 10, 10);
		expect(screen.draws).toEqual([]);
	});
});
