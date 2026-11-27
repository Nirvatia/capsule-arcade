import { describe, expect, it } from 'vitest';
import { NET } from '../../config/netConfig';
import { NetDoors } from './NetDoors';
import { NetService } from './NetService';

/** The hero's spawn grace over (the player's own clock only; nothing else moves). */
function graceOver(n: NetService): void {
	for (let i = 0; i < 60; i += 1) {
		n.player.update(0.05);
	}
}

/** A drone on the hero, in `state`. */
function onHero(
	n: NetService,
	d: NetService['drones']['list'][number],
	state: 'hunt' | 'fright'
): void {
	const t = n.heroTile;
	Object.assign(d, {
		state,
		fx: t.x,
		fy: t.y,
		tx: t.x,
		ty: t.y,
		p: 0,
		x: n.player.position.x,
		y: n.player.position.y
	});
}

describe('the Net', () => {
	it('puts the doors on straight corridor edges, away from the spawn', () => {
		const n = new NetService(1);
		expect(n.doors.list.length).toBeGreaterThan(0);
		const spawn = n.grid.playerSpawn;
		for (const d of n.doors.list) {
			for (const p of [d.a, d.b]) {
				expect(n.grid.isGhostWalkable(p.x, p.y, false)).toBe(true);
				expect(n.grid.exitsCount(p.x, p.y)).toBe(2);
			}
			expect(Math.abs(d.a.x - d.b.x) + Math.abs(d.a.y - d.b.y)).toBe(1);
			expect(Math.abs(d.a.x - spawn.x) + Math.abs(d.a.y - spawn.y)).toBeGreaterThanOrEqual(
				NET.doors.clear
			);
		}
	});

	it('slams a door shut behind the hero for a while, both ways, then opens it again', () => {
		const n = new NetService(1);
		const d = n.doors.list[0];
		expect(n.doors.blocks(d.a.x, d.a.y, d.b.x, d.b.y)).toBe(false);
		n.doors.passed(d.a, d.b);
		expect(n.doors.blocks(d.a.x, d.a.y, d.b.x, d.b.y)).toBe(true);
		expect(n.doors.blocks(d.b.x, d.b.y, d.a.x, d.a.y)).toBe(true);
		n.doors.update(NET.doors.hold + 0.1);
		expect(n.doors.blocks(d.a.x, d.a.y, d.b.x, d.b.y)).toBe(false);
	});

	it('ignores a pass that is not on a door', () => {
		const doors = new NetDoors(new NetService(1).grid);
		expect(doors.passed({ x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
	});

	it('keeps the drones in the corridors and off a shut door', () => {
		const n = new NetService(3);
		const d = n.doors.list[0];
		n.doors.passed(d.a, d.b);
		const crossed: string[] = [];
		const seen = new Set<string>();
		for (let i = 0; i < 60 * 6; i += 1) {
			n.doors.passed(d.a, d.b);
			n.update(1 / 60, null);
			n.player.grantInvulnerability(1);
			for (const q of n.drones.list) {
				if (q.state === 'wait' || q.state === 'dead') {
					continue;
				}
				expect(n.grid.isGhostWalkable(Math.floor(q.x), Math.floor(q.y), false)).toBe(true);
				const key = `${q.fx},${q.fy}>${q.tx},${q.ty}`;
				if (!seen.has(key)) {
					seen.add(key);
					const edge =
						(q.fx === d.a.x && q.fy === d.a.y && q.tx === d.b.x && q.ty === d.b.y) ||
						(q.fx === d.b.x && q.fy === d.b.y && q.tx === d.a.x && q.ty === d.a.y);
					if (edge) {
						crossed.push(key);
					}
				}
			}
		}
		expect(crossed).toEqual([]);
	});

	it('releases the drones one by one and lets them hunt', () => {
		const n = new NetService(2);
		expect(n.drones.list.map((d) => d.state)).toEqual(['hunt', 'wait', 'wait', 'wait']);
		for (let i = 0; i < 60 * 11; i += 1) {
			n.update(1 / 60, null);
			n.player.grantInvulnerability(1);
		}
		expect(n.drones.list.every((d) => d.state === 'hunt')).toBe(true);
	});

	it('takes a hit from a drone with grace after it, three hits end the level', () => {
		const n = new NetService(4);
		const d = n.drones.list[0];
		graceOver(n);
		onHero(n, d, 'hunt');
		n.update(0.016, null);
		expect(n.hp).toBe(NET.hp - 1);
		onHero(n, d, 'hunt');
		n.update(0.016, null);
		expect(n.hp).toBe(NET.hp - 1);
		for (let i = 0; i < 2; i += 1) {
			graceOver(n);
			onHero(n, d, 'hunt');
			n.update(0.016, null);
		}
		expect(n.state).toBe('dead');
	});

	it('lets the hero eat hacked drones for a rising chain', () => {
		const n = new NetService(5);
		n.cheatHack();
		const [a, b] = n.drones.list;
		for (const d of [a, b]) {
			onHero(n, d, 'fright');
			n.update(0.016, null);
		}
		expect(a.state).toBe('dead');
		expect(b.state).toBe('dead');
		expect(n.bonus).toBe(NET.hack.eat + NET.hack.eat * 2);
		expect(n.hp).toBe(NET.hp);
	});

	it('speeds the drones up on the last data, opens the core at the end and ends the level there', () => {
		const n = new NetService(6);
		expect(n.surge).toBe(1);
		n.cheatNearlyDone(NET.surge.first);
		expect(n.surge).toBe(NET.surge.firstMul);
		n.cheatNearlyDone(NET.surge.second);
		expect(n.surge).toBe(NET.surge.secondMul);
		n.cheatNearlyDone(0);
		n.update(0.016, null);
		expect(n.coreOpen).toBe(true);
		n.player.placeAt(n.map.monolith);
		n.update(0.016, null);
		expect(n.state).toBe('won');
	});
});
