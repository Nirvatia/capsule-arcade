import { describe, expect, it } from 'vitest';
import { GRID_PORT } from '../../config/mazes/grid_port';
import { validateMaze } from '../../config/mazes/validateMaze';
import { PORT } from '../../config/portConfig';
import { PortService } from './PortService';

const HERO_SPEED = 6;

/** The hero's spawn grace over (the player's own clock only; nothing else moves). */
function graceOver(n: PortService): void {
	for (let i = 0; i < 60; i += 1) {
		n.player.update(0.05);
	}
}

/** Put the hero on the Broker. */
function onBoss(n: PortService): void {
	const t = { x: Math.floor(n.boss.x), y: Math.floor(n.boss.y) };
	n.player.placeAt(t);
}

describe('the Port', () => {
	it('has a maze that passes the game rules, and terminals at junctions', () => {
		expect(validateMaze(GRID_PORT)).toEqual([]);
		const n = new PortService(1);
		expect(new Set(n.terminals.map((t) => `${t.x},${t.y}`)).size).toBe(4);
		for (const t of n.terminals) {
			expect(n.grid.isGhostWalkable(t.x, t.y, false)).toBe(true);
			expect(n.grid.exitsCount(t.x, t.y)).toBeGreaterThanOrEqual(3);
		}
	});

	it('starts the Broker hacking the terminal farthest from the hero, then runs him to the next one', () => {
		const n = new PortService(1);
		n.drones.list.forEach((d) => Object.assign(d, { state: 'wait', timer: Infinity }));
		n.hp = 999;
		const spawn = n.grid.playerSpawn;
		const far = Math.max(
			...n.terminals.map((t) => Math.abs(t.x - spawn.x) + Math.abs(t.y - spawn.y))
		);
		const at = n.terminals[n.boss.target];
		expect(Math.abs(at.x - spawn.x) + Math.abs(at.y - spawn.y)).toBe(far);
		expect(n.boss.state).toBe('hack');
		let hacked = false;
		let travelled = false;
		for (let i = 0; i < 60 * 12 && !(hacked && travelled); i += 1) {
			n.update(1 / 60, null);
			n.player.update(0.05);
			if (n.boss.hacks === 1) {
				hacked = true;
			}
			if (hacked && n.boss.state === 'travel') {
				travelled = true;
			}
		}
		expect(hacked).toBe(true);
		expect(travelled).toBe(true);
	});

	it('wakes one more drone for every terminal hacked, and loses the level when all four are', () => {
		const n = new PortService(2);
		const asleep = (): number =>
			n.drones.list.filter((d) => d.state === 'wait' && d.timer === Infinity).length;
		const before = asleep();
		expect(before).toBe(PORT.drones.count - PORT.drones.active);
		n.hp = 9999;
		let woke = false;
		for (let i = 0; i < 60 * 120 && n.state === 'play'; i += 1) {
			// out of the Broker's way, at the dead end of a yard gate
			n.player.placeAt({ x: 1, y: 13 });
			n.player.grantInvulnerability(1);
			n.update(1 / 60, null);
			if (n.boss.hacks >= 1 && asleep() < before) {
				woke = true;
			}
		}
		expect(woke).toBe(true);
		expect(n.state).toBe('escaped');
	});

	it('is slower than the hero except in a short sprint, and slower still after a power cell', () => {
		const n = new PortService(1);
		for (const v of PORT.boss.speed) {
			expect(v).toBeLessThan(HERO_SPEED);
		}
		expect(PORT.drones.active).toBeLessThanOrEqual(PORT.drones.count);
		n.boss.panic = false;
		const before = n.boss.speed;
		n.cheatCell();
		expect(n.boss.speed).toBeLessThan(before);
		expect(n.drones.fear).toBeGreaterThan(0);
	});

	it('takes a bite: one hit of health, a heal for the hero, a stun, a warp to the farthest terminal, the plan starts again', () => {
		const n = new PortService(3);
		graceOver(n);
		n.hp = 1;
		const hero = n.heroTile;
		onBoss(n);
		n.update(0.016, null);
		expect(n.boss.hp).toBe(PORT.boss.hp - 1);
		expect(n.boss.state).toBe('stunned');
		expect(n.hp).toBe(2);
		expect(n.bonus).toBe(PORT.score.bite);
		for (let i = 0; i < 90; i += 1) {
			n.player.update(0.016);
			n.boss.update(0.016, { hero, shut: () => false });
		}
		expect(n.boss.state).toBe('hack');
		expect(n.boss.hacks).toBe(0);
		expect(n.boss.hacked.every((h) => !h)).toBe(true);
	});

	it('ends the Broker after three bites', () => {
		const n = new PortService(4);
		graceOver(n);
		for (let k = 0; k < PORT.boss.hp; k += 1) {
			n.boss.state = 'hack';
			onBoss(n);
			n.update(0.016, null);
		}
		expect(n.state).toBe('won');
		expect(n.boss.state).toBe('dead');
	});

	it('does not move the Broker through shut doors: with every way shut he stays put', () => {
		const n = new PortService(5);
		n.boss.state = 'travel';
		n.boss.target = (n.boss.target + 1) % 4;
		const start = { x: n.boss.x, y: n.boss.y };
		for (let i = 0; i < 180; i += 1) {
			n.boss.update(1 / 60, { hero: { x: 1, y: 1 }, shut: () => true });
		}
		expect(Math.hypot(n.boss.x - start.x, n.boss.y - start.y)).toBeLessThan(1);
	});

	it('charges the dash with nuts and spends a charge on a dash', () => {
		const n = new PortService(6);
		graceOver(n);
		expect(n.dash()).toBe(false);
		let taken = 0;
		for (let y = 0; y < n.grid.height && taken < PORT.dash.nuts; y += 1) {
			for (let x = 0; x < n.grid.width && taken < PORT.dash.nuts; x += 1) {
				if (n.grid.isDot(x, y)) {
					n.progress.collectAt(x, y);
					taken += 1;
				}
			}
		}
		n.update(0.016, 'LEFT');
		n.update(0.1, 'LEFT');
		expect(n.dashCharges).toBe(1);
		expect(n.dash()).toBe(true);
		expect(n.dashCharges).toBe(0);
		expect(n.player.isDashing).toBe(true);
	});

	it('takes a hit from a drone with grace after it, and three hits end the level', () => {
		const n = new PortService(7);
		graceOver(n);
		n.boss.state = 'stunned';
		(n.boss as unknown as { stun: number }).stun = 99;
		for (let k = 0; k < PORT.hp; k += 1) {
			graceOver(n);
			const d = n.drones.list[0];
			const t = n.heroTile;
			Object.assign(d, {
				state: 'hunt',
				fx: t.x,
				fy: t.y,
				tx: t.x,
				ty: t.y,
				p: 0,
				x: n.player.position.x,
				y: n.player.position.y
			});
			n.update(0.016, null);
		}
		expect(n.state).toBe('dead');
	});
});
