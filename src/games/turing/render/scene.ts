// One frame of the machine: workshop, rail, tape, beam and the carriage over the head cell.
import { drawFactory, drawRail } from './factory';
import { C } from './palette';
import { drawBeam, drawRobot, RAIL_Y, type Arm, type Mood } from './robot';
import { drawTape, pitch, tileH } from './tape';

export interface SceneState {
	t: number;
	cells: string[];
	head: number;
	/** fractional head position while the carriage drives (default: head) */
	headPos?: number;
	state: string;
	mood: Mood;
	arm?: Arm;
	tilt?: number;
	sign?: string;
	signColor?: string;
	signX?: number;
	tileSize?: number;
	/** cell index the camera centres on (default: the head) */
	focus?: number;
	/** 0..1 of the width where the focus cell sits */
	focusX?: number;
	flash?: { index: number; amount: number };
	font?: 'mono' | 'head';
	beamColor?: string;
}

export interface SceneLayout {
	tapeX: number;
	tapeY: number;
	size: number;
	robotX: number;
	tipY: number;
	scale: number;
}

export function layoutScene(w: number, h: number, s: SceneState): SceneLayout {
	const size = s.tileSize ?? Math.min(58, h * 0.2);
	const p = pitch(size);
	const tapeY = h - tileH(size) - size * 0.55;
	const focus = s.focus ?? s.head;
	const tapeX = w * (s.focusX ?? 0.5) - (focus + 0.5) * p;
	const scale = Math.min((tapeY - size * 0.2 - 34) / -RAIL_Y, size / 56);
	return {
		tapeX,
		tapeY,
		size,
		robotX: tapeX + ((s.headPos ?? s.head) + 0.5) * p,
		tipY: tapeY - size * 0.16,
		scale
	};
}

export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, s: SceneState) {
	const L = layoutScene(w, h, s);
	drawFactory(ctx, w, h, {
		t: s.t,
		floorY: L.tapeY + tileH(L.size) * 0.45,
		sign: s.sign,
		signColor: s.signColor,
		signX: s.signX
	});
	drawRail(ctx, w, L.tipY + RAIL_Y * L.scale, L.tapeX * 0.5);
	drawTape(ctx, w, {
		cells: s.cells,
		head: s.head,
		x: L.tapeX,
		y: L.tapeY,
		size: L.size,
		flash: s.flash,
		font: s.font
	});
	drawBeam(
		ctx,
		L.robotX,
		L.tipY,
		L.tapeY,
		L.size,
		s.beamColor ?? (s.mood === 'dizzy' ? C.pink : C.sun)
	);
	drawRobot(ctx, {
		x: L.robotX,
		tipY: L.tipY,
		scale: L.scale,
		mood: s.mood,
		t: s.t,
		state: s.state,
		arm: s.arm,
		tilt: s.tilt
	});
	return L;
}
