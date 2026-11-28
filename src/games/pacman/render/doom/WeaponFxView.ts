import type { DoomFxEvent } from '../../logic/doom/DoomWeaponService';
import type { GridLayout } from '../maze/GridView';
import { pickupSprite } from './DoomSprites';
import { formFlash, ghostEaten, hitChips } from './bossArt';
import type { Ctx, Dir } from './fleshPaint';
import {
	mawFull,
	mawGlance,
	rushHit,
	spent,
	stingHitBoss,
	stingHitWall,
	stingKillImp
} from './weaponArt';

type Kind =
	| 'sting-boss'
	| 'sting-wall'
	| 'sting-imp'
	| 'rush'
	| 'counter'
	| 'glance'
	| 'full'
	| 'spent'
	| 'chips'
	| 'eaten'
	| 'form';

interface Effect {
	readonly kind: Kind;
	readonly x: number;
	readonly y: number;
	readonly dir: Dir;
	readonly item: 'berserk' | 'plasma' | 'bfg';
	readonly duration: number;
	/** The chips' strength (1..3) or the eaten ghost's points. */
	readonly value: number;
	age: number;
}

/** How hard a hit on the boss lands: its flesh chips (and his recoil) grow with it. */
export function hitStrength(event: DoomFxEvent): number {
	switch (event.kind) {
		case 'sting-hit':
			return event.detail === 'boss' ? 1 : 0;
		case 'rush-hit':
			return 2;
		case 'maw-hit':
			return event.detail === 'full' ? 3 : 2;
		default:
			return 0;
	}
}

const DURATION: Record<Kind, number> = {
	'sting-boss': 0.35,
	'sting-wall': 0.5,
	'sting-imp': 0.45,
	rush: 0.4,
	counter: 0.5,
	glance: 0.45,
	full: 0.6,
	spent: 0.7,
	chips: 0.5,
	eaten: 0.9,
	form: 0.45
};
/** Bolts land ten a second: one splash on the boss at a time is enough. */
const MAX_STING = 6;

const dirOf = (dx = 0, dy = 0): Dir =>
	Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'LEFT' : 'RIGHT') : dy < 0 ? 'UP' : 'DOWN';

/**
 * The hell's painted effects (`weaponArt`, `bossArt`): the Sting's hits, the rush's and the Maw's
 * hits on the boss with flesh chips by strength, a weapon spent (tossed away behind him), a split
 * ghost eaten, his forming on the core. Each plays once.
 */
export class WeaponFxView {
	private readonly list: Effect[] = [];

	spawn(event: DoomFxEvent): void {
		const kind = this.kindOf(event);
		if (!kind) {
			return;
		}
		if (
			kind.startsWith('sting') &&
			this.list.filter((e) => e.kind.startsWith('sting')).length >= MAX_STING
		) {
			return;
		}
		const item = event.detail === 'berserk' || event.detail === 'bfg' ? event.detail : 'plasma';
		const strength = hitStrength(event);
		if (strength > 0 && this.list.filter((e) => e.kind === 'chips').length < MAX_STING) {
			this.list.push({
				kind: 'chips',
				x: event.x,
				y: event.y,
				dir: 'RIGHT',
				item,
				duration: DURATION.chips,
				value: strength,
				age: 0
			});
		}
		this.list.push({
			kind,
			x: event.x,
			y: event.y,
			dir: dirOf(event.dx, event.dy),
			item,
			duration: DURATION[kind],
			value: kind === 'eaten' ? Number(event.detail) || 0 : 0,
			age: 0
		});
	}

	update(dt: number): void {
		for (let i = this.list.length - 1; i >= 0; i -= 1) {
			const e = this.list[i];
			e.age += dt;
			if (e.age >= e.duration) {
				this.list.splice(i, 1);
			}
		}
	}

	reset(): void {
		this.list.length = 0;
	}

	draw(ctx: Ctx, layout: GridLayout): void {
		const S = layout.tileSize;
		for (const e of this.list) {
			const f = e.age / e.duration;
			const x = layout.offsetX + e.x * S;
			const y = layout.offsetY + e.y * S;
			switch (e.kind) {
				case 'sting-boss':
					stingHitBoss(ctx, x, y, S, f);
					break;
				case 'sting-wall':
					stingHitWall(ctx, x, y, S, f);
					break;
				case 'sting-imp':
					stingKillImp(ctx, x, y, S * 0.8, f);
					break;
				case 'rush':
				case 'counter':
					rushHit(ctx, x, y, S, f, e.kind === 'counter');
					break;
				case 'glance':
					mawGlance(ctx, x, y, S, f);
					break;
				case 'full':
					mawFull(ctx, x, y, S, f);
					break;
				case 'spent': {
					const icon = pickupSprite(e.item).icon;
					spent(ctx, x, y, S, e.dir, f, (c) => c.drawImage(icon, -50, -50, 100, 100));
					break;
				}
				case 'chips':
					hitChips(ctx, x, y, S, f, e.value);
					break;
				case 'eaten':
					ghostEaten(ctx, x, y, S, f, e.value);
					break;
				case 'form':
					formFlash(ctx, x, y, S, f);
					break;
			}
		}
	}

	private kindOf(event: DoomFxEvent): Kind | null {
		switch (event.kind) {
			case 'sting-hit':
				return event.detail === 'wall'
					? 'sting-wall'
					: event.detail === 'imp'
						? 'sting-imp'
						: 'sting-boss';
			case 'rush-hit':
				return event.detail === 'counter' ? 'counter' : 'rush';
			case 'maw-hit':
				return event.detail === 'full' ? 'full' : 'glance';
			case 'spent':
				return 'spent';
			case 'ghost-eaten':
				return 'eaten';
			case 'split-form':
				return 'form';
			default:
				return null;
		}
	}
}
